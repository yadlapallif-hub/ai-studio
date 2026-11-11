import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { VerificationsClient } from "@/components/VerificationsClient";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) redirect("/login");

  const service = createServiceSupabase();
  const [{ data: issuers }, { data: certs }] = await Promise.all([
    service
      .from("fcs_authorized_issuers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    service
      .from("fcs_certificate_verifications")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Certificate Verification & Authorized Issuers
          </h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Approve verified organizational issuers and review submitted credentials without
            impersonating external institutions.
          </p>
        </div>
        <VerificationsClient initialIssuers={issuers ?? []} initialCerts={certs ?? []} />
      </div>
    </AdminShell>
  );
}
