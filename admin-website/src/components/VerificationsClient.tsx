"use client";

import React, { useMemo, useState } from "react";
import {
  buildOfficialStampSvg,
  STAMP_PRESETS,
  stampSvgToDataUrl,
  type OfficialStampConfig,
  type StampColorFinish,
  type StampEmblem,
  type StampPresetId,
} from "@francis/shared";
import {
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  Plus,
  Search,
  ShieldAlert,
  Stamp,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

interface IssuerRow {
  id: string;
  user_id?: string | null;
  requester_email?: string | null;
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

interface AdminStampItem {
  id: string;
  issuer_id: string;
  name: string;
  stamp_kind: string;
  shape: string;
  ink_style: string;
  is_default: boolean;
  preview_url: string;
}

interface CertReportRow {
  id: string;
  certificate_code: string;
  reporter_email: string | null;
  reason: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_notes: string | null;
  created_at: string;
}

export function VerificationsClient({
  initialIssuers,
  initialCerts,
  initialStamps = [],
  initialReports = [],
}: {
  initialIssuers: IssuerRow[];
  initialCerts: CertVerRow[];
  initialStamps?: AdminStampItem[];
  initialReports?: CertReportRow[];
}) {
  const [issuers, setIssuers] = useState(initialIssuers);
  const [certs, setCerts] = useState(initialCerts);
  const [stamps, setStamps] = useState<AdminStampItem[]>(initialStamps);
  const [reports, setReports] = useState<CertReportRow[]>(initialReports);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "blocked"
  >("all");
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin Official Stamp Creator modal state for approved organizations
  const [stampModalIssuer, setStampModalIssuer] = useState<IssuerRow | null>(null);
  const [stampName, setStampName] = useState("Official Organization Stamp");
  const [stampIsDefault, setStampIsDefault] = useState(true);
  const [stampConfig, setStampConfig] = useState<OfficialStampConfig>({
    preset: "circular_double",
    organizationName: "",
    centerTitle: "VERIFIED ISSUER",
    bottomText: "OFFICIAL SEAL",
    subCode: "REG-2026",
    emblem: "shield",
    colorFinish: "blue_ink",
    fontStyle: "serif",
    borderWeight: "medium",
    distressedInk: true,
    showDateLine: false,
    dateText: new Date().toISOString().slice(0, 10),
  });
  const [savingStamp, setSavingStamp] = useState(false);

  const liveAdminStampPreview = useMemo(() => {
    if (!stampModalIssuer) return "";
    const built = buildOfficialStampSvg(
      {
        ...stampConfig,
        organizationName:
          stampConfig.organizationName || stampModalIssuer.organization_name,
      },
      "adm-preview"
    );
    return stampSvgToDataUrl(built.svgMarkup);
  }, [stampConfig, stampModalIssuer]);

  const openStampModalForIssuer = (iss: IssuerRow) => {
    setStampModalIssuer(iss);
    setStampName(`${iss.organization_name} Official Stamp`);
    setStampIsDefault(stamps.filter((s) => s.issuer_id === iss.id).length === 0);
    setStampConfig((prev) => ({
      ...prev,
      organizationName: iss.organization_name,
    }));
  };

  const handleCreateAdminStamp = async () => {
    if (!stampModalIssuer) return;
    setSavingStamp(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuerId: stampModalIssuer.id,
          name: stampName.trim() || `${stampModalIssuer.organization_name} Official Stamp`,
          isDefault: stampIsDefault,
          config: {
            ...stampConfig,
            organizationName:
              stampConfig.organizationName.trim() || stampModalIssuer.organization_name,
          },
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        stamp?: AdminStampItem;
      };
      if (!res.ok || !json.stamp) {
        setErrorMsg(json.error || "Failed creating organization stamp");
        return;
      }
      setStamps((prev) => {
        const cleaned = stampIsDefault
          ? prev.map((s) =>
              s.issuer_id === stampModalIssuer.id ? { ...s, is_default: false } : s
            )
          : prev;
        return [json.stamp!, ...cleaned];
      });
      setFeedback(
        `Created "${json.stamp.name}" for ${stampModalIssuer.organization_name}. It is immediately available inside their Stamp Studio and Certificate Studio.`
      );
      setStampModalIssuer(null);
    } finally {
      setSavingStamp(false);
    }
  };

  const handleDeleteAdminStamp = async (stampId: string) => {
    setBusyId(stampId);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/stamps?id=${encodeURIComponent(stampId)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Failed deleting stamp");
        return;
      }
      setStamps((prev) => prev.filter((s) => s.id !== stampId));
      setFeedback("Removed organization stamp.");
    } finally {
      setBusyId(null);
    }
  };

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
        (iss.requester_email || "").toLowerCase().includes(q) ||
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
      setFeedback(
        verificationStatus === "approved"
          ? "Organization approved — Stamp Studio, official stamp/seal tools, and Verified credential issuance unlocked for the requested account."
          : `Organization access updated to "${verificationStatus}".`
      );
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

  const updateReport = async (
    id: string,
    status: "open" | "reviewing" | "resolved" | "dismissed",
    revokeCertificate = false
  ) => {
    setBusyId(id);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "report",
          id,
          status,
          revokeCertificate,
          adminNotes: reviewNotes[id]?.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Report update failed");
        return;
      }
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      if (revokeCertificate) {
        const targetReport = reports.find((r) => r.id === id);
        if (targetReport) {
          setCerts((prev) =>
            prev.map((c) =>
              c.certificate_code.toUpperCase() === targetReport.certificate_code.toUpperCase()
                ? { ...c, verification_status: "revoked" }
                : c
            )
          );
        }
      }
      setFeedback(
        revokeCertificate
          ? `Report marked ${status} and certificate revoked.`
          : `Report status updated to ${status}.`
      );
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
              waiting for Admin approval before Stamp Studio & Verified issuance unlock.
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

      {/* Official Stamp Creator Modal for an Approved Organization */}
      {stampModalIssuer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--adm-border)] pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <Stamp className="h-4 w-4 text-teal-600" />
                  Create Official Stamp for {stampModalIssuer.organization_name}
                </h3>
                <p className="mt-0.5 text-[11px] text-[var(--adm-ink-muted)]">
                  Saved stamps unlock directly in {stampModalIssuer.organization_name}&apos;s Stamp
                  Studio and Certificate Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStampModalIssuer(null)}
                className="rounded-lg p-1.5 hover:bg-[var(--adm-surface-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold">Stamp Title</label>
                    <input
                      type="text"
                      value={stampName}
                      onChange={(e) => setStampName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold">Preset Shape</label>
                    <select
                      value={stampConfig.preset}
                      onChange={(e) =>
                        setStampConfig((p) => ({
                          ...p,
                          preset: e.target.value as StampPresetId,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1.5"
                    >
                      {STAMP_PRESETS.map((presetItem) => (
                        <option key={presetItem.id} value={presetItem.id}>
                          {presetItem.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold">Organization Text</label>
                    <input
                      type="text"
                      value={stampConfig.organizationName}
                      onChange={(e) =>
                        setStampConfig((p) => ({ ...p, organizationName: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold">Center Label</label>
                    <input
                      type="text"
                      value={stampConfig.centerTitle}
                      onChange={(e) =>
                        setStampConfig((p) => ({ ...p, centerTitle: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold">Ink / Seal Finish</label>
                    <select
                      value={stampConfig.colorFinish}
                      onChange={(e) =>
                        setStampConfig((p) => ({
                          ...p,
                          colorFinish: e.target.value as StampColorFinish,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2 py-1.5"
                    >
                      <option value="blue_ink">Blue Ink</option>
                      <option value="red_ink">Red Ink</option>
                      <option value="teal_ink">Teal Ink</option>
                      <option value="black_ink">Black Ink</option>
                      <option value="gold_embossed">Gold Seal</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold">Emblem</label>
                    <select
                      value={stampConfig.emblem}
                      onChange={(e) =>
                        setStampConfig((p) => ({
                          ...p,
                          emblem: e.target.value as StampEmblem,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2 py-1.5"
                    >
                      <option value="shield">Shield</option>
                      <option value="check">Check</option>
                      <option value="star">Star</option>
                      <option value="laurel">Laurel</option>
                      <option value="crest">Crest</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold">Sub Code</label>
                    <input
                      type="text"
                      value={stampConfig.subCode}
                      onChange={(e) =>
                        setStampConfig((p) => ({ ...p, subCode: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2 py-1.5"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={stampIsDefault}
                    onChange={(e) => setStampIsDefault(e.target.checked)}
                    className="accent-teal-700"
                  />
                  Set as default stamp for this organization&apos;s new certificates
                </label>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--adm-border)] bg-white p-3">
                {liveAdminStampPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={liveAdminStampPreview}
                    alt="Admin stamp preview"
                    className="max-h-36 max-w-full object-contain"
                  />
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-[var(--adm-border)] pt-3 text-xs">
              <button
                type="button"
                onClick={() => setStampModalIssuer(null)}
                className="rounded-lg border border-[var(--adm-border)] px-3 py-1.5 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingStamp}
                onClick={() => void handleCreateAdminStamp()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-1.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {savingStamp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Save Official Stamp
              </button>
            </div>
          </div>
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
              Approving an organization unlocks Stamp Studio, official stamps & seals, and Verified QR
              credential issuance for the requesting account and organization email.
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
                <th className="py-2 pr-3">Requested Account & Contact</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Stamps</th>
                <th className="py-2 pr-3">Admin Review Note</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssuers.map((iss) => {
                const orgStamps = stamps.filter((s) => s.issuer_id === iss.id);
                return (
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
                      {iss.requester_email && (
                        <p className="font-medium text-[var(--adm-ink)]">
                          Account: {iss.requester_email}
                        </p>
                      )}
                      <p>Org Email: {iss.contact_email}</p>
                      {iss.website && <p className="text-[11px]">{iss.website}</p>}
                      {iss.notes && (
                        <p className="mt-0.5 text-[11px] italic opacity-85">{iss.notes}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3">{statusPill(iss.verification_status)}</td>
                    <td className="py-3 pr-3">
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--adm-surface-muted)] px-2 py-0.5 text-[10px] font-semibold">
                          <Stamp className="h-3 w-3 text-teal-600" />
                          {orgStamps.length} {orgStamps.length === 1 ? "stamp" : "stamps"}
                        </span>
                        {orgStamps.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {orgStamps.slice(0, 3).map((st) => (
                              <div
                                key={st.id}
                                className="flex items-center gap-1 rounded border border-[var(--adm-border)] bg-white px-1.5 py-0.5 text-[10px] text-slate-800"
                              >
                                {st.preview_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={st.preview_url}
                                    alt={st.name}
                                    className="h-4 w-4 object-contain"
                                  />
                                )}
                                <span className="max-w-[85px] truncate">{st.name}</span>
                                <button
                                  type="button"
                                  disabled={busyId === st.id}
                                  onClick={() => void handleDeleteAdminStamp(st.id)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete stamp"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        type="text"
                        value={reviewNotes[iss.id] ?? ""}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({ ...prev, [iss.id]: e.target.value }))
                        }
                        placeholder="Optional note / reason..."
                        className="w-40 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1 text-[11px]"
                      />
                    </td>
                    <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                      {iss.verification_status === "approved" && (
                        <button
                          type="button"
                          onClick={() => openStampModalForIssuer(iss)}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1 font-semibold text-white hover:bg-teal-800"
                        >
                          <Stamp className="h-3 w-3" /> Create Stamp
                        </button>
                      )}
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
                );
              })}
              {filteredIssuers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--adm-ink-muted)]">
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

      {/* Reported Certificates Moderation Queue */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          Reported Certificates Queue ({reports.filter((r) => r.status === "open" || r.status === "reviewing").length} active / {reports.length} total)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--adm-border)] text-[var(--adm-ink-muted)]">
                <th className="py-2 pr-3">Certificate ID</th>
                <th className="py-2 pr-3">Reason &amp; Details</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => (
                <tr key={rep.id} className="border-b border-[var(--adm-border)]/50 align-top">
                  <td className="py-2.5 pr-3">
                    <p className="font-mono font-bold">{rep.certificate_code}</p>
                    <p className="text-[10px] text-[var(--adm-ink-muted)]">
                      {new Date(rep.created_at).toLocaleString()}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold capitalize">{rep.reason.replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-[var(--adm-ink-muted)]">{rep.details}</p>
                    {rep.reporter_email && (
                      <p className="mt-0.5 text-[10px] text-[var(--adm-ink-muted)]">
                        Reporter: {rep.reporter_email}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded bg-[var(--adm-surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase">
                      {rep.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                    {rep.status === "open" && (
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => void updateReport(rep.id, "reviewing")}
                        className="rounded-lg border border-amber-500/40 px-2.5 py-1 font-semibold text-amber-700"
                      >
                        Reviewing
                      </button>
                    )}
                    {rep.status !== "resolved" && (
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => void updateReport(rep.id, "resolved", true)}
                        className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700"
                      >
                        Resolve &amp; Revoke
                      </button>
                    )}
                    {rep.status !== "dismissed" && (
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => void updateReport(rep.id, "dismissed", false)}
                        className="rounded-lg border border-[var(--adm-border)] px-2.5 py-1 font-semibold"
                      >
                        Dismiss
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--adm-ink-muted)]">
                    No reported certificates logged.
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
