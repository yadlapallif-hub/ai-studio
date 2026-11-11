import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const SettingUpdateSchema = z.object({
  key: z.enum(["branding", "website_content", "footer_content", "ai_config", "security_config"]),
  value: z.record(z.unknown()),
});

export async function PATCH(request: Request) {
  const parsed = SettingUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid setting payload" }, { status: 400 });
  }

  const { key, value } = parsed.data;
  const criticalKeys = new Set(["ai_config", "security_config"]);
  const admin = await getAdminContext(
    criticalKeys.has(key) ? ["super_admin"] : ["super_admin", "admin", "content_manager"]
  );

  if (!admin) {
    return NextResponse.json(
      {
        error: criticalKeys.has(key)
          ? "Only Super Admin can change AI or Security configuration."
          : "Unauthorized",
      },
      { status: 403 }
    );
  }

  const service = createServiceSupabase();
  const { error } = await service.from("fcs_platform_settings").upsert(
    {
      key,
      value,
      updated_by: admin.userId,
    },
    { onConflict: "key" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAdminAudit({
    actorId: admin.userId,
    action: `admin.setting.${key}.updated`,
    targetType: "platform_setting",
    targetId: key,
  });

  return NextResponse.json({ ok: true });
}
