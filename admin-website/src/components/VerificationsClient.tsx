"use client";

import React, { useState } from "react";
import { Building2, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

interface IssuerRow {
  id: string;
  organization_name: string;
  contact_email: string;
  website: string | null;
  notes: string | null;
  verification_status: string;
}

interface CertVerRow {
  id: string;
  certificate_code: string;
  recipient_name: string;
  certificate_title: string;
  issuing_organization: string;
  issuer_id: string | null;
  verification_status: string;
}

export function VerificationsClient({
  initialIssuers,
  initialCerts,
}: {
  initialIssuers: IssuerRow[];
  initialCerts: CertVerRow[];
}) {
  const [issuers, setIssuers] = useState(initialIssuers);
  const [certs, setCerts] = useState(initialCerts);
  const [feedback, setFeedback] = useState<string | null>(null);

  const updateIssuer = async (
    id: string,
    verificationStatus: "approved" | "revoked" | "rejected"
  ) => {
    const res = await fetch("/api/admin/verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "issuer", id, verificationStatus }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Update failed");
      return;
    }
    setIssuers((prev) =>
      prev.map((i) => (i.id === id ? { ...i, verification_status: verificationStatus } : i))
    );
    setFeedback(`Issuer marked ${verificationStatus}.`);
  };

  const updateCertificate = async (
    id: string,
    verificationStatus: "verified" | "revoked" | "unverified_draft"
  ) => {
    const res = await fetch("/api/admin/verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "certificate", id, verificationStatus }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Update failed");
      return;
    }
    setCerts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, verification_status: verificationStatus } : c))
    );
    setFeedback(`Certificate verification updated to ${verificationStatus}.`);
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {feedback}
        </div>
      )}

      {/* Authorized Issuers */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Building2 className="h-4 w-4 text-teal-600" />
          Authorized Issuing Organizations ({issuers.length})
        </h2>
        <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
          Only approved issuers may issue Verified credentials. Admins never impersonate external
          institutions.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--adm-border)] text-[var(--adm-ink-muted)]">
                <th className="py-2 pr-3">Organization</th>
                <th className="py-2 pr-3">Contact Email / Website</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issuers.map((iss) => (
                <tr key={iss.id} className="border-b border-[var(--adm-border)]/50">
                  <td className="py-2.5 pr-3 font-bold">{iss.organization_name}</td>
                  <td className="py-2.5 pr-3 text-[var(--adm-ink-muted)]">
                    {iss.contact_email}
                    {iss.website && ` • ${iss.website}`}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded bg-[var(--adm-surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase">
                      {iss.verification_status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => void updateIssuer(iss.id, "approved")}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2.5 py-1 text-emerald-700 font-semibold"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateIssuer(iss.id, "revoked")}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2.5 py-1 text-red-600 font-semibold"
                    >
                      <XCircle className="h-3 w-3" /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {issuers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--adm-ink-muted)]">
                    No issuer applications submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Verification Queue */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          Certificate Verification Registry ({certs.length})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--adm-border)] text-[var(--adm-ink-muted)]">
                <th className="py-2 pr-3">Certificate ID</th>
                <th className="py-2 pr-3">Recipient / Organization</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="border-b border-[var(--adm-border)]/50">
                  <td className="py-2.5 pr-3 font-mono font-bold">{c.certificate_code}</td>
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold">{c.recipient_name}</span>
                    <span className="block text-[11px] text-[var(--adm-ink-muted)]">
                      {c.certificate_title} — {c.issuing_organization}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded bg-[var(--adm-surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase">
                      {c.verification_status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                    {c.issuer_id && (
                      <button
                        type="button"
                        onClick={() => void updateCertificate(c.id, "verified")}
                        className="rounded-lg border border-[var(--adm-border)] px-2.5 py-1 font-semibold text-emerald-700"
                      >
                        Verify
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void updateCertificate(c.id, "revoked")}
                      className="rounded-lg border border-[var(--adm-border)] px-2.5 py-1 font-semibold text-red-600"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {certs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--adm-ink-muted)]">
                    No certificate verification records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
