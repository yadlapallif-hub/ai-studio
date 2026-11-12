"use client";

import React, { useEffect, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useRouter } from "next/navigation";
import {
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import { SlideReveal } from "@/components/motion/SlideReveal";
import { ReportCertificateButton } from "@/components/certificate/ReportCertificateButton";
import { WatchTutorialButton } from "@/components/tutorials/WatchTutorialButton";

interface ApprovedIssuerRow {
  id: string;
  organization_name: string;
  organization_slug: string;
  website: string | null;
  verification_status: string;
  approved_at: string | null;
  created_at: string;
}

interface MyApplicationRow extends ApprovedIssuerRow {
  contact_email: string;
  notes: string | null;
}

export default function VerifyLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [showIssuerForm, setShowIssuerForm] = useState(true);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [issuerMsg, setIssuerMsg] = useState<string | null>(null);
  const [issuerErr, setIssuerErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvedIssuers, setApprovedIssuers] = useState<ApprovedIssuerRow[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplicationRow[]>([]);

  const loadIssuers = async () => {
    try {
      const res = await fetch("/api/issuers/apply");
      if (!res.ok) return;
      const json = (await res.json()) as {
        issuers?: ApprovedIssuerRow[];
        myApplications?: MyApplicationRow[];
      };
      setApprovedIssuers(json.issuers ?? []);
      setMyApplications(json.myApplications ?? []);
    } catch {
      // ignore offline preview fallback
    }
  };

  useEffect(() => {
    void loadIssuers();
  }, []);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    router.push(`/verify/${encodeURIComponent(cleaned)}`);
  };

  const handleIssuerApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuerMsg(null);
    setIssuerErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/issuers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          contactEmail: orgEmail.trim(),
          website: orgWebsite.trim() || null,
          domain: orgDomain.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        pendingApproval?: boolean;
        error?: string;
        issuer?: MyApplicationRow;
      };
      if (!res.ok || !json.ok) {
        setIssuerErr(json.error || "Unable to submit organization application.");
        return;
      }

      setIssuerMsg(
        `Application submitted for "${json.issuer?.organization_name || orgName.trim()}" — pending Administrator approval. Once an Admin approves your organization, Verified Certificate issuance and organizational seals will unlock in Certificate Studio.`
      );
      if (json.issuer) {
        setMyApplications((prev) => [
          json.issuer!,
          ...prev.filter((item) => item.id !== json.issuer!.id),
        ]);
      }
      setOrgName("");
      setOrgEmail("");
      setOrgDomain("");
      setOrgWebsite("");
      await loadIssuers();
    } catch (err) {
      setIssuerErr(err instanceof Error ? err.message : "Failed submitting application.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Approved by Admin
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <Clock className="h-3 w-3" /> Pending Admin Approval
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-950/60 dark:text-red-300">
        <ShieldAlert className="h-3 w-3" /> {status}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <SlideReveal direction="clip">
        <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <WatchTutorialButton sectionKey="verify" label="Watch Verification Tutorial" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Public Certificate Verification
        </h1>
        <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
          Enter a CREATOR STUDIO Certificate ID (or scan its QR code) to verify authentic
          issuance status against our live database registry.
        </p>

        <form onSubmit={handleLookup} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[var(--fcs-ink-muted)]" />
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Certificate ID (e.g. FCS-2026-AB12CD)"
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-3 pr-4 pl-10 font-mono text-sm uppercase"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Verify Credential
          </button>
        </form>

        <div className="mt-8 space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-5 text-xs text-[var(--fcs-ink-muted)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-[var(--fcs-ink)]">Verification &amp; Sample Badge Policy</p>
            <ReportCertificateButton certificateCode={code} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-3 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200">
              <p className="font-bold">✓ Officially Verified</p>
              <p className="mt-0.5 text-[11px] opacity-90">
                Issued &amp; published by an Admin-approved Authorized Organization with active live
                QR verification.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-50/70 p-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-bold">Sample / Personal Draft</p>
              <p className="mt-0.5 text-[11px] opacity-90">
                Created in Sample Design Mode for previews or personal practice — never listed as
                Officially Verified on this registry.
              </p>
            </div>
          </div>
        </div>
        </div>
      </SlideReveal>

      {/* Authorized Organization Application (Requires Admin Approval) */}
      <SlideReveal direction="up" delay={100}>
      <div className="mt-8 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold">Apply for Authorized Organization Access</h2>
              <p className="text-xs text-[var(--fcs-ink-muted)]">
                Submit your organization name and email for Administrator review. Approved
                organizations unlock Verified QR issuance and official organizational seal uploads.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WatchTutorialButton
              sectionKey="authorized_orgs"
              variant="compact"
              label="Watch Approval Guide"
            />
            <button
              type="button"
              onClick={() => setShowIssuerForm((s) => !s)}
              className="rounded-lg border border-[var(--fcs-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              {showIssuerForm ? "Hide Form" : "Apply as Organization"}
            </button>
          </div>
        </div>

        {showIssuerForm && (
          <form
            onSubmit={handleIssuerApply}
            className="mt-5 grid gap-3 border-t border-[var(--fcs-border)] pt-5 text-xs sm:grid-cols-2"
          >
            {issuerMsg && (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{issuerMsg}</span>
              </div>
            )}
            {issuerErr && (
              <div className="sm:col-span-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {issuerErr}
              </div>
            )}
            <div>
              <label className="mb-1 block font-semibold">Organization Name *</label>
              <input
                type="text"
                required
                minLength={2}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Nexora Academy"
                className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold">
                Organization / Account Email *
              </label>
              <input
                type="email"
                required
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                placeholder="e.g. hello@organization.com"
                className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
              />
              <p className="mt-1 text-[10px] text-[var(--fcs-ink-muted)]">
                Once approved by an Admin, Stamp Studio & Verified issuance unlock for both your
                signed-in account and this email.
              </p>
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowOptionalDetails((s) => !s)}
                className="text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                {showOptionalDetails
                  ? "− Hide optional website & domain"
                  : "+ Optional: Add website or domain"}
              </button>
            </div>

            {showOptionalDetails && (
              <>
                <input
                  type="text"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                  placeholder="Primary Domain (optional, e.g. nexora.com)"
                  className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
                />
                <input
                  type="text"
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  placeholder="Website (optional, e.g. https://nexora.com)"
                  className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
                />
              </>
            )}

            <div className="sm:col-span-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {submitting ? "Submitting..." : "Submit for Admin Approval"}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Signed-in Applicant's Organizations & Approval Status */}
        {myApplications.length > 0 && (
          <div className="mt-6 border-t border-[var(--fcs-border)] pt-5">
            <p className="text-[11px] font-bold tracking-wider uppercase text-[var(--fcs-ink-muted)]">
              Your Organization Applications ({myApplications.length})
            </p>
            <div className="mt-3 space-y-2.5">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold">{app.organization_name}</p>
                    <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                      {app.contact_email}
                      {app.notes ? ` • ${app.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderStatusBadge(app.verification_status)}
                    {app.verification_status === "approved" && (
                      <>
                        <SafeNavLink
                          href="/stamps"
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800"
                        >
                          <Stamp className="h-3 w-3" /> Open Stamp Studio
                        </SafeNavLink>
                        <SafeNavLink
                          href={`/certificate-builder/new?tab=stamps&issuer=${encodeURIComponent(app.id)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-teal-700/40 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100"
                        >
                          <Award className="h-3 w-3" /> Certificate Studio
                        </SafeNavLink>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {approvedIssuers.length > 0 && (
          <div className="mt-6 border-t border-[var(--fcs-border)] pt-5">
            <p className="text-[11px] font-bold tracking-wider uppercase text-[var(--fcs-ink-muted)]">
              Admin-Approved Authorized Organizations ({approvedIssuers.length})
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {approvedIssuers.slice(0, 12).map((iss) => (
                <div
                  key={iss.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{iss.organization_name}</p>
                    {iss.website && (
                      <SafeNavLink
                        href={iss.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 truncate text-[10px] text-teal-700 hover:underline dark:text-teal-400"
                      >
                        <Globe className="h-2.5 w-2.5" /> {iss.website.replace(/^https?:\/\//, "")}
                      </SafeNavLink>
                    )}
                  </div>
                  <span className="ml-2 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Approved
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </SlideReveal>
    </div>
  );
}
