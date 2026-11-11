import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const TicketActionSchema = z.object({
  ticketId: z.string().uuid(),
  status: z
    .enum(["open", "in_progress", "waiting_for_customer", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignToMe: z.boolean().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  replyBody: z.string().max(8000).optional(),
  isInternalNote: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "support_agent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = TicketActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { ticketId, status, priority, assignToMe, assignedTo, replyBody, isInternalNote } =
    parsed.data;
  const service = createServiceSupabase();

  const { data: ticket } = await service
    .from("fcs_support_tickets")
    .select("id, user_id, ticket_number, subject")
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const updatePatch: Record<string, unknown> = {};
  if (status) {
    updatePatch.status = status;
    if (status === "resolved") updatePatch.resolved_at = new Date().toISOString();
  }
  if (priority) updatePatch.priority = priority;
  if (assignToMe) {
    updatePatch.assigned_to = admin.userId;
  } else if (assignedTo !== undefined) {
    updatePatch.assigned_to = assignedTo;
  }

  if (Object.keys(updatePatch).length > 0) {
    await service.from("fcs_support_tickets").update(updatePatch).eq("id", ticketId);
  }

  if (replyBody && replyBody.trim().length > 0) {
    await service.from("fcs_support_messages").insert({
      ticket_id: ticketId,
      sender_id: admin.userId,
      sender_role: "agent",
      body: replyBody.trim(),
      is_internal_note: Boolean(isInternalNote),
    });
  }

  await recordAdminAudit({
    actorId: admin.userId,
    actorRole: admin.roles.find((r) => r !== "customer") || "support_agent",
    action: "admin.support.updated",
    targetType: "support_ticket",
    targetId: ticketId,
    metadata: {
      status,
      priority,
      assignedTo: assignToMe ? admin.userId : assignedTo,
      hasReply: Boolean(replyBody),
      isInternalNote: Boolean(isInternalNote),
    },
  });

  return NextResponse.json({ ok: true });
}
