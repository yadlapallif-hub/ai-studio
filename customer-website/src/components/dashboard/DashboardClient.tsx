"use client";

import React, { useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useRouter } from "next/navigation";
import {
  Award,
  Bookmark,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  FolderLock,
  FolderOpen,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  PenTool,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stamp,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SlideReveal } from "@/components/motion/SlideReveal";

interface ResumeRow {
  id: string;
  title: string;
  template_slug: string;
  target_role: string | null;
  ats_score: number | null;
  download_count: number;
  updated_at: string;
  data: Record<string, unknown>;
  style_config: Record<string, unknown>;
}

interface CertRow {
  id: string;
  title: string;
  recipient_name: string;
  certificate_code: string;
  template_slug: string;
  download_count: number;
  updated_at: string;
  fcs_certificate_verifications?:
    | { verification_status?: string }
    | Array<{ verification_status?: string }>
    | null;
}

interface ProjectRow {
  id: string;
  title: string;
  template_slug: string;
  orientation: string;
  status: string;
  updated_at: string;
}

interface SampleStampRow {
  id: string;
  name: string;
  stamp_category: string;
  is_official_verified: boolean;
  preview_url: string;
  created_at: string;
}

interface OfficialStampRow {
  id: string;
  name: string;
  stamp_kind: string;
  preview_url: string;
}

interface SignatureRow {
  id: string;
  signatory_name: string;
  signatory_designation: string;
  style_preset: string;
  data_url: string;
  created_at: string;
}

interface BulkBatchRow {
  id: string;
  batch_name: string;
  total_rows: number;
  generated_count: number;
  is_official_batch: boolean;
  template_slug: string | null;
  created_at: string;
}

interface ExportEventRow {
  id: string;
  document_type: string;
  format: string;
  resolution_label: string | null;
  file_name: string | null;
  created_at: string;
}

interface FavoriteTemplateRow {
  id: string;
  template_slug: string;
  is_favorite: boolean;
  use_count: number;
  last_used_at: string;
}

interface RecRow {
  id: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "accepted" | "saved" | "dismissed";
  feedback: "helpful" | "not_helpful" | null;
  action_payload: { href?: string } | null;
}

interface OrgAppRow {
  id: string;
  organization_name: string;
  contact_email: string;
  verification_status: string;
  notes: string | null;
  approved_at: string | null;
}

type DashboardTabId =
  | "overview"
  | "projects"
  | "certificates"
  | "resumes"
  | "templates"
  | "stamps"
  | "signatures"
  | "bulk"
  | "exports"
  | "organization"
  | "account";

interface Props {
  userName: string;
  aiRecommendationsEnabled: boolean;
  initialResumes: ResumeRow[];
  initialCertificates: CertRow[];
  initialProjects?: ProjectRow[];
  initialSampleStamps?: SampleStampRow[];
  initialOfficialStamps?: OfficialStampRow[];
  initialSignatures?: SignatureRow[];
  initialBulkBatches?: BulkBatchRow[];
  initialExportEvents?: ExportEventRow[];
  initialFavorites?: FavoriteTemplateRow[];
  initialRecommendations: RecRow[];
  resumeTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  certTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  aiConversations: Array<{ id: string; title: string; context_page: string; updated_at: string }>;
  tickets: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    priority: string;
    updated_at: string;
  }>;
  orgApplications?: OrgAppRow[];
}

