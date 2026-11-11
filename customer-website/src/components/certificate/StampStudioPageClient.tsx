"use client";

import React, { useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { type OrganizationStampRecord } from "@francis/shared";
import { Award, Clock, Lock, ShieldAlert, ShieldCheck, Stamp } from "lucide-react";
import { SlideReveal } from "@/components/motion/SlideReveal";
import { OrganizationStampStudio } from "./OrganizationStampStudio";

interface ApplicationItem {
  id: string;
  organization_name: string;
  contact_email: string;
  verification_status: string;
  notes: string | null;
}

interface Props {
  isAuthenticated: boolean;
  applications: ApplicationItem[];
  approvedIssuers: Array<{ id: string; organization_name: string }>;
  initialStamps: OrganizationStampRecord[];
}

export function StampStudioPageClient({
  isAuthenticated,
  applications,
  approvedIssuers,
  initialStamps,
}: Props) {
  const [savedStamps, setSavedStamps] = useState<OrganizationStampRecord[]>(initialStamps);
  const [selectedIssuerId, setSelectedIssuerId] = useState(approvedIssuers[0]?.id || "");

  const pendingApps = applications.filter((a) => a.verification_status === "pending");
  const blockedApps = applications.filter(
    (a) => a.verification_status !== "approved" && a.verification_status !== "pending"
  );

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <SlideReveal direction="up">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white">
            <Stamp className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Authorized Organization Stamp Studio
          </h1>
          <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
            Sign in with your approved organization account to create official ink stamps, embossed
            gold seals, authorized signatures, and reusable emblem stamps.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <SafeNavLink
              href="/auth/login?next=/stamps"
              className="rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Sign In to Open Stamps
            </SafeNavLink>
            <SafeNavLink
              href="/verify"
              className="rounded-xl border border-[var(--fcs-border)] px-6 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              Apply as Organization
            </SafeNavLink>
          </div>
        </SlideReveal>
      </div>
    );
  }

  if (approvedIssuers.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-14 sm:px-6">
        <SlideReveal direction="up">
          <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {pendingApps.length > 0 ? <Clock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              {pendingApps.length > 0
                ? "Organization Stamp Access Pending Admin Approval"
                : "Admin-Approved Authorized Organization Required"}
            </h1>
            <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
              {pendingApps.length > 0 ? (
                <>
                  Your request for{" "}
                  <strong>{pendingApps.map((p) => p.organization_name).join(", ")}</strong> is
                  currently waiting for Administrator approval. Certificate creation, official stamp
                  design, seal uploads, and Verified QR issuance unlock automatically for your
                  account once approved.
                </>
              ) : blockedApps.length > 0 ? (
                <>
                  Your organization ({blockedApps[0].organization_name}) is currently{" "}
                  <strong className="uppercase">{blockedApps[0].verification_status}</strong>. Only
                  Admin-approved organizations can create stamps or issue certificates.
                </>
              ) : (
                <>
                  Only Authorized Organizations approved by an Administrator can create official
                  organizational stamps, gold seals, or certificates. Submit an application at the
                  verification portal.
                </>
              )}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <SafeNavLink
                href="/verify"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <ShieldCheck className="h-4 w-4" />
                {pendingApps.length > 0
                  ? "View Application Status"
                  : "Apply as Authorized Organization"}
              </SafeNavLink>
              <SafeNavLink
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-5 py-2.5 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
              >
                Back to Dashboard
              </SafeNavLink>
            </div>

            {blockedApps.length > 0 && blockedApps[0].notes && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Admin Note: {blockedApps[0].notes}</span>
              </div>
            )}
          </div>
        </SlideReveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SlideReveal direction="clip">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Authorized Organization Tools
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Organization Stamp & Seal Studio
            </h1>
            <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
              Create custom vector stamps, embossed gold seals, drawn signatures, and transparent logo
              stamps for your Admin-approved organization.
            </p>
          </div>

          <SafeNavLink
            href={`/certificate-builder/new?tab=stamps${
              selectedIssuerId ? `&issuer=${encodeURIComponent(selectedIssuerId)}` : ""
            }`}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Award className="h-4 w-4" /> Open Certificate Studio with Stamps
          </SafeNavLink>
        </div>
      </SlideReveal>

      <SlideReveal direction="up" delay={100}>
        <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
          <OrganizationStampStudio
            mode="standalone"
            approvedIssuers={approvedIssuers}
            selectedIssuerId={selectedIssuerId}
            onSelectIssuerId={setSelectedIssuerId}
            savedStamps={savedStamps}
            onSavedStampsChange={setSavedStamps}
          />
        </div>
      </SlideReveal>
    </div>
  );
}
