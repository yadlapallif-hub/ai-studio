import { createServiceSupabase } from "@/lib/supabase/server";

export type NotificationPrefKey =
  | "project_saved"
  | "document_exported"
  | "certificate_generated"
  | "ai_task_completed"
  | "support_ticket_updated"
  | "organization_approved";

export async function createWorkspaceNotification(opts: {
  userId: string;
  prefKey?: NotificationPrefKey;
  title: string;
  message: string;
  link?: string | null;
}) {
  try {
    const adminDb = createServiceSupabase();
    if (opts.prefKey) {
      const { data: pref } = await adminDb
        .from("fcs_notification_preferences")
        .select("*")
        .eq("user_id", opts.userId)
        .maybeSingle();

      if (pref) {
        if (pref.in_app_enabled === false) return;
        const val = (pref as Record<string, unknown>)[opts.prefKey];
        if (val === false) return;
      }
    }

    await adminDb.from("fcs_notifications").insert({
      user_id: opts.userId,
      audience: "customer",
      title: opts.title,
      message: opts.message,
      link: opts.link ?? null,
      is_read: false,
    });
  } catch {
    // Non-blocking notification failure should never break primary workflow
  }
}

export async function logWorkspaceActivity(opts: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const adminDb = createServiceSupabase();
    await adminDb.from("fcs_activity_logs").insert({
      actor_id: opts.actorId,
      actor_role: "customer",
      action: opts.action,
      entity_type: opts.entityType,
      entity_id: opts.entityId ?? null,
      details: opts.details ?? {},
    });
  } catch {
    // Non-blocking audit trail
  }
}
