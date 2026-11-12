import React from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { ExternalLink, Lock, ShieldCheck } from "lucide-react";
import { getAuthenticatedContext } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPortalEntryPage() {
  const { supabase, user } = await getAuthenticatedContext();
  let isStaff = false;

  if (user) {
    const { data: roleRows } = await supabase
      .from("fcs_user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    isStaff = roles.some((role) =>
      ["super_admin", "admin", "support_agent", "moderator", "analyst"].includes(role)
    );
  }

  const adminPortalUrl =
    process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "https://francis-creator-studio-admin.vercel.app";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-teal-700">
          {isStaff ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">CREATOR STUDIO Admin Console</h1>
        <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
          Platform governance, organization verification approvals, reported certificate
          moderation, official stamp approvals, and template management live in our dedicated Admin
          Console.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={adminPortalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Open Admin Console <ExternalLink className="h-4 w-4" />
          </a>
          <SafeNavLink
            href="/dashboard"
            className="rounded-xl border border-[var(--fcs-border)] px-5 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            Back to Workspace
          </SafeNavLink>
        </div>

        {!isStaff && (
          <p className="mt-5 text-xs text-[var(--fcs-ink-muted)]">
            Note: Admin Console sign-in is strictly restricted to verified staff &amp; Super Admin
            accounts.
          </p>
        )}
      </div>
    </div>
  );
}
