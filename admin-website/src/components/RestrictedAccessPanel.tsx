import React from "react";
import { ShieldAlert } from "lucide-react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";

export function RestrictedAccessPanel({
  sectionTitle,
  allowedHint,
}: {
  sectionTitle: string;
  allowedHint: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-8 text-center">
      <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" />
      <h1 className="mt-3 text-lg font-bold">{sectionTitle} — Restricted</h1>
      <p className="mt-2 text-xs leading-relaxed text-[var(--adm-ink-muted)]">
        This admin section is limited to {allowedHint}. Your current staff role does not include
        access here.
      </p>
      <SafeNavLink
        href="/"
        className="mt-5 inline-flex items-center rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
      >
        Return to Overview
      </SafeNavLink>
    </div>
  );
}
