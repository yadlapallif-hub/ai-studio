"use client";

import React from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { Award, Clock, Lock, ShieldAlert, ShieldCheck, Stamp } from "lucide-react";
import { SlideReveal } from "@/components/motion/SlideReveal";

interface ApplicationSummary {
  id: string;
  organization_name: string;
  contact_email: string;
  verification_status: string;
  notes: string | null;
}

export function CertificateAccessGate({
  isAuthenticated,
  applications,
}: {
  isAuthenticated: boolean;
  applications: ApplicationSummary[];
}) {
  const pendingApps = applications.filter((a) => a.verification_status === "pending");
  const blockedApps = applications.filter(
    (a) => a.verification_status !== "approved" && a.verification_status !== "pending"
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <SlideReveal direction="up">
        <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8 shadow-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {!isAuthenticated ? (
              <Lock className="h-6 w-6" />
            ) : pendingApps.length > 0 ? (
              <Clock className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6" />
            )}
          </div>

          <p className="mt-4 text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-amber-400">
            Authorized Access Required
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {!isAuthenticated
              ? "Certificate Creation is Available Only for Authorized Users"
              : pendingApps.length > 0
                ? "Certificate Creation Pending Admin Approval"
                : blockedApps.length > 0
                  ? "Organization Authorization Inactive"
                  : "Authorized Organization Approval Required to Create Certificates"}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[var(--fcs-ink-muted)]">
            {!isAuthenticated ? (
              <>
                Certificate creation, official organizational stamps, and QR verification are
                restricted exclusively to Administrator-approved Authorized Organizations. Sign in
                with your authorized account or submit an organization access request.
              </>
            ) : pendingApps.length > 0 ? (
              <>
                Your request for{" "}
                <strong className="text-[var(--fcs-ink)]">
                  {pendingApps.map((p) => p.organization_name).join(", ")}
                </strong>{" "}
                is awaiting Administrator approval. As soon as your organization is approved, full
                Certificate Studio creation and Stamp Studio tools unlock automatically for your
                account.
              </>
            ) : blockedApps.length > 0 ? (
              <>
                Your organization{" "}
                <strong className="text-[var(--fcs-ink)]">
                  {blockedApps[0].organization_name}
                </strong>{" "}
                currently has status{" "}
                <strong className="uppercase">{blockedApps[0].verification_status}</strong>. Only
                active Admin-approved Authorized Organizations can create or issue certificates.
              </>
            ) : (
              <>
                Certificate creation is restricted exclusively to authorized users approved by an
                Administrator. Apply with your organization name and account email to unlock
                Certificate Studio, custom stamp creation, and QR-verifiable issuance.
              </>
            )}
          </p>

          {blockedApps.length > 0 && blockedApps[0].notes && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Admin Note: {blockedApps[0].notes}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!isAuthenticated ? (
              <>
                <SafeNavLink
                  href="/auth/login?next=/certificate-builder/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <ShieldCheck className="h-4 w-4" /> Sign In with Authorized Account
                </SafeNavLink>
                <SafeNavLink
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-5 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
                >
                  Apply as Authorized Organization
                </SafeNavLink>
              </>
            ) : (
              <>
                <SafeNavLink
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {pendingApps.length > 0
                    ? "Check Approval Status"
                    : "Apply for Authorized Organization Access"}
                </SafeNavLink>
                <SafeNavLink
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-5 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
                >
                  Back to Dashboard
                </SafeNavLink>
              </>
            )}
          </div>

          <div className="mt-7 grid gap-3 border-t border-[var(--fcs-border)] pt-6 text-xs text-[var(--fcs-ink-muted)] sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3.5">
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-[var(--fcs-ink)]">Resume Studio Remains Open</p>
                <p className="mt-0.5">
                  Anyone can create, analyze, and export ATS resumes for free.{" "}
                  <SafeNavLink href="/resume-builder" className="font-semibold text-teal-700 underline">
                    Open Resume Studio →
                  </SafeNavLink>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3.5">
              <Stamp className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              <div>
                <p className="font-bold text-[var(--fcs-ink)]">Public Verification Open</p>
                <p className="mt-0.5">
                  Recipients and employers can verify any certificate ID or QR code without signing
                  in at{" "}
                  <SafeNavLink href="/verify" className="font-semibold text-teal-700 underline">
                    /verify
                  </SafeNavLink>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </SlideReveal>
    </div>
  );
}
