import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";
import {
  TutorialsAdminClient,
  type AdminTutorialRow,
} from "@/components/TutorialsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminTutorialsPage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="Tutorial Videos Management"
            allowedHint="Super Admin, Admin, and Content Manager roles"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();
  const { data } = await service
    .from("fcs_tutorials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("episode_number", { ascending: true });

  const customerSiteUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL || "https://francis-creator-studio.vercel.app";

  return (
    <AdminShell
      adminName={admin.fullName}
      adminEmail={admin.email}
      roles={admin.roles}
    >
      <TutorialsAdminClient
        initialTutorials={(data ?? []) as AdminTutorialRow[]}
        customerSiteUrl={customerSiteUrl}
      />
    </AdminShell>
  );
}