export function DashboardClient(props: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTabId>("overview");
  const [resumes, setResumes] = useState(props.initialResumes);
  const [certificates, setCertificates] = useState(props.initialCertificates);
  const [projects, setProjects] = useState<ProjectRow[]>(props.initialProjects ?? []);
  const [sampleStamps, setSampleStamps] = useState<SampleStampRow[]>(
    props.initialSampleStamps ?? []
  );
  const [signatures, setSignatures] = useState<SignatureRow[]>(props.initialSignatures ?? []);
  const [recs, setRecs] = useState(props.initialRecommendations);
  const [recsEnabled, setRecsEnabled] = useState(props.aiRecommendationsEnabled);
  const [refreshingRecs, setRefreshingRecs] = useState(false);
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const officialStamps = props.initialOfficialStamps ?? [];
  const bulkBatches = props.initialBulkBatches ?? [];
  const exportEvents = props.initialExportEvents ?? [];
  const favorites = props.initialFavorites ?? [];
  const totalDocuments = resumes.length + certificates.length + projects.length;
  const openTicketsCount = props.tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed"
  ).length;
  const hasApprovedOrg = (props.orgApplications ?? []).some(
    (o) => o.verification_status === "approved"
  );

  const tabs: Array<{
    id: DashboardTabId;
    label: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "projects", label: "Design Projects", count: projects.length, icon: FolderOpen },
    { id: "certificates", label: "Issued Certificates", count: certificates.length, icon: Award },
    { id: "resumes", label: "Resumes & CVs", count: resumes.length, icon: FileText },
    { id: "templates", label: "Templates & Favorites", count: favorites.length, icon: Heart },
    {
      id: "stamps",
      label: "Stamps & Seals",
      count: sampleStamps.length + officialStamps.length,
      icon: Stamp,
    },
    { id: "signatures", label: "Signatures", count: signatures.length, icon: PenTool },
    { id: "bulk", label: "Bulk Batches", count: bulkBatches.length, icon: FileSpreadsheet },
    { id: "exports", label: "Export History", count: exportEvents.length, icon: Download },
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "account", label: "Account & Support", icon: Settings },
  ];

  const duplicateResume = async (resume: ResumeRow) => {
    setBusyId(resume.id);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: inserted } = await supabase
        .from("fcs_resumes")
        .insert({
          user_id: user.id,
          title: `${resume.title} (Copy)`,
          template_slug: resume.template_slug,
          target_role: resume.target_role,
          data: resume.data,
          style_config: resume.style_config,
          ats_score: resume.ats_score,
        })
        .select("*")
        .single();

      if (inserted) {
        setResumes((prev) => [inserted as ResumeRow, ...prev]);
      }
    } finally {
      setBusyId(null);
    }
  };

  const deleteResume = async (id: string) => {
    setBusyId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("fcs_resumes").delete().eq("id", id);
      if (!error) setResumes((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const deleteCertificate = async (id: string) => {
    setBusyId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("fcs_certificates").delete().eq("id", id);
      if (!error) setCertificates((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const deleteProject = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/design-projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const deleteSampleStamp = async (id: string) => {
    const res = await fetch(`/api/stamps/library?id=${encodeURIComponent(id)}&kind=stamp`, {
      method: "DELETE",
    });
    if (res.ok) setSampleStamps((prev) => prev.filter((s) => s.id !== id));
  };

  const deleteSignature = async (id: string) => {
    const res = await fetch(`/api/stamps/library?id=${encodeURIComponent(id)}&kind=signature`, {
      method: "DELETE",
    });
    if (res.ok) setSignatures((prev) => prev.filter((s) => s.id !== id));
  };

  const refreshRecommendations = async () => {
    setRefreshingRecs(true);
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_dashboard" }),
      });
      if (res.ok) {
        const json = (await res.json()) as { enabled: boolean; recommendations: RecRow[] };
        setRecsEnabled(json.enabled);
        setRecs(json.recommendations);
      }
    } finally {
      setRefreshingRecs(false);
    }
  };

  const updateRecommendation = async (
    id: string,
    patch: { status?: "accepted" | "saved" | "dismissed"; feedback?: "helpful" | "not_helpful" },
    navigateHref?: string
  ) => {
    const res = await fetch("/api/ai/recommend", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      if (patch.status === "dismissed") {
        setRecs((prev) => prev.filter((r) => r.id !== id));
      } else {
        const json = (await res.json()) as { recommendation: RecRow };
        setRecs((prev) => prev.map((r) => (r.id === id ? json.recommendation : r)));
      }
      if (navigateHref) router.push(navigateHref);
    }
  };

  const toggleRecommendationsEnabled = async () => {
    const nextVal = !recsEnabled;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("fcs_profiles")
      .update({ ai_recommendations_enabled: nextVal })
      .eq("id", user.id);
    setRecsEnabled(nextVal);
    if (nextVal) refreshRecommendations();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header Welcome */}
      <SlideReveal direction="clip">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-teal-700 dark:text-teal-400">
              Creator Studio Hub
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Welcome back, {props.userName}
            </h1>
            <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
              All your design projects, resumes, certificates, stamps, signatures, batch runs, and
              exports in one workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SafeNavLink
              href="/resume-builder/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Plus className="h-3.5 w-3.5" /> New Resume
            </SafeNavLink>
            <SafeNavLink
              href="/certificate-builder/new"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3.5 py-2 text-xs font-semibold hover:border-teal-600/40"
            >
              <Plus className="h-3.5 w-3.5 text-teal-600" /> Certificate Studio
            </SafeNavLink>
            <SafeNavLink
              href="/stamps"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <Stamp className="h-3.5 w-3.5 text-teal-600" /> Stamps
            </SafeNavLink>
            <SafeNavLink
              href="/bulk-generator"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" /> Bulk Issue
            </SafeNavLink>
            <SafeNavLink
              href="/vault"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <FolderLock className="h-3.5 w-3.5" /> Vault
            </SafeNavLink>
          </div>
        </div>
      </SlideReveal>

      {/* 11-Tab Navigation Ribbon */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
              <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">Total Creations</p>
              <p className="mt-2 text-3xl font-bold">{totalDocuments}</p>
            </div>
            <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
              <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">
                Design Projects &amp; Certs
              </p>
              <p className="mt-2 text-3xl font-bold">{projects.length + certificates.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
              <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">
                Stamps &amp; Signatures
              </p>
              <p className="mt-2 text-3xl font-bold">
                {sampleStamps.length + officialStamps.length + signatures.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
              <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">Open Support Tickets</p>
              <p className="mt-2 text-3xl font-bold">{openTicketsCount}</p>
            </div>
          </div>

          {/* Creator AI Recommendations */}
          <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fcs-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Creator AI Recommendations</h2>
                  <p className="text-xs text-[var(--fcs-ink-muted)]">
                    Smart suggestions tailored from your documents. Nothing changes without approval.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRecommendationsEnabled}
                  className="rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  {recsEnabled ? "Disable Suggestions" : "Enable Suggestions"}
                </button>
                {recsEnabled && (
                  <button
                    type="button"
                    onClick={refreshRecommendations}
                    disabled={refreshingRecs}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshingRecs ? "animate-spin" : ""}`} />
                    Analyze Workspace
                  </button>
                )}
              </div>
            </div>

            {!recsEnabled ? (
              <p className="py-6 text-center text-xs text-[var(--fcs-ink-muted)]">
                AI recommendations are currently paused under your privacy preferences.
              </p>
            ) : recs.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--fcs-ink-muted)]">
                No pending recommendations right now. Click{" "}
                <span className="font-semibold">Analyze Workspace</span> to scan your latest files.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recs.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-col justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-[var(--fcs-surface)] px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-teal-700 dark:text-teal-300">
                          {rec.category}
                        </span>
                        <span className="text-[10px] font-medium uppercase text-[var(--fcs-ink-muted)]">
                          {rec.status}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold">{rec.title}</h3>
                      <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">{rec.description}</p>
                      {expandedWhyId === rec.id && (
                        <p className="mt-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2.5 text-[11px] text-[var(--fcs-ink-muted)]">
                          <span className="font-semibold text-[var(--fcs-ink)]">Why generated: </span>
                          {rec.rationale}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--fcs-border)] pt-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateRecommendation(
                              rec.id,
                              { status: "accepted" },
                              rec.action_payload?.href
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800"
                        >
                          <Check className="h-3 w-3" /> Open &amp; Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRecommendation(rec.id, { status: "saved" })}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1 text-[11px] font-medium hover:border-teal-600/40"
                        >
                          <Bookmark className="h-3 w-3" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRecommendation(rec.id, { status: "dismissed" })}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1 text-[11px] font-medium text-[var(--fcs-ink-muted)] hover:text-red-600"
                        >
                          <X className="h-3 w-3" /> Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedWhyId(expandedWhyId === rec.id ? null : rec.id)
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[var(--fcs-ink-muted)] hover:underline"
                        >
                          <HelpCircle className="h-3 w-3" /> Why?
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Helpful"
                          onClick={() => updateRecommendation(rec.id, { feedback: "helpful" })}
                          className={`rounded p-1 ${
                            rec.feedback === "helpful"
                              ? "text-teal-600"
                              : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Not helpful"
                          onClick={() => updateRecommendation(rec.id, { feedback: "not_helpful" })}
                          className={`rounded p-1 ${
                            rec.feedback === "not_helpful"
                              ? "text-red-600"
                              : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                          }`}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: DESIGN PROJECTS */}
      {activeTab === "projects" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <FolderOpen className="h-4 w-4 text-teal-600" /> Personal Certificate Design Projects
            </h2>
            <SafeNavLink
              href="/certificate-builder/new"
              className="rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              + New Project
            </SafeNavLink>
          </div>
          {projects.length === 0 ? (
            <p className="py-10 text-center text-xs text-[var(--fcs-ink-muted)]">
              No saved design projects yet. Open Certificate Studio and click &ldquo;Save Project&rdquo;!
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        {p.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-[var(--fcs-ink-muted)]">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="mt-2 font-bold">{p.title}</h3>
                    <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
                      {p.template_slug} • {p.orientation}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--fcs-border)] pt-3">
                    <SafeNavLink
                      href={`/certificate-builder/new?project=${p.id}`}
                      className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                    >
                      Open in Studio →
                    </SafeNavLink>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => deleteProject(p.id)}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: ISSUED CERTIFICATES */}
      {activeTab === "certificates" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Award className="h-4 w-4 text-amber-600" /> Official Issued Certificates
            </h2>
            {hasApprovedOrg ? (
              <SafeNavLink
                href="/certificate-builder/new"
                className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
              >
                + Issue Certificate
              </SafeNavLink>
            ) : (
              <SafeNavLink href="/verify" className="text-xs font-semibold text-amber-700 hover:underline">
                Apply for Official Issuance →
              </SafeNavLink>
            )}
          </div>
          {certificates.length === 0 ? (
            <p className="py-10 text-center text-xs text-[var(--fcs-ink-muted)]">
              {hasApprovedOrg
                ? "No saved official certificates yet."
                : "Official verified certificates unlock once your organization is approved by Admin."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {certificates.map((c) => {
                const verRel = Array.isArray(c.fcs_certificate_verifications)
                  ? c.fcs_certificate_verifications[0]
                  : c.fcs_certificate_verifications;
                const isVerified = verRel?.verification_status === "verified";
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SafeNavLink
                          href={`/certificate-builder/${c.id}`}
                          className="block truncate text-sm font-semibold hover:text-teal-700"
                        >
                          {c.title}
                        </SafeNavLink>
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Officially Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {verRel?.verification_status || "Draft"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                        {c.recipient_name} • <span className="font-mono">{c.certificate_code}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <SafeNavLink
                        href={`/certificate-builder/${c.id}`}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-xs font-medium"
                      >
                        Edit
                      </SafeNavLink>
                      <SafeNavLink
                        href={`/verify/${c.certificate_code}`}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-teal-600"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </SafeNavLink>
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => deleteCertificate(c.id)}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* TAB 4: RESUMES */}
      {activeTab === "resumes" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <FileText className="h-4 w-4 text-teal-600" /> Resumes &amp; CVs
            </h2>
            <SafeNavLink
              href="/resume-builder/new"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              + Create Resume
            </SafeNavLink>
          </div>
          {resumes.length === 0 ? (
            <p className="py-10 text-center text-xs text-[var(--fcs-ink-muted)]">
              No saved resumes yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {resumes.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3.5"
                >
                  <div className="min-w-0">
                    <SafeNavLink
                      href={`/resume-builder/${r.id}`}
                      className="block truncate text-sm font-semibold hover:text-teal-700"
                    >
                      {r.title}
                    </SafeNavLink>
                    <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                      Template: {r.template_slug}
                      {r.ats_score !== null ? ` • Quality/ATS: ${r.ats_score}%` : ""} • Downloads:{" "}
                      {r.download_count}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SafeNavLink
                      href={`/resume-builder/${r.id}`}
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-xs font-medium"
                    >
                      Edit
                    </SafeNavLink>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => duplicateResume(r)}
                      title="Duplicate"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => deleteResume(r.id)}
                      title="Delete"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* TAB 5: TEMPLATES & FAVORITES */}
      {activeTab === "templates" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Heart className="h-4 w-4 text-rose-500" /> Favorite &amp; Recently Used Templates
            </h2>
            <SafeNavLink href="/certificate-builder" className="text-xs font-semibold text-teal-700 hover:underline">
              Browse all 124 Cert Templates →
            </SafeNavLink>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <SafeNavLink
                key={fav.id}
                href={`/certificate-builder/new?template=${fav.template_slug}`}
                className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 text-xs hover:border-teal-600/40"
              >
                <div>
                  <p className="font-bold">{fav.template_slug.replace(/-/g, " ")}</p>
                  <p className="text-[10px] text-[var(--fcs-ink-muted)]">Used {fav.use_count} times</p>
                </div>
                {fav.is_favorite && <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />}
              </SafeNavLink>
            ))}
          </div>
          <div className="grid gap-4 pt-3 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-[var(--fcs-ink-muted)]">
                Quick Resume Templates
              </h3>
              <div className="space-y-1.5">
                {props.resumeTemplates.slice(0, 5).map((t) => (
                  <SafeNavLink
                    key={t.id}
                    href={`/resume-builder/new?template=${t.slug}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--fcs-border)] px-3 py-2 text-xs hover:border-teal-600/40"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-[10px] uppercase text-[var(--fcs-ink-muted)]">Resume</span>
                  </SafeNavLink>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-[var(--fcs-ink-muted)]">
                Quick Certificate Templates
              </h3>
              <div className="space-y-1.5">
                {props.certTemplates.slice(0, 5).map((t) => (
                  <SafeNavLink
                    key={t.id}
                    href={`/certificate-builder/new?template=${t.slug}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--fcs-border)] px-3 py-2 text-xs hover:border-teal-600/40"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-[10px] uppercase text-[var(--fcs-ink-muted)]">Cert</span>
                  </SafeNavLink>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: STAMPS & SEALS */}
      {activeTab === "stamps" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Stamp className="h-4 w-4 text-teal-600" /> Saved Official &amp; Sample Stamps
            </h2>
            <SafeNavLink
              href="/stamps"
              className="rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              Open Stamp Studio →
            </SafeNavLink>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {officialStamps.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-emerald-500/30 bg-[var(--fcs-surface-muted)] p-3 text-center"
              >
                <div className="flex h-20 items-center justify-center rounded-lg bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.preview_url} alt={s.name} className="max-h-16 w-auto" />
                </div>
                <p className="mt-2 truncate text-xs font-bold">{s.name}</p>
                <span className="text-[10px] font-semibold uppercase text-emerald-700">Official</span>
              </div>
            ))}
            {sampleStamps.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-amber-500/30 bg-[var(--fcs-surface-muted)] p-3 text-center"
              >
                <div className="flex h-20 items-center justify-center rounded-lg bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.preview_url} alt={s.name} className="max-h-16 w-auto" />
                </div>
                <p className="mt-2 truncate text-xs font-bold">{s.name}</p>
                <div className="mt-1 flex items-center justify-center gap-2 text-[10px]">
                  <span className="font-semibold uppercase text-amber-700">
                    {s.is_official_verified ? "Official" : "Sample"}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSampleStamp(s.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 7: SIGNATURES */}
      {activeTab === "signatures" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <PenTool className="h-4 w-4 text-teal-600" /> Digital Signatures Library
            </h2>
            <SafeNavLink
              href="/stamps"
              className="rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              Draw / Manage Signatures →
            </SafeNavLink>
          </div>
          {signatures.length === 0 ? (
            <p className="py-10 text-center text-xs text-[var(--fcs-ink-muted)]">
              No saved signatures yet. Create one inside Stamp Studio or Certificate Studio!
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                >
                  <div className="flex h-20 items-center justify-center rounded-lg bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sig.data_url} alt={sig.signatory_name} className="max-h-16 w-auto" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">{sig.signatory_name}</p>
                      <p className="text-[10px] text-[var(--fcs-ink-muted)]">
                        {sig.signatory_designation || sig.style_preset}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSignature(sig.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 8: BULK BATCHES */}
      {activeTab === "bulk" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <FileSpreadsheet className="h-4 w-4 text-teal-600" /> Bulk Issuance Batches
            </h2>
            <SafeNavLink
              href="/bulk-generator"
              className="rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              Launch Bulk Generator →
            </SafeNavLink>
          </div>
          {bulkBatches.length === 0 ? (
            <p className="py-10 text-center text-xs text-[var(--fcs-ink-muted)]">
              No bulk batches run yet. Upload a CSV or Excel roster in Bulk Generator!
            </p>
          ) : (
            <ul className="space-y-2">
              {bulkBatches.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 text-xs"
                >
                  <div>
                    <p className="font-bold">{b.batch_name}</p>
                    <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                      {b.generated_count} / {b.total_rows} certificates •{" "}
                      {b.template_slug || "certificate"} •{" "}
                      {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      b.is_official_batch
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.is_official_batch ? "Official" : "Sample"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* TAB 9: EXPORT HISTORY */}
      {activeTab === "exports" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Download className="h-4 w-4 text-teal-600" /> Export &amp; Download Telemetry
          </h2>
          {exportEvents.length === 0 ? (
            <p className="py-10 text-center text-xs text-[var(--fcs-ink-muted)]">
              No exports logged yet. Export PDF, 2K/4K PNG, or JPEG from any studio!
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {exportEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-semibold">
                      {ev.file_name || `${ev.document_type} export`}
                    </p>
                    <p className="text-[10px] text-[var(--fcs-ink-muted)]">
                      {ev.resolution_label || ev.format.toUpperCase()} •{" "}
                      {new Date(ev.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded bg-[var(--fcs-surface)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                    {ev.format}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* TAB 10: ORGANIZATION */}
      {activeTab === "organization" && (
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-5 w-5 text-teal-600" />
              <div>
                <h2 className="text-sm font-bold">Authorized Organization Access</h2>
                <p className="text-xs text-[var(--fcs-ink-muted)]">
                  Administrator approval unlocks Verified QR certificate issuance and official seals.
                </p>
              </div>
            </div>
            <SafeNavLink
              href="/verify"
              className="rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              {(props.orgApplications ?? []).length > 0 ? "Manage / Apply →" : "Apply →"}
            </SafeNavLink>
          </div>
          {(props.orgApplications ?? []).length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(props.orgApplications ?? []).map((org) => (
                <div
                  key={org.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{org.organization_name}</p>
                    <p className="truncate text-[11px] text-[var(--fcs-ink-muted)]">
                      {org.contact_email}
                      {org.notes ? ` • ${org.notes}` : ""}
                    </p>
                  </div>
                  {org.verification_status === "approved" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Approved
                    </span>
                  ) : org.verification_status === "pending" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                      <Clock className="h-3 w-3" /> Pending Approval
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase text-red-700">
                      <ShieldAlert className="h-3 w-3" /> {org.verification_status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 11: ACCOUNT, AI & SUPPORT */}
      {activeTab === "account" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <Bot className="h-4 w-4 text-teal-600" /> Recent AI Conversations
              </h2>
              <SafeNavLink href="/assistant" className="text-xs font-semibold text-teal-700 hover:underline">
                Open Assistant
              </SafeNavLink>
            </div>
            {props.aiConversations.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--fcs-ink-muted)]">
                No AI conversations recorded yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {props.aiConversations.map((conv) => (
                  <li
                    key={conv.id}
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
                  >
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="text-[10px] text-[var(--fcs-ink-muted)]">
                      Context: {conv.context_page}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <LifeBuoy className="h-4 w-4 text-teal-600" /> Support Tickets &amp; Settings
              </h2>
              <div className="flex gap-3">
                <SafeNavLink href="/settings" className="text-xs font-semibold text-teal-700 hover:underline">
                  Settings
                </SafeNavLink>
                <SafeNavLink href="/support" className="text-xs font-semibold text-teal-700 hover:underline">
                  Support Center
                </SafeNavLink>
              </div>
            </div>
            {props.tickets.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--fcs-ink-muted)]">
                No support tickets yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {props.tickets.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.subject}</p>
                      <p className="font-mono text-[10px] text-[var(--fcs-ink-muted)]">
                        {t.ticket_number}
                      </p>
                    </div>
                    <span className="rounded bg-[var(--fcs-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
