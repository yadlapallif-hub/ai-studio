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
  FileText,
  FolderLock,
  HelpCircle,
  LifeBuoy,
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

interface Props {
  userName: string;
  aiRecommendationsEnabled: boolean;
  initialResumes: ResumeRow[];
  initialCertificates: CertRow[];
  initialRecommendations: RecRow[];
  resumeTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  certTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  aiConversations: Array<{ id: string; title: string; context_page: string; updated_at: string }>;
  tickets: Array<{ id: string; ticket_number: string; subject: string; status: string; priority: string; updated_at: string }>;
  orgApplications?: OrgAppRow[];
}

export function DashboardClient(props: Props) {
  const router = useRouter();
  const [resumes, setResumes] = useState(props.initialResumes);
  const [certificates, setCertificates] = useState(props.initialCertificates);
  const [recs, setRecs] = useState(props.initialRecommendations);
  const [recsEnabled, setRecsEnabled] = useState(props.aiRecommendationsEnabled);
  const [refreshingRecs, setRefreshingRecs] = useState(false);
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalDocuments = resumes.length + certificates.length;
  const openTicketsCount = props.tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed"
  ).length;
  const hasApprovedOrg = (props.orgApplications ?? []).some(
    (o) => o.verification_status === "approved"
  );

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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header Welcome */}
      <SlideReveal direction="clip">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            Personal Creator Workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Welcome back, {props.userName}
          </h1>
          <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
            Manage your resumes, certificates, private document vault, Creator AI insights,
            and support tickets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <SafeNavLink
            href="/resume-builder/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-3.5 w-3.5" /> New Resume
          </SafeNavLink>
          {hasApprovedOrg ? (
            <>
              <SafeNavLink
                href="/certificate-builder/new"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-2 text-xs font-semibold hover:border-teal-600/40"
              >
                <Plus className="h-3.5 w-3.5" /> New Certificate
              </SafeNavLink>
              <SafeNavLink
                href="/stamps"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
              >
                <Stamp className="h-3.5 w-3.5 text-teal-600" /> Stamps
              </SafeNavLink>
            </>
          ) : (
            <SafeNavLink
              href="/verify"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Request Certificate Access
            </SafeNavLink>
          )}
          <SafeNavLink
            href="/vault"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            <FolderLock className="h-3.5 w-3.5" /> Vault
          </SafeNavLink>
          <SafeNavLink
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </SafeNavLink>
        </div>
      </div>
      </SlideReveal>

      {/* Metrics Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
          <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">Total Documents Created</p>
          <p className="mt-2 text-3xl font-bold">{totalDocuments}</p>
        </div>
        <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
          <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">Saved Resumes</p>
          <p className="mt-2 text-3xl font-bold">{resumes.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
          <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">Saved Certificates</p>
          <p className="mt-2 text-3xl font-bold">{certificates.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
          <p className="text-xs font-medium text-[var(--fcs-ink-muted)]">Open Support Tickets</p>
          <p className="mt-2 text-3xl font-bold">{openTicketsCount}</p>
        </div>
      </div>

      {/* AUTHORIZED ORGANIZATION ACCESS STATUS */}
      <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold">Authorized Organization Access</h2>
              <p className="text-xs text-[var(--fcs-ink-muted)]">
                Administrator approval is required before an organization can issue Verified QR
                certificates or upload official seals.
              </p>
            </div>
          </div>
          <SafeNavLink
            href="/verify"
            className="rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            {(props.orgApplications ?? []).length > 0 ? "Manage / Apply →" : "Apply as Organization →"}
          </SafeNavLink>
        </div>

        {(props.orgApplications ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SafeNavLink
                      href="/stamps"
                      className="inline-flex items-center gap-1 rounded-full bg-teal-700 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-teal-800"
                    >
                      <Stamp className="h-3 w-3" /> Open Stamp Studio
                    </SafeNavLink>
                    <SafeNavLink
                      href="/certificate-builder/new?tab=stamps"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Certificate Studio
                    </SafeNavLink>
                  </div>
                ) : org.verification_status === "pending" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <Clock className="h-3 w-3" /> Pending Admin Approval
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase text-red-700 dark:bg-red-950/60 dark:text-red-300">
                    <ShieldAlert className="h-3 w-3" /> {org.verification_status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CREATOR AI SMART RECOMMENDATIONS */}
      <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fcs-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold">Creator AI Recommendations</h2>
              <p className="text-xs text-[var(--fcs-ink-muted)]">
                Personalized improvements generated from your actual profile and documents. Changes
                never apply automatically without your confirmation.
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
            <span className="font-semibold">Analyze Workspace</span> to scan your latest resumes and
            certificates.
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
                        updateRecommendation(rec.id, { status: "accepted" }, rec.action_payload?.href)
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800"
                    >
                      <Check className="h-3 w-3" /> Open & Apply
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
                      onClick={() => setExpandedWhyId(expandedWhyId === rec.id ? null : rec.id)}
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

      {/* RECENT RESUMES & CERTIFICATES */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <FileText className="h-4 w-4 text-teal-600" /> Recent Resumes
            </h2>
            <SafeNavLink
              href="/resume-builder/new"
              className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              + Create Resume
            </SafeNavLink>
          </div>
          {resumes.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--fcs-ink-muted)]">
              No saved resumes yet. Launch the Resume Builder to create your first CV.
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
                      className="block truncate text-sm font-semibold hover:text-teal-700 dark:hover:text-teal-300"
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
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-xs font-medium hover:border-teal-600/40"
                    >
                      Edit
                    </SafeNavLink>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => duplicateResume(r)}
                      title="Duplicate resume"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => deleteResume(r.id)}
                      title="Delete resume"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-[var(--fcs-ink-muted)] hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Award className="h-4 w-4 text-amber-600" /> Recent Certificates
            </h2>
            {hasApprovedOrg ? (
              <SafeNavLink
                href="/certificate-builder/new"
                className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
              >
                + Create Certificate
              </SafeNavLink>
            ) : (
              <SafeNavLink
                href="/verify"
                className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400"
              >
                Authorized Access Required →
              </SafeNavLink>
            )}
          </div>
          {certificates.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--fcs-ink-muted)]">
              {hasApprovedOrg
                ? "No saved certificates yet. Design one in the Certificate Studio."
                : "Certificate creation unlocks once your Authorized Organization request is approved by an Admin."}
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
                        className="block truncate text-sm font-semibold hover:text-teal-700 dark:hover:text-teal-300"
                      >
                        {c.title}
                      </SafeNavLink>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                      {c.recipient_name} •{" "}
                      <span className="font-mono">{c.certificate_code}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SafeNavLink
                      href={`/certificate-builder/${c.id}`}
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-xs font-medium hover:border-teal-600/40"
                    >
                      Edit
                    </SafeNavLink>
                    <SafeNavLink
                      href={`/verify/${c.certificate_code}`}
                      title="View Verification Status"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-teal-600"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </SafeNavLink>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => deleteCertificate(c.id)}
                      title="Delete certificate"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-[var(--fcs-ink-muted)] hover:text-red-600"
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
      </div>

      {/* TEMPLATES + AI CONVERSATIONS + SUPPORT TICKETS */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
          <h2 className="text-sm font-bold">Available Templates</h2>
          <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
            Jump directly into curated studio layouts.
          </p>
          <div className="mt-3 space-y-1.5">
            {props.resumeTemplates.slice(0, 4).map((t) => (
              <SafeNavLink
                key={t.id}
                href={`/resume-builder/new?template=${t.slug}`}
                className="flex items-center justify-between rounded-lg border border-[var(--fcs-border)] px-3 py-2 text-xs hover:border-teal-600/40"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-[10px] uppercase text-[var(--fcs-ink-muted)]">Resume</span>
              </SafeNavLink>
            ))}
            {props.certTemplates.slice(0, 3).map((t) => (
              <SafeNavLink
                key={t.id}
                href={hasApprovedOrg ? `/certificate-builder/new?template=${t.slug}` : "/certificate-builder"}
                className="flex items-center justify-between rounded-lg border border-[var(--fcs-border)] px-3 py-2 text-xs hover:border-amber-600/40"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-[10px] uppercase text-[var(--fcs-ink-muted)]">
                  {hasApprovedOrg ? "Cert" : "Auth Only"}
                </span>
              </SafeNavLink>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Bot className="h-4 w-4 text-teal-600" /> Recent AI Conversations
            </h2>
            <SafeNavLink href="/assistant" className="text-xs font-semibold text-teal-700 hover:underline">
              Open
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
              <LifeBuoy className="h-4 w-4 text-teal-600" /> Support Tickets
            </h2>
            <SafeNavLink href="/support" className="text-xs font-semibold text-teal-700 hover:underline">
              Support Center
            </SafeNavLink>
          </div>
          {props.tickets.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--fcs-ink-muted)]">
              No support tickets or live chats yet.
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
    </div>
  );
}
