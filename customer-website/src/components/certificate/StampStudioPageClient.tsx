"use client";

import React, { useMemo, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  buildSampleStampSvg,
  createDefaultOfficialStampConfig,
  STAMP_EMBLEM_OPTIONS,
  STAMP_FINISH_OPTIONS,
  STAMP_PRESETS,
  type OfficialStampConfig,
  type OrganizationStampRecord,
  type SignatureLibraryRecord,
  type StampLibraryRecord,
} from "@francis/shared";
import {
  Award,
  Clock,
  Download,
  Loader2,
  Lock,
  PenTool,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stamp,
  Trash2,
} from "lucide-react";
import { SlideReveal } from "@/components/motion/SlideReveal";
import { OrganizationStampStudio } from "./OrganizationStampStudio";
import { SignatureDrawerModal, type CreatedSignaturePayload } from "./SignatureDrawerModal";
import { WatchTutorialButton } from "@/components/tutorials/WatchTutorialButton";

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
  initialSampleStamps?: StampLibraryRecord[];
  initialSignatures?: SignatureLibraryRecord[];
}

export function StampStudioPageClient({
  isAuthenticated,
  applications,
  approvedIssuers,
  initialStamps,
  initialSampleStamps = [],
  initialSignatures = [],
}: Props) {
  const hasOfficial = isAuthenticated && approvedIssuers.length > 0;
  const [activeStudioTab, setActiveStudioTab] = useState<"official" | "sample" | "signatures">(
    hasOfficial ? "official" : "sample"
  );

  const [savedStamps, setSavedStamps] = useState<OrganizationStampRecord[]>(initialStamps);
  const [sampleStamps, setSampleStamps] = useState<StampLibraryRecord[]>(initialSampleStamps);
  const [signatures, setSignatures] = useState<SignatureLibraryRecord[]>(initialSignatures);
  const [selectedIssuerId, setSelectedIssuerId] = useState(approvedIssuers[0]?.id || "");
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  const [sampleConfig, setSampleConfig] = useState<OfficialStampConfig>(() => ({
    ...createDefaultOfficialStampConfig("Sample Design Studio"),
    centerTitle: "SAMPLE",
    bottomText: "SAMPLE DESIGN ONLY",
    registrationNumber: "SMP-2026",
    curvature: 1,
    textRotation: 0,
    opacity: 0.94,
    distressedInk: false,
  }));
  const [savingSample, setSavingSample] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleBuilt = useMemo(
    () => buildSampleStampSvg(sampleConfig, "page-preview"),
    [sampleConfig]
  );

  const pendingApps = applications.filter((a) => a.verification_status === "pending");
  const blockedApps = applications.filter(
    (a) => a.verification_status !== "approved" && a.verification_status !== "pending"
  );

  const downloadDataUrl = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const handleSaveSampleStamp = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    if (!isAuthenticated) {
      setStatusMsg("Downloaded ready! Sign in to save sample stamps to your cloud Stamp Library.");
      downloadDataUrl(
        sampleBuilt.dataUrl,
        `${(sampleConfig.organizationName || "sample").replace(/[^a-z0-9-_]+/gi, "_")}-sample-stamp.svg`
      );
      return;
    }

    setSavingSample(true);
    try {
      const res = await fetch("/api/stamps/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "stamp",
          name: `${sampleConfig.organizationName || "Sample"} (${sampleConfig.preset})`,
          stampCategory: "sample",
          config: sampleConfig,
        }),
      });
      const json = (await res.json()) as { stamp?: StampLibraryRecord; error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Could not save sample stamp.");
        return;
      }
      if (json.stamp) setSampleStamps((prev) => [json.stamp!, ...prev]);
      setStatusMsg("Sample stamp saved to your Personal Stamp Library!");
    } finally {
      setSavingSample(false);
    }
  };

  const handleDeleteSampleStamp = async (id: string) => {
    const res = await fetch(`/api/stamps/library?id=${encodeURIComponent(id)}&kind=stamp`, {
      method: "DELETE",
    });
    if (res.ok) setSampleStamps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDeleteSignature = async (id: string) => {
    const res = await fetch(`/api/stamps/library?id=${encodeURIComponent(id)}&kind=signature`, {
      method: "DELETE",
    });
    if (res.ok) setSignatures((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSignatureApplied = async (sig: CreatedSignaturePayload) => {
    setErrorMsg(null);
    if (isAuthenticated && sig.saveToLibrary) {
      const res = await fetch("/api/stamps/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "signature",
          signatoryName: sig.signatoryName,
          signatoryDesignation: sig.signatoryDesignation,
          stylePreset: sig.stylePreset,
          dataUrl: sig.dataUrl,
        }),
      });
      const d = (await res.json()) as { signature?: SignatureLibraryRecord; error?: string };
      if (!res.ok) {
        setErrorMsg(d.error || "Could not save signature.");
        return;
      }
      if (d.signature) setSignatures((prev) => [d.signature!, ...prev]);
      setStatusMsg(`Signature for "${sig.signatoryName}" saved to your Signature Library!`);
    } else {
      downloadDataUrl(
        sig.dataUrl,
        `${(sig.signatoryName || "signature").replace(/[^a-z0-9-_]+/gi, "_")}.png`
      );
      setStatusMsg(`Signature "${sig.signatoryName}" downloaded as transparent PNG!`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SlideReveal direction="clip">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Stamps, Foil Seals &amp; Digital Signatures
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Creator Stamp &amp; Signature Studio
            </h1>
            <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
              Design Sample Stamps &amp; handwritten signatures freely, or manage Admin-approved
              Official Organization Stamps &amp; Seals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <WatchTutorialButton sectionKey="authorized_orgs" label="Watch Tutorial" />
            <SafeNavLink
              href={`/certificate-builder/new?tab=stamps${
                selectedIssuerId ? `&issuer=${encodeURIComponent(selectedIssuerId)}` : ""
              }`}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              <Award className="h-4 w-4" /> Open Certificate Studio →
            </SafeNavLink>
          </div>
        </div>
      </SlideReveal>

      {/* Studio Mode Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--fcs-border)] pb-3">
        {[
          {
            id: "sample" as const,
            label: "Sample & Practice Stamp Designer",
            icon: Sparkles,
            badge: "Open to All",
          },
          {
            id: "signatures" as const,
            label: "Digital Signature Studio",
            icon: PenTool,
            badge: `${signatures.length}`,
          },
          {
            id: "official" as const,
            label: "Official Organization Stamps & Seals",
            icon: ShieldCheck,
            badge: hasOfficial ? "Approved" : "Approval Needed",
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeStudioTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStudioTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-teal-700 text-white shadow-xs"
                  : "border border-[var(--fcs-border)] bg-[var(--fcs-surface)] hover:border-teal-600/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  active ? "bg-white/20 text-white" : "bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)]"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {(statusMsg || errorMsg) && (
        <div className="space-y-2">
          {statusMsg && (
            <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2.5 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: SAMPLE & PRACTICE STAMP DESIGNER */}
      {activeStudioTab === "sample" && (
        <SlideReveal direction="up">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Customize Sample Design Stamp</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                  Marked &ldquo;SAMPLE / NON-VERIFIED&rdquo;
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Header / Organization Label</label>
                  <input
                    type="text"
                    value={sampleConfig.organizationName}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, organizationName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Center Label</label>
                  <input
                    type="text"
                    value={sampleConfig.centerTitle}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, centerTitle: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Bottom Ring Text</label>
                  <input
                    type="text"
                    value={sampleConfig.bottomText}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, bottomText: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Registration / Sample Tag</label>
                  <input
                    type="text"
                    value={sampleConfig.registrationNumber || ""}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, registrationNumber: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Stamp Geometry</label>
                  <select
                    value={sampleConfig.preset}
                    onChange={(e) =>
                      setSampleConfig((c) => ({
                        ...c,
                        preset: e.target.value as OfficialStampConfig["preset"],
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-xs"
                  >
                    {STAMP_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Ink / Foil Finish</label>
                  <select
                    value={sampleConfig.colorFinish}
                    onChange={(e) =>
                      setSampleConfig((c) => ({
                        ...c,
                        colorFinish: e.target.value as OfficialStampConfig["colorFinish"],
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-xs"
                  >
                    {STAMP_FINISH_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Center Emblem</label>
                  <select
                    value={sampleConfig.emblem}
                    onChange={(e) =>
                      setSampleConfig((c) => ({
                        ...c,
                        emblem: e.target.value as OfficialStampConfig["emblem"],
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-xs"
                  >
                    {STAMP_EMBLEM_OPTIONS.map((em) => (
                      <option key={em.id} value={em.id}>
                        {em.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 sm:grid-cols-3 text-xs">
                <div>
                  <label className="font-semibold">
                    Arc Curvature ({Math.round((sampleConfig.curvature ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.75}
                    max={1.2}
                    step={0.02}
                    value={sampleConfig.curvature ?? 1}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, curvature: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-teal-700"
                  />
                </div>
                <div>
                  <label className="font-semibold">
                    Rotation ({sampleConfig.textRotation ?? 0}°)
                  </label>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    value={sampleConfig.textRotation ?? 0}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, textRotation: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-teal-700"
                  />
                </div>
                <div>
                  <label className="font-semibold">
                    Ink Opacity ({Math.round((sampleConfig.opacity ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.35}
                    max={1}
                    step={0.05}
                    value={sampleConfig.opacity ?? 0.94}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, opacity: Number(e.target.value) }))
                    }
                    className="mt-1 w-full accent-teal-700"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(sampleConfig.distressedInk)}
                    onChange={(e) =>
                      setSampleConfig((c) => ({ ...c, distressedInk: e.target.checked }))
                    }
                    className="accent-teal-700"
                  />
                  Authentic Rubber-Stamp Grain Texture
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadDataUrl(
                        sampleBuilt.dataUrl,
                        `sample-stamp-${Date.now()}.svg`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <Download className="h-3.5 w-3.5" /> Download SVG
                  </button>
                  <button
                    type="button"
                    disabled={savingSample}
                    onClick={handleSaveSampleStamp}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {savingSample ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save to Stamp Library
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview + Saved Sample Library */}
            <div className="space-y-4 lg:col-span-5">
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-[var(--fcs-border)] bg-white p-6 text-center shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sampleBuilt.dataUrl}
                  alt="Sample stamp live preview"
                  className="max-h-48 w-auto object-contain"
                />
                <p className="mt-3 text-[11px] text-slate-500">
                  Transparent vector stamp — non-verified sample watermark included automatically
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
                <h3 className="text-sm font-bold">
                  Saved Personal Sample Stamps ({sampleStamps.length})
                </h3>
                {sampleStamps.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
                    No saved sample stamps yet. Customize on the left and click Save to Stamp Library!
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {sampleStamps.map((st) => (
                      <div
                        key={st.id}
                        className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 text-center"
                      >
                        <div className="flex h-20 items-center justify-center rounded-lg bg-white p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={st.preview_url}
                            alt={st.name}
                            className="max-h-16 w-auto object-contain"
                          />
                        </div>
                        <p className="mt-1.5 truncate text-[11px] font-semibold">{st.name}</p>
                        <div className="mt-1.5 flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadDataUrl(st.preview_url, `${st.name}.svg`)}
                            className="text-[10px] font-semibold text-teal-700 hover:underline dark:text-teal-400"
                          >
                            SVG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSampleStamp(st.id)}
                            className="text-[10px] font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SlideReveal>
      )}

      {/* TAB 2: DIGITAL SIGNATURE STUDIO */}
      {activeStudioTab === "signatures" && (
        <SlideReveal direction="up">
          <div className="space-y-5 rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Digital Signature Library</h2>
                <p className="text-xs text-[var(--fcs-ink-muted)]">
                  Draw signatures with your mouse/stylus, generate calligraphic cursive typed
                  signatures, or upload handwritten scans with automatic white-background removal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <PenTool className="h-3.5 w-3.5" /> + Create New Signature
              </button>
            </div>

            {signatures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--fcs-border)] p-10 text-center text-sm text-[var(--fcs-ink-muted)]">
                No signatures saved yet. Click <strong>Create New Signature</strong> above to draw,
                type, or scan your signature!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4"
                  >
                    <div className="flex h-24 items-center justify-center rounded-xl border border-[var(--fcs-border)] bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sig.data_url}
                        alt={sig.signatory_name}
                        className="max-h-20 w-auto object-contain"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{sig.signatory_name}</p>
                        <p className="truncate text-[11px] text-[var(--fcs-ink-muted)]">
                          {sig.signatory_designation || sig.style_preset}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => downloadDataUrl(sig.data_url, `${sig.signatory_name}.png`)}
                          title="Download transparent PNG"
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 hover:border-teal-600/40"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSignature(sig.id)}
                          title="Delete signature"
                          className="rounded-lg border border-red-500/30 bg-[var(--fcs-surface)] p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SlideReveal>
      )}

      {/* TAB 3: OFFICIAL ORGANIZATION STAMPS */}
      {activeStudioTab === "official" && (
        <SlideReveal direction="up">
          {!isAuthenticated ? (
            <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white">
                <Stamp className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold">Authorized Organization Official Stamps</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--fcs-ink-muted)]">
                Official organization seals without sample watermarks unlock once you sign in with an
                Admin-approved Authorized Organization account.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <SafeNavLink
                  href="/auth/login?next=/stamps"
                  className="rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Sign In
                </SafeNavLink>
                <SafeNavLink
                  href="/verify"
                  className="rounded-xl border border-[var(--fcs-border)] px-5 py-2.5 text-xs font-semibold"
                >
                  Apply as Organization
                </SafeNavLink>
              </div>
            </div>
          ) : approvedIssuers.length === 0 ? (
            <div className="rounded-3xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {pendingApps.length > 0 ? <Clock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">
                {pendingApps.length > 0
                  ? "Official Stamp Access Pending Admin Approval"
                  : "Admin-Approved Authorized Organization Required"}
              </h2>
              <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
                {pendingApps.length > 0
                  ? `Your application for ${pendingApps
                      .map((p) => p.organization_name)
                      .join(", ")} is awaiting Administrator approval. Use the Sample & Practice Stamp Designer tab anytime in the meantime!`
                  : "Official non-sample organizational seals are restricted to Admin-approved institutions. Apply at /verify or use the Sample & Practice Stamp Designer tab right away."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <SafeNavLink
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {pendingApps.length > 0 ? "View Approval Status" : "Apply as Authorized Organization"}
                </SafeNavLink>
              </div>
              {blockedApps.length > 0 && blockedApps[0].notes && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Admin Note: {blockedApps[0].notes}</span>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </SlideReveal>
      )}

      <SignatureDrawerModal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        onApply={handleSignatureApplied}
      />
    </div>
  );
}
