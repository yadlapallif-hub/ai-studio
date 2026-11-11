import { NextResponse } from "next/server";
import { z } from "zod";
import { LOWER_STAFF_ROLES, STAFF_ROLES, type AppRole } from "@francis/shared";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const CreateTaskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(160),
  description: z.string().trim().max(2000).optional(),
  assignedTo: z.string().uuid("Select a valid staff member."),
  targetRole: z
    .enum(["super_admin", "admin", "support_agent", "content_manager"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().max(40).nullable().optional(),
});

const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  completionNote: z.string().trim().max(1500).optional(),
});

export async function GET() {
  const admin = await getAdminContext(STAFF_ROLES);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const service = createServiceSupabase();
  let query = service
    .from("fcs_staff_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(250);

  if (!admin.isSuperAdmin && !admin.isAdmin) {
    query = query.eq("assigned_to", admin.userId);
  }

  const { data: tasks, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) {
    return NextResponse.json(
      { error: "Only Super Admins and Admins can assign staff tasks." },
      { status: 403 }
    );
  }

  const parsed = CreateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid task payload." },
      { status: 400 }
    );
  }

  const service = createServiceSupabase();
  const { title, description, assignedTo, targetRole, priority, dueDate } = parsed.data;

  const { data: assigneeRoleRows } = await service
    .from("fcs_user_roles")
    .select("role")
    .eq("user_id", assignedTo);
  const assigneeRoles = (assigneeRoleRows ?? []).map((r) => r.role as AppRole);

  const assigneeStaffRoles = assigneeRoles.filter((r) => STAFF_ROLES.includes(r));
  if (assigneeStaffRoles.length === 0) {
    return NextResponse.json(
      {
        error:
          "Selected user is a Customer without a staff role. Assign a lower-level staff role first in Users & Roles.",
      },
      { status: 400 }
    );
  }

  if (!admin.isSuperAdmin) {
    const hasLowerStaffRole = assigneeStaffRoles.some((r) => LOWER_STAFF_ROLES.includes(r));
    const hasPeerOrHigherRole =
      assigneeStaffRoles.includes("super_admin") || assigneeStaffRoles.includes("admin");
    if (!hasLowerStaffRole || hasPeerOrHigherRole) {
      return NextResponse.json(
        {
          error:
            "Admins can only assign tasks to lower-level staff (Super Agent Customer Support or Content Manager).",
        },
        { status: 403 }
      );
    }
  }

  const resolvedTargetRole =
    targetRole && assigneeStaffRoles.includes(targetRole)
      ? targetRole
      : assigneeStaffRoles[0];

  const { data: created, error } = await service
    .from("fcs_staff_tasks")
    .insert({
      title,
      description: description || "",
      assigned_to: assignedTo,
      assigned_by: admin.userId,
      target_role: resolvedTargetRole,
      priority,
      status: "todo",
      due_date: dueDate || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAdminAudit({
    actorId: admin.userId,
    actorRole: admin.isSuperAdmin ? "super_admin" : "admin",
    action: "admin.task.assigned",
    targetType: "staff_task",
    targetId: created.id,
    metadata: { assignedTo, targetRole: resolvedTargetRole, priority, title },
  });

  return NextResponse.json({ task: created });
}

export async function PATCH(request: Request) {
  const admin = await getAdminContext(STAFF_ROLES);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = UpdateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid update payload." },
      { status: 400 }
    );
  }

  const service = createServiceSupabase();
  const { data: existing, error: fetchErr } = await service
    .from("fcs_staff_tasks")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const isAssignee = existing.assigned_to === admin.userId;
  if (!admin.isSuperAdmin && !admin.isAdmin && !isAssignee) {
    return NextResponse.json(
      { error: "You can only update tasks assigned to your own account." },
      { status: 403 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    patch.completed_at = parsed.data.status === "done" ? new Date().toISOString() : null;
  }
  if (parsed.data.completionNote !== undefined) {
    patch.completion_note = parsed.data.completionNote;
  }
  if (parsed.data.priority !== undefined && (admin.isSuperAdmin || admin.isAdmin)) {
    patch.priority = parsed.data.priority;
  }

  const { data: updated, error: updateErr } = await service
    .from("fcs_staff_tasks")
    .update(patch)
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await recordAdminAudit({
    actorId: admin.userId,
    actorRole: admin.roles[0] || "staff",
    action: "admin.task.updated",
    targetType: "staff_task",
    targetId: parsed.data.id,
    metadata: patch,
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "Missing task id." }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { data: existing } = await service
    .from("fcs_staff_tasks")
    .select("id, assigned_by, target_role")
    .eq("id", body.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (
    !admin.isSuperAdmin &&
    existing.assigned_by !== admin.userId &&
    !LOWER_STAFF_ROLES.includes(existing.target_role as AppRole)
  ) {
    return NextResponse.json(
      { error: "Admins can only remove tasks for lower-level staff or tasks they created." },
      { status: 403 }
    );
  }

  const { error } = await service.from("fcs_staff_tasks").delete().eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
