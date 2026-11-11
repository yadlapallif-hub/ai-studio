import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { SecurityClient } from "@/components/SecurityClient";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/login");

  const service = createServiceSupabase();
  const { data } = await service
    .from("fcs_platform_settings")
    .select("value")
    .eq("key", "security_config")
    .maybeSingle();

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security & Two-Factor Auth</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Configure administrator TOTP MFA and critical platform security thresholds.
          </p>
        </div>
        <SecurityClient
          isSuperAdmin={admin.isSuperAdmin}
          initialSecuritySetting={(data?.value as object) || {}}
        />
      </div>
    </AdminShell>
  );
}
