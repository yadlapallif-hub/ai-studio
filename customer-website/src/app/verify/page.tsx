"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Globe, Loader2, Search, ShieldCheck } from "lucide-react";

interface ApprovedIssuerRow {
  id: string;
  organization_name: string;
  organization_slug: string;
  website: string | null;
  verification_status: string;
  approved_at: string | null;
  created_at: string;
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

  const loadIssuers = async () => {
    try {
      const res = await fetch("/api/issuers/apply");
      if (!res.ok) return;
      const json = (await res.json()) as { issuers?: ApprovedIssuerRow[] };
      setApprovedIssuers(json.issuers ?? []);
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
        error?: string;
        issuer?: ApprovedIssuerRow;
      };
      if (!res.ok || !json.ok) {
        setIssuerErr(json.error || "Unable to register organization.");
        return;
      }

      setIssuerMsg(
        `"${json.issuer?.organization_name || orgName.trim()}" is now registered and approved as an Authorized Issuer. Certificates linked to this organization can display Verified status.`
      );
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Public Certificate Verification
        </h1>
        <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
          Enter a FRANCIS CREATOR STUDIO Certificate ID (or scan its QR code) to verify authentic
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

        <div className="mt-8 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-5 text-xs text-[var(--fcs-ink-muted)]">
          <p className="font-bold text-[var(--fcs-ink)]">Verification Transparency Policy</p>
          <p className="mt-1 leading-relaxed">
            FRANCIS CREATOR STUDIO never marks a self-created draft or decorative sample stamp as
            officially verified. A credential displays <strong>Officially Verified</strong> only
            when issued under a registered Authorized Issuer organization.
          </p>
        </div>
      </div>

      {/* Authorized Issuer Registration (Open for all organizations with Name & Email) */}
      <div className="mt-8 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold">Register Your Organization as Authorized Issuer</h2>
              <p className="text-xs text-[var(--fcs-ink-muted)]">
                Currently open to all organizations — register instantly using just your
                organization name and email.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIssuerForm((s) => !s)}
            className="rounded-lg border border-[var(--fcs-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            {showIssuerForm ? "Hide Form" : "Register Organization"}
          </button>
        </div>

        {showIssuerForm && (
          <form
            onSubmit={handleIssuerApply}
            className="mt-5 grid gap-3 border-t border-[var(--fcs-border)] pt-5 text-xs sm:grid-cols-2"
          >
            {issuerMsg && (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-50 p-3 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
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
              <label className="mb-1 block font-semibold">Organization Email *</label>
              <input
                type="email"
                required
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                placeholder="e.g. hello@organization.com"
                className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
              />
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
                  {submitting ? "Registering..." : "Register Authorized Organization"}
                </span>
              </button>
            </div>
          </form>
        )}

        {approvedIssuers.length > 0 && (
          <div className="mt-6 border-t border-[var(--fcs-border)] pt-5">
            <p className="text-[11px] font-bold tracking-wider uppercase text-[var(--fcs-ink-muted)]">
              Active Approved Organizations ({approvedIssuers.length})
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
                      <a
                        href={iss.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 truncate text-[10px] text-teal-700 hover:underline dark:text-teal-400"
                      >
                        <Globe className="h-2.5 w-2.5" /> {iss.website.replace(/^https?:\/\//, "")}
                      </a>
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
    </div>
  );
}
