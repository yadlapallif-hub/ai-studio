import { NextRequest, NextResponse } from "next/server";
import { notificationPreferencesSchema } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";

const DEFAULTS = {
  project_saved: true,
  document_exported: true,
  certificate_generated: true,
  ai_task_completed: true,
  support_ticket_updated: true,
  organization_approved: true,
  in_app_enabled: true,
  email_digest: false,
};

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data } = await supabase
    .from("fcs_notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ preferences: { ...DEFAULTS, ...(data ?? {}) } });
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = notificationPreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification preferences" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fcs_notification_preferences")
    .upsert({
      user_id: user.id,
      ...parsed.data,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ preferences: { ...DEFAULTS, ...data } });
}
