"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  PauseCircle,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";

interface IssuerRow {
  id: string;
  user_id?: string | null;
  organization_name: string;
  contact_email: string;
  website: string | null;
  notes: string | null;
  verification_status: string;
  approved_at?: string | null;
  created_at?: string;
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "blocked"
  >("all");
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => issuers.filter((i) => i.verification_status === "pending").length,
    [issuers]
  );

  const filteredIssuers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issuers.filter((iss) => {
      if (statusFilter === "pending" && iss.verification_status !== "pending") return false;
      if (statusFilter === "approved" && iss.verification_status !== "approved") return false;
      if (
        statusFilter === "blocked" &&
        !["rejected", "suspended", "revoked"].includes(iss.verification_status)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        iss.organization_name.toLowerCase().includes(q) ||
        iss.contact_email.toLowerCase().includes(q) ||
        (iss.website || "").toLowerCase().includes(q)
      );
    });
  }, [issuers, statusFilter, search]);

  const updateIssuer = async (
    id: string,
    verificationStatus: "approved" | "pending" | "rejected" | "suspended" | "revoked"
  ) => {
    setBusyId(id);
    setFeedback(null);
    setErrorMsg(null);
    const noteText = reviewNotes[id]?.trim();
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "issuer",
          id,
          verificationStatus,
          ...(noteText ? { notes: noteText } : {}),
        }),
      });
      const json = (await res.json()) as { error?: string; issuer?: IssuerRow };
      if (!res.ok) {
        setErrorMsg(json.error || "Update failed");
        return;
      }
      setIssuers((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                verification_status: verificationStatus,
                notes: json.issuer?.notes ?? (noteText || i.notes),
                approved_at: json.issuer?.approved_at ?? null,
              }
            : i
        )
      );
      setFeedback(`Organization access updated to "${verificationStatus}".`);
    } finally {
      setBusyId(null);
    }
  };

  const updateCertificate = async (
    id: string,
    verificationStatus: "verified" | "revoked" | "unverified_draft"
  ) => {
    setBusyId(id);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "certificate", id, verificationStatus }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Update failed");
        return;
      }
      setCerts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, verification_status: verificationStatus } : c))
      );
      setFeedback(`Certificate verification updated to ${verificationStatus}.`);
    } finally {
      setBusyId(null);
    }
  };

  const statusPill = (status: string) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <Clock className="h-3 w-3" /> Pending Approval
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-950/60 dark:text-red-300">
        <XCircle className="h-3 w-3" /> {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {pendingCount} Authorized Organization {pendingCount === 1 ? "application" : "applications"}{" "}
              waiting for Admin approval before they can access Verified issuance.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className="rounded-lg bg-amber-700 px-3 py-1 font-semibold text-white hover:bg-amber-800"
          >
            Show Pending ({pendingCount})
          </button>
        </div>
      )}

      {feedback && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Authorized Issuers */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Building2 className="h-4 w-4 text-teal-600" />
              Authorized Issuing Organizations ({issuers.length})
            </h2>
            <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
              Organizations require explicit Admin approval here before accessing Authorized Issuer
              tools, uploading organizational seals, or issuing Verified QR credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-[var(--adm-ink-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search org or email..."
                className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-1.5 pr-3 pl-8 text-xs"
              />
            </div>
            {(
              [
                { id: "all", label: `All (${issuers.length})` },
                { id: "pending", label: `Pending (${pendingCount})` },
                {
                  id: "approved",
                  label: `Approved (${issuers.filter((i) => i.verification_status === "approved").length})`,
                },
                { id: "blocked", label: "Rejected / Revoked" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                  statusFilter === tab.id
                    ? "border-teal-600 bg-teal-700 text-white"
                    : "border-[var(--adm-border)] hover:bg-[var(--adm-surface-muted)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--adm-border)] text-[var(--adm-ink-muted)]">
                <th className="py-2 pr-3">Organization</th>
                <th className="py-2 pr-3">Contact & Details</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Admin Review Note</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssuers.map((iss) => (
                <tr key={iss.id} className="border-b border-[var(--adm-border)]/50 align-top">
                  <td className="py-3 pr-3">
                    <p className="font-bold">{iss.organization_name}</p>
                    <p className="text-[10px] text-[var(--adm-ink-muted)]">
                      {iss.user_id ? "Linked User Account" : "Email-matched Application"}
                      {iss.created_at
                        ? ` • ${new Date(iss.created_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-[var(--adm-ink-muted)]">
                    <p>{iss.contact_email}</p>
                    {iss.website && <p className="text-[11px]">{iss.website}</p>}
                    {iss.notes && (
                      <p className="mt-0.5 text-[11px] italic opacity-85">{iss.notes}</p>
                    )}
                  </td>
                  <td className="py-3 pr-3">{statusPill(iss.verification_status)}</td>
                  <td className="py-3 pr-3">
                    <input
                      type="text"
                      value={reviewNotes[iss.id] ?? ""}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({ ...prev, [iss.id]: e.target.value }))
                      }
                      placeholder="Optional note / reason..."
                      className="w-44 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1 text-[11px]"
                    />
                  </td>
                  <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                    {iss.verification_status !== "approved" && (
                      <button
                        type="button"
                        disabled={busyId === iss.id}
                        onClick={() => void updateIssuer(iss.id, "approved")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </button>
                    )}
                    {iss.verification_status === "pending" && (
                      <button
                        type="button"
                        disabled={busyId === iss.id}
                        onClick={() => void updateIssuer(iss.id, "rejected")}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1 font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    )}
                    {iss.verification_status === "approved" && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === iss.id}
                          onClick={() => void updateIssuer(iss.id, "suspended")}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 px-2.5 py-1 font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 disabled:opacity-60"
                        >
                          <PauseCircle className="h-3 w-3" /> Suspend
                        </button>
                        <button
                          type="button"
                          disabled={busyId === iss.id}
                          onClick={() => void updateIssuer(iss.id, "revoked")}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1 font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60"
                        >
                          <XCircle className="h-3 w-3" /> Revoke
                        </button>
                      </>
                    )}
                    {["rejected", "suspended", "revoked"].includes(iss.verification_status) && (
                      <button
                        type="button"
                        disabled={busyId === iss.id}
                        onClick={() => void updateIssuer(iss.id, "pending")}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2.5 py-1 font-semibold hover:bg-[var(--adm-surface-muted)] disabled:opacity-60"
                      >
                        Reopen Pending
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredIssuers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--adm-ink-muted)]">
                    No issuer applications match the current filter.
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
                        disabled={busyId === c.id}
                        onClick={() => void updateCertificate(c.id, "verified")}
                        className="rounded-lg border border-[var(--adm-border)] px-2.5 py-1 font-semibold text-emerald-700"
                      >
                        Verify
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === c.id}
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
