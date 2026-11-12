import React from "react";
import type { Metadata } from "next";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReportCertificateButton } from "@/components/certificate/ReportCertificateButton";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}): Promise<Metadata> {
  const { certificateId } = await params;
  const code = decodeURIComponent(certificateId).trim().toUpperCase();
  return buildPageMetadata({
    title: `Certificate Verification: ${code}`,
    description: `Live public authenticity verification check for Francis Creator Studio certificate ${code}.`,
    path: `/verify/${encodeURIComponent(code)}`,
    noIndex: true,
  });
}

export default async function VerifyResultPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const code = decodeURIComponent(certificateId).trim().toUpperCase();
  const supabase = await createClient();

  const { data } = await supabase.rpc("fcs_lookup_certificate_verification", {
    p_code: code,
  });

  const record =
    data && typeof data === "object" && (data as { found?: boolean }).found
      ? (data as {
          certificate_code: string;
          recipient_name: string;
          certificate_title: string;
          course_or_achievement: string;
          issuing_organization: string;
          issue_date: string;
          expiry_date: string | null;
          verification_status: string;
          revocation_reason: string | null;
          public_notes: string | null;
          issuer_approved: boolean;
          issuer_website: string | null;
        })
      : null;

  if (!record) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-red-500/30 bg-[var(--fcs-surface)] p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-600" />
          <h1 className="mt-4 text-2xl font-bold">Certificate Record Not Found</h1>
          <p className="mt-2 font-mono text-sm text-[var(--fcs-ink-muted)]">{code}</p>
          <p className="mt-3 text-sm text-[var(--fcs-ink-muted)]">
            No certificate with this ID exists in the CREATOR STUDIO verification
            registry. Check the code or contact the issuing organization.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <SafeNavLink
              href="/verify"
              className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Search Another ID
            </SafeNavLink>
            <ReportCertificateButton certificateCode={code} />
          </div>
        </div>
      </div>
    );
  }

  const status = String(record.verification_status);
  const statusBanner =
    status === "verified"
      ? {
          icon: CheckCircle2,
          color: "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
          label: "Verified Certificate — Officially Verified Credential",
          note: "This certificate is published and verified against an approved Authorized Issuer in CREATOR STUDIO.",
        }
      : status === "pending_approval"
        ? {
            icon: Clock,
            color: "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
            label: "Pending Official Verification",
            note: "This credential has been submitted for issuer verification and is awaiting review.",
          }
        : status === "revoked" || status === "expired"
          ? {
              icon: ShieldAlert,
              color: "border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200",
              label: status === "revoked" ? "Credential Revoked" : "Credential Expired",
              note:
                record.revocation_reason ||
                record.public_notes ||
                "This certificate is no longer valid.",
            }
          : {
              icon: AlertTriangle,
              color: "border-slate-400/40 bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-200",
              label: "Unverified Draft (Not Yet Published)",
              note: "Saved in CREATOR STUDIO as a draft. Click 'Publish Verified Certificate' in Certificate Studio so this check displays Verified.",
            };

  const StatusIcon = statusBanner.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8">
        <div className={`rounded-2xl border p-4 ${statusBanner.color}`}>
          <div className="flex items-start gap-3">
            <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">{statusBanner.label}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">{statusBanner.note}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--fcs-border)] pb-4">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[var(--fcs-ink-muted)]">
                Certificate ID
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold">{record.certificate_code}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReportCertificateButton certificateCode={record.certificate_code} />
              <SafeNavLink
                href="/verify"
                className="rounded-xl border border-[var(--fcs-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
              >
                Verify Another
              </SafeNavLink>
            </div>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--fcs-ink-muted)]">Recipient Name</dt>
              <dd className="mt-1 font-bold">{record.recipient_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--fcs-ink-muted)]">Certificate Title</dt>
              <dd className="mt-1 font-bold">{record.certificate_title}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--fcs-ink-muted)]">Course / Achievement</dt>
              <dd className="mt-1 font-medium">{record.course_or_achievement}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--fcs-ink-muted)]">Issuing Organization</dt>
              <dd className="mt-1 font-medium">{record.issuing_organization}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--fcs-ink-muted)]">Issue Date</dt>
              <dd className="mt-1 font-medium">{record.issue_date}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--fcs-ink-muted)]">Expiry Date</dt>
              <dd className="mt-1 font-medium">{record.expiry_date || "No Expiry"}</dd>
            </div>
            {record.issuer_approved && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--fcs-ink-muted)]">Approved Authorized Issuer</dt>
                <dd className="mt-1 font-bold text-teal-700 dark:text-teal-400">
                  {record.issuing_organization}
                  {record.issuer_website && (
                    <span className="ml-2 font-normal text-[var(--fcs-ink-muted)]">
                      ({record.issuer_website})
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
