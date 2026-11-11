"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [showIssuerForm, setShowIssuerForm] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [issuerMsg, setIssuerMsg] = useState<string | null>(null);
  const [issuerErr, setIssuerErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIssuerErr("Sign in first to submit an Authorized Issuer application.");
        return;
      }
      const slug =
        orgName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `issuer-${Date.now()}`;
      const { error } = await supabase.from("fcs_authorized_issuers").insert({
        user_id: user.id,
        organization_name: orgName.trim(),
        organization_slug: `${slug}-${Date.now().toString().slice(-4)}`,
        contact_email: orgEmail.trim(),
        website: orgWebsite.trim() || null,
        notes: orgDomain.trim() ? `Primary domain: ${orgDomain.trim()}` : null,
        verification_status: "pending",
      });
      if (error) {
        setIssuerErr(error.message);
        return;
      }
      setIssuerMsg(
        "Issuer application submitted for administrator verification. Once approved, certificates linked to your issuer account can carry Verified status."
      );
      setOrgName("");
      setOrgDomain("");
      setOrgEmail("");
      setOrgWebsite("");
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
            after verification under an administrator-approved Authorized Issuer.
          </p>
        </div>
      </div>

      {/* Authorized Issuer Application */}
      <div className="mt-8 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold">Represent an Organization or Institution?</h2>
              <p className="text-xs text-[var(--fcs-ink-muted)]">
                Apply for Authorized Issuer approval to verify credentials issued by your organization.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIssuerForm((s) => !s)}
            className="rounded-lg border border-[var(--fcs-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            {showIssuerForm ? "Hide Application" : "Apply as Authorized Issuer"}
          </button>
        </div>

        {showIssuerForm && (
          <form onSubmit={handleIssuerApply} className="mt-5 grid gap-3 border-t border-[var(--fcs-border)] pt-5 text-xs sm:grid-cols-2">
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
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Official Organization Name *"
              className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
            />
            <input
              type="email"
              required
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              placeholder="Official Organization Contact Email *"
              className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
            />
            <input
              type="text"
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              placeholder="Primary Domain (e.g. university.edu)"
              className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
            />
            <input
              type="url"
              value={orgWebsite}
              onChange={(e) => setOrgWebsite(e.target.value)}
              placeholder="Official Website URL (https://...)"
              className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2.5"
            />
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Issuer Application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
