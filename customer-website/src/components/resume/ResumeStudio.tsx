"use client";

import React, { useMemo, useRef, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useRouter } from "next/navigation";
import {
  analyzeResumeQuality,
  createEmptyResumeData,
  createSampleStarterResumeData,
  getResumeTemplateLayout,
  type ResumeData,
  type ResumeQualityReport,
  type ResumeSectionKey,
  type ResumeStyleConfig,
} from "@francis/shared";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileDown,
  GripVertical,
  Loader2,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ResumeRenderer } from "./ResumeRenderer";
import { PhotoEditorModal, type EditedPhotoResult } from "../studio/PhotoEditorModal";
import {
  exportElementAsA4Pdf,
  exportElementAsPng,
  logDocumentExport,
} from "@/lib/exportHelpers";

interface TemplateOption {
  id: string;
  slug: string;
  name: string;
  category: string;
  is_ats_friendly: boolean;
  description: string;
  layout_config?: Record<string, unknown>;
}

interface ResumeStudioProps {
  initialResumeId: string | null;
  initialTitle: string;
  initialTemplateSlug: string;
  initialTargetRole: string;
  initialData: ResumeData;
  initialStyle: ResumeStyleConfig;
  templates: TemplateOption[];
  isAuthenticated: boolean;
}

const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "Professional Summary",
  careerObjective: "Career Objective",
  experience: "Work Experience",
  internships: "Internships",
  projects: "Projects",
  education: "Education",
  technicalSkills: "Technical Skills",
  softSkills: "Soft Skills",
  certifications: "Certifications",
  achievements: "Achievements",
  languages: "Languages",
  references: "References",
};

const ACCENT_SWATCHES = [
  "#0F766E",
  "#1E293B",
  "#0369A1",
  "#1D4ED8",
  "#B45309",
  "#7C2D12",
  "#111827",
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ResumeStudio(props: ResumeStudioProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [resumeId, setResumeId] = useState<string | null>(props.initialResumeId);
  const [title, setTitle] = useState(props.initialTitle);
  const [templateSlug, setTemplateSlug] = useState(props.initialTemplateSlug);
  const [targetRole, setTargetRole] = useState(props.initialTargetRole);
  const [data, setData] = useState<ResumeData>(props.initialData);
  const [style, setStyle] = useState<ResumeStyleConfig>(props.initialStyle);

  const [activeTab, setActiveTab] = useState<"content" | "layout" | "ai">("content");
  const [activeSection, setActiveSection] = useState<string>("personal");
  const [zoom, setZoom] = useState<number>(0.78);
  const [dragKey, setDragKey] = useState<ResumeSectionKey | null>(null);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Skill tag inputs
  const [techSkillInput, setTechSkillInput] = useState("");
  const [softSkillInput, setSoftSkillInput] = useState("");

  // AI & ATS Analysis
  const [jobDescription, setJobDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    mode: string;
    label: string;
    text: string;
  } | null>(null);

  const qualityReport: ResumeQualityReport = useMemo(
    () => analyzeResumeQuality(data, style, jobDescription),
    [data, style, jobDescription]
  );

  const handleSave = async () => {
    setErrorMsg(null);
    setStatusMsg(null);

    if (!props.isAuthenticated) {
      localStorage.setItem(
        "fcs-unsaved-resume",
        JSON.stringify({ title, templateSlug, targetRole, data, style })
      );
      setStatusMsg("Draft saved locally in your browser. Sign in to save to your cloud Vault.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("Please sign in to save documents.");
        return;
      }

      const payload = {
        user_id: user.id,
        title: title.trim() || "Untitled Resume",
        template_slug: templateSlug,
        target_role: targetRole.trim() || null,
        data,
        style_config: style,
        ats_score: qualityReport.atsReadiness,
        quality_report: qualityReport,
      };

      if (resumeId) {
        const { error } = await supabase
          .from("fcs_resumes")
          .update(payload)
          .eq("id", resumeId)
          .eq("user_id", user.id);
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        setStatusMsg("Resume saved to cloud workspace.");
      } else {
        const { data: inserted, error } = await supabase
          .from("fcs_resumes")
          .insert(payload)
          .select("id")
          .single();
        if (error || !inserted) {
          setErrorMsg(error?.message || "Failed to create resume.");
          return;
        }
        setResumeId(inserted.id);
        setStatusMsg("Resume created and saved to cloud workspace.");
        router.replace(`/resume-builder/${inserted.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!props.isAuthenticated || !resumeId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: copy, error } = await supabase
        .from("fcs_resumes")
        .insert({
          user_id: user.id,
          title: `${title} (Copy)`,
          template_slug: templateSlug,
          target_role: targetRole || null,
          data,
          style_config: style,
          ats_score: qualityReport.atsReadiness,
          quality_report: qualityReport,
        })
        .select("id")
        .single();
      if (!error && copy) {
        router.push(`/resume-builder/${copy.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resumeId || !props.isAuthenticated) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("fcs_resumes").delete().eq("id", resumeId);
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async (saveToVault = false) => {
    if (!previewRef.current) return;
    setExporting(true);
    setErrorMsg(null);
    try {
      const safeName = `${(title || "resume").replace(/[^a-z0-9-_]+/gi, "_")}.pdf`;
      const blob = await exportElementAsA4Pdf(previewRef.current, safeName, "portrait");
      if (resumeId) await logDocumentExport("resume", resumeId, "pdf");

      if (saveToVault && props.isAuthenticated) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const path = `${user.id}/exports/${Date.now()}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from("fcs-vault")
            .upload(path, blob, { contentType: "application/pdf", upsert: false });
          if (!upErr) {
            await supabase.from("fcs_uploaded_assets").insert({
              user_id: user.id,
              asset_type: "exported_pdf",
              file_name: safeName,
              storage_bucket: "fcs-vault",
              storage_path: path,
              mime_type: "application/pdf",
              file_size: blob.size,
            });
            setStatusMsg("PDF exported and archived to your Document Vault.");
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    setErrorMsg(null);
    try {
      const safeName = `${(title || "resume").replace(/[^a-z0-9-_]+/gi, "_")}.png`;
      await exportElementAsPng(previewRef.current, safeName);
      if (resumeId) await logDocumentExport("resume", resumeId, "png");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleApplyPhoto = async (result: EditedPhotoResult) => {
    const finalUrl = result.dataUrl;
    let assetPath: string | undefined;

    if (props.isAuthenticated) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const fileName = `profile-${Date.now()}.png`;
        const path = `${user.id}/photos/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from("fcs-vault")
          .upload(path, result.blob, { contentType: "image/png", upsert: false });
        if (!upErr) {
          assetPath = path;
          await supabase.from("fcs_uploaded_assets").insert({
            user_id: user.id,
            asset_type: "profile_photo",
            file_name: fileName,
            storage_bucket: "fcs-vault",
            storage_path: path,
            mime_type: "image/png",
            file_size: result.blob.size,
          });
        }
      }
    }

    setData((prev) => ({
      ...prev,
      profilePhoto: {
        ...prev.profilePhoto,
        url: finalUrl,
        assetPath,
        shape: result.shape === "id_card" ? "square" : result.shape,
        brightness: 100,
        contrast: 100,
        rotation: 0,
        zoom: 1,
        bgRemoved: result.bgRemoved,
      },
    }));
    setStyle((prev) => ({ ...prev, showPhoto: true }));
    setStatusMsg("Profile photo processed and applied.");
  };

  const moveSection = (key: ResumeSectionKey, dir: -1 | 1) => {
    setStyle((prev) => {
      const order = [...prev.sectionOrder];
      const idx = order.indexOf(key);
      const nextIdx = idx + dir;
      if (idx < 0 || nextIdx < 0 || nextIdx >= order.length) return prev;
      [order[idx], order[nextIdx]] = [order[nextIdx], order[idx]];
      return { ...prev, sectionOrder: order };
    });
  };

  const dropSection = (targetKey: ResumeSectionKey) => {
    if (!dragKey || dragKey === targetKey) return;
    setStyle((prev) => {
      const order = [...prev.sectionOrder];
      const fromIdx = order.indexOf(dragKey);
      const toIdx = order.indexOf(targetKey);
      if (fromIdx < 0 || toIdx < 0) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragKey);
      return { ...prev, sectionOrder: order };
    });
    setDragKey(null);
  };

  const toggleSectionVisibility = (key: ResumeSectionKey) => {
    setStyle((prev) => {
      const hidden = new Set(prev.hiddenSections);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      return { ...prev, hiddenSections: Array.from(hidden) };
    });
  };

  const runAiTask = async (
    mode:
      | "resume_summary"
      | "resume_objective"
      | "resume_improve"
      | "resume_grammar"
      | "resume_skills"
      | "resume_ats_optimize"
      | "resume_jd_match",
    label: string,
    prompt: string
  ) => {
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          contextPage: "Resume Studio",
          contextDocumentId: resumeId ?? undefined,
          contextData: { title, targetRole, data },
          jobDescription: jobDescription || undefined,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const json = (await res.json()) as { reply?: string; message?: string };
      if (!res.ok || !json.reply) {
        setAiError(
          json.message ||
            "Creator AI requires sign-in for personalized resume editing."
        );
        return;
      }
      setAiSuggestion({ mode, label, text: json.reply });
    } catch {
      setAiError("Network error communicating with Creator AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.mode === "resume_summary") {
      setData((prev) => ({ ...prev, summary: aiSuggestion.text.trim() }));
      setStatusMsg("AI summary applied.");
    } else if (aiSuggestion.mode === "resume_objective") {
      setData((prev) => ({ ...prev, careerObjective: aiSuggestion.text.trim() }));
      setStatusMsg("AI career objective applied.");
    } else {
      navigator.clipboard?.writeText(aiSuggestion.text);
      setStatusMsg("AI suggestion copied to clipboard for manual review.");
    }
    setAiSuggestion(null);
  };

  return (
    <div className="min-h-screen bg-[var(--fcs-bg)]">
      {/* Studio Top Toolbar */}
      <div className="no-print border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SafeNavLink
              href="/resume-builder"
              className="rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
            >
              ← Gallery
            </SafeNavLink>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Resume title"
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-sm font-semibold outline-none focus:border-teal-600"
            />
            <select
              value={templateSlug}
              onChange={(e) => {
                const nextSlug = e.target.value;
                setTemplateSlug(nextSlug);
                const layout = getResumeTemplateLayout(nextSlug);
                setStyle((prev) => ({
                  ...prev,
                  fontFamily: layout.fontFamily || prev.fontFamily,
                  accentColor: layout.accent || prev.accentColor,
                  showPhoto: layout.photoSupported,
                }));
              }}
              aria-label="Select resume template"
              className="max-w-[230px] rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-medium outline-none focus:border-teal-600"
            >
              {props.templates.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} {t.is_ats_friendly ? "(ATS)" : "(Visual)"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>{props.isAuthenticated ? "Save" : "Save Draft"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportPdf(false)}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold hover:border-teal-600/50"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold hover:border-teal-600/50"
            >
              <Download className="h-3.5 w-3.5" /> PNG
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <Printer className="h-3.5 w-3.5" /> Print A4
            </button>
            {props.isAuthenticated && resumeId && (
              <>
                <button
                  type="button"
                  onClick={() => handleExportPdf(true)}
                  disabled={exporting}
                  className="rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  Archive PDF to Vault
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  title="Duplicate resume"
                  className="rounded-lg border border-[var(--fcs-border)] p-1.5 text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete resume"
                  className="rounded-lg border border-[var(--fcs-border)] p-1.5 text-[var(--fcs-ink-muted)] hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {!props.isAuthenticated && (
        <div className="no-print border-b border-amber-500/20 bg-amber-50/90 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Visitor Preview Mode: All editing & exports work for free.{" "}
          <SafeNavLink href="/auth/login?next=/resume-builder" className="font-semibold underline">
            Sign in or create a free account
          </SafeNavLink>{" "}
          to save multiple resumes & photos to your cloud Document Vault.
        </div>
      )}

      {(statusMsg || errorMsg) && (
        <div className="no-print mx-auto mt-3 max-w-[1500px] px-4 sm:px-6">
          {statusMsg && (
            <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Main Split Studio */}
      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* LEFT INSPECTOR */}
        <div className="no-print space-y-4 lg:col-span-5">
          <div className="flex rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1 text-xs font-semibold">
            {[
              { id: "content", label: "14 Sections" },
              { id: "layout", label: "Drag & Style" },
              { id: "ai", label: `Creator AI • ATS ${qualityReport.atsReadiness}%` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "content" | "layout" | "ai")}
                className={`flex-1 rounded-lg py-2 transition ${
                  activeTab === tab.id
                    ? "bg-teal-700 text-white"
                    : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* CONTENT TAB */}
          {activeTab === "content" && (
            <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
              <div className="mb-3 flex items-center justify-between border-b border-[var(--fcs-border)] pb-3">
                <div className="flex flex-wrap gap-1">
                  {[
                    ["personal", "Personal"],
                    ["photo", "Photo"],
                    ["summary", "Summary"],
                    ["objective", "Objective"],
                    ["experience", "Experience"],
                    ["internships", "Internships"],
                    ["projects", "Projects"],
                    ["education", "Education"],
                    ["skills", "Skills"],
                    ["certifications", "Certs"],
                    ["languages", "Languages"],
                    ["achievements", "Awards"],
                    ["references", "References"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                        activeSection === id
                          ? "bg-teal-700 text-white"
                          : "bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setData(createSampleStarterResumeData())}
                  className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  Load Starter Example
                </button>
                <span className="text-[var(--fcs-border)]">|</span>
                <button
                  type="button"
                  onClick={() => setData(createEmptyResumeData())}
                  className="font-medium text-[var(--fcs-ink-muted)] hover:text-red-600"
                >
                  Clear All Fields
                </button>
              </div>

              {/* PERSONAL INFO */}
              {activeSection === "personal" && (
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-semibold">Full Name</label>
                    <input
                      type="text"
                      value={data.personalInfo.fullName}
                      onChange={(e) =>
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, fullName: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-semibold">Target Role / Headline</label>
                    <input
                      type="text"
                      value={data.personalInfo.headline}
                      onChange={(e) => {
                        setTargetRole(e.target.value);
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, headline: e.target.value },
                        });
                      }}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Email</label>
                    <input
                      type="email"
                      value={data.personalInfo.email}
                      onChange={(e) =>
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, email: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Phone</label>
                    <input
                      type="text"
                      value={data.personalInfo.phone}
                      onChange={(e) =>
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, phone: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Location</label>
                    <input
                      type="text"
                      value={data.personalInfo.location}
                      onChange={(e) =>
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, location: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Website / Portfolio</label>
                    <input
                      type="text"
                      value={data.personalInfo.website || ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, website: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">LinkedIn</label>
                    <input
                      type="text"
                      value={data.personalInfo.linkedin || ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, linkedin: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">GitHub</label>
                    <input
                      type="text"
                      value={data.personalInfo.github || ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          personalInfo: { ...data.personalInfo, github: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {/* PROFILE PHOTO */}
              {activeSection === "photo" && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4">
                    <div>
                      <p className="font-semibold">Include Profile Photo in Template</p>
                      <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                        Toggle photo display and open the crop/rotate/background-removal studio.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={style.showPhoto}
                      onChange={(e) => setStyle({ ...style, showPhoto: e.target.checked })}
                      className="h-4 w-4 accent-teal-700"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(["left", "right", "top"] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            profilePhoto: { ...data.profilePhoto, position: pos },
                          })
                        }
                        className={`rounded-lg border py-2 font-semibold capitalize ${
                          data.profilePhoto.position === pos
                            ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                            : "border-[var(--fcs-border)]"
                        }`}
                      >
                        Align {pos}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 font-semibold text-white hover:bg-teal-800"
                  >
                    <Camera className="h-4 w-4" />
                    {data.profilePhoto.url ? "Edit Profile Photo & Background" : "Upload & Edit Photo"}
                  </button>
                </div>
              )}

              {/* SUMMARY */}
              {activeSection === "summary" && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold">Professional Summary</label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("ai");
                        runAiTask(
                          "resume_summary",
                          "Suggested Professional Summary",
                          `Write a crisp 3-sentence ATS-friendly professional summary for this resume targeting "${targetRole || data.personalInfo.headline || "Software Developer"}". Return ONLY the summary paragraph.`
                        );
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-400"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> AI Generate Summary
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={data.summary}
                    onChange={(e) => setData({ ...data, summary: e.target.value })}
                    placeholder="Summarize your experience, technical specialization, and measurable achievements..."
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 outline-none focus:border-teal-600"
                  />
                </div>
              )}

              {/* CAREER OBJECTIVE */}
              {activeSection === "objective" && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold">Career Objective</label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("ai");
                        runAiTask(
                          "resume_objective",
                          "Suggested Career Objective",
                          `Write a concise 2-sentence career objective for an applicant targeting "${targetRole || data.personalInfo.headline || "Entry-Level Role"}". Return ONLY the career objective paragraph.`
                        );
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-400"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> AI Generate Objective
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={data.careerObjective}
                    onChange={(e) => setData({ ...data, careerObjective: e.target.value })}
                    placeholder="Ideal for freshers, graduates, or career transitioners stating target role & value..."
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 outline-none focus:border-teal-600"
                  />
                </div>
              )}

              {/* WORK EXPERIENCE */}
              {activeSection === "experience" && (
                <div className="space-y-3 text-xs">
                  {data.experience.map((exp, idx) => (
                    <div
                      key={exp.id}
                      className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Role #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setData({
                              ...data,
                              experience: data.experience.filter((e) => e.id !== exp.id),
                            })
                          }
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Job Title"
                          value={exp.role}
                          onChange={(e) => {
                            const next = [...data.experience];
                            next[idx] = { ...exp, role: e.target.value };
                            setData({ ...data, experience: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Company"
                          value={exp.company}
                          onChange={(e) => {
                            const next = [...data.experience];
                            next[idx] = { ...exp, company: e.target.value };
                            setData({ ...data, experience: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Start (e.g. Jan 2024)"
                          value={exp.startDate}
                          onChange={(e) => {
                            const next = [...data.experience];
                            next[idx] = { ...exp, startDate: e.target.value };
                            setData({ ...data, experience: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="End / Present"
                          value={exp.endDate}
                          onChange={(e) => {
                            const next = [...data.experience];
                            next[idx] = { ...exp, endDate: e.target.value, current: false };
                            setData({ ...data, experience: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Bullet points (one per line)"
                        value={exp.bullets.join("\n")}
                        onChange={(e) => {
                          const next = [...data.experience];
                          next[idx] = { ...exp, bullets: e.target.value.split("\n") };
                          setData({ ...data, experience: next });
                        }}
                        className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        experience: [
                          ...data.experience,
                          {
                            id: uid("exp"),
                            company: "",
                            role: "",
                            location: "",
                            startDate: "",
                            endDate: "",
                            current: false,
                            bullets: [""],
                          },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold hover:border-teal-600/50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Work Experience
                  </button>
                </div>
              )}

              {/* INTERNSHIPS */}
              {activeSection === "internships" && (
                <div className="space-y-3 text-xs">
                  {data.internships.map((item, idx) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold">Internship #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setData({
                              ...data,
                              internships: data.internships.filter((x) => x.id !== item.id),
                            })
                          }
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Intern Role"
                          value={item.role}
                          onChange={(e) => {
                            const next = [...data.internships];
                            next[idx] = { ...item, role: e.target.value };
                            setData({ ...data, internships: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Organization"
                          value={item.organization}
                          onChange={(e) => {
                            const next = [...data.internships];
                            next[idx] = { ...item, organization: e.target.value };
                            setData({ ...data, internships: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Duration"
                          value={item.duration}
                          onChange={(e) => {
                            const next = [...data.internships];
                            next[idx] = { ...item, duration: e.target.value };
                            setData({ ...data, internships: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Location"
                          value={item.location}
                          onChange={(e) => {
                            const next = [...data.internships];
                            next[idx] = { ...item, location: e.target.value };
                            setData({ ...data, internships: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Key contributions (one per line)"
                        value={item.highlights.join("\n")}
                        onChange={(e) => {
                          const next = [...data.internships];
                          next[idx] = { ...item, highlights: e.target.value.split("\n") };
                          setData({ ...data, internships: next });
                        }}
                        className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        internships: [
                          ...data.internships,
                          {
                            id: uid("int"),
                            organization: "",
                            role: "",
                            duration: "",
                            location: "",
                            highlights: [""],
                          },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Internship
                  </button>
                </div>
              )}

              {/* PROJECTS */}
              {activeSection === "projects" && (
                <div className="space-y-3 text-xs">
                  {data.projects.map((proj, idx) => (
                    <div
                      key={proj.id}
                      className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold">Project #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setData({
                              ...data,
                              projects: data.projects.filter((x) => x.id !== proj.id),
                            })
                          }
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Project Name"
                          value={proj.name}
                          onChange={(e) => {
                            const next = [...data.projects];
                            next[idx] = { ...proj, name: e.target.value };
                            setData({ ...data, projects: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Your Role"
                          value={proj.role}
                          onChange={(e) => {
                            const next = [...data.projects];
                            next[idx] = { ...proj, role: e.target.value };
                            setData({ ...data, projects: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="GitHub / Live URL"
                          value={proj.url || ""}
                          onChange={(e) => {
                            const next = [...data.projects];
                            next[idx] = { ...proj, url: e.target.value };
                            setData({ ...data, projects: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Tech stack (comma separated)"
                          value={proj.techStack.join(", ")}
                          onChange={(e) => {
                            const next = [...data.projects];
                            next[idx] = {
                              ...proj,
                              techStack: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            };
                            setData({ ...data, projects: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Short description"
                        value={proj.description}
                        onChange={(e) => {
                          const next = [...data.projects];
                          next[idx] = { ...proj, description: e.target.value };
                          setData({ ...data, projects: next });
                        }}
                        className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2"
                      />
                      <textarea
                        rows={2}
                        placeholder="Highlights (one per line)"
                        value={proj.highlights.join("\n")}
                        onChange={(e) => {
                          const next = [...data.projects];
                          next[idx] = { ...proj, highlights: e.target.value.split("\n") };
                          setData({ ...data, projects: next });
                        }}
                        className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        projects: [
                          ...data.projects,
                          {
                            id: uid("proj"),
                            name: "",
                            role: "",
                            url: "",
                            techStack: [],
                            description: "",
                            highlights: [],
                          },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Project
                  </button>
                </div>
              )}

              {/* EDUCATION */}
              {activeSection === "education" && (
                <div className="space-y-3 text-xs">
                  {data.education.map((edu, idx) => (
                    <div
                      key={edu.id}
                      className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold">Education #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setData({
                              ...data,
                              education: data.education.filter((x) => x.id !== edu.id),
                            })
                          }
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Institution"
                          value={edu.institution}
                          onChange={(e) => {
                            const next = [...data.education];
                            next[idx] = { ...edu, institution: e.target.value };
                            setData({ ...data, education: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Degree"
                          value={edu.degree}
                          onChange={(e) => {
                            const next = [...data.education];
                            next[idx] = { ...edu, degree: e.target.value };
                            setData({ ...data, education: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Field of Study"
                          value={edu.field}
                          onChange={(e) => {
                            const next = [...data.education];
                            next[idx] = { ...edu, field: e.target.value };
                            setData({ ...data, education: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="GPA / Grade"
                          value={edu.gpa || ""}
                          onChange={(e) => {
                            const next = [...data.education];
                            next[idx] = { ...edu, gpa: e.target.value };
                            setData({ ...data, education: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Start Year"
                          value={edu.startDate}
                          onChange={(e) => {
                            const next = [...data.education];
                            next[idx] = { ...edu, startDate: e.target.value };
                            setData({ ...data, education: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="End Year"
                          value={edu.endDate}
                          onChange={(e) => {
                            const next = [...data.education];
                            next[idx] = { ...edu, endDate: e.target.value };
                            setData({ ...data, education: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        education: [
                          ...data.education,
                          {
                            id: uid("edu"),
                            institution: "",
                            degree: "",
                            field: "",
                            startDate: "",
                            endDate: "",
                            gpa: "",
                          },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Education
                  </button>
                </div>
              )}

              {/* TECHNICAL & SOFT SKILLS */}
              {activeSection === "skills" && (
                <div className="space-y-5 text-xs">
                  <div>
                    <label className="mb-1.5 block font-semibold">Technical Skills</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={techSkillInput}
                        onChange={(e) => setTechSkillInput(e.target.value)}
                        placeholder="Add skill (e.g. Python, Docker)"
                        className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const s = techSkillInput.trim();
                          if (s) {
                            setData({ ...data, technicalSkills: [...data.technicalSkills, s] });
                            setTechSkillInput("");
                          }
                        }}
                        className="rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.technicalSkills.map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-0.5"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              setData({
                                ...data,
                                technicalSkills: data.technicalSkills.filter((_, idx) => idx !== i),
                              })
                            }
                            className="text-[var(--fcs-ink-muted)] hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block font-semibold">Soft Skills</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={softSkillInput}
                        onChange={(e) => setSoftSkillInput(e.target.value)}
                        placeholder="Add soft skill (e.g. Technical Writing)"
                        className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const s = softSkillInput.trim();
                          if (s) {
                            setData({ ...data, softSkills: [...data.softSkills, s] });
                            setSoftSkillInput("");
                          }
                        }}
                        className="rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.softSkills.map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-0.5"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              setData({
                                ...data,
                                softSkills: data.softSkills.filter((_, idx) => idx !== i),
                              })
                            }
                            className="text-[var(--fcs-ink-muted)] hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CERTIFICATIONS */}
              {activeSection === "certifications" && (
                <div className="space-y-3 text-xs">
                  {data.certifications.map((cert, idx) => (
                    <div
                      key={cert.id}
                      className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                    >
                      <input
                        type="text"
                        placeholder="Certification Name"
                        value={cert.name}
                        onChange={(e) => {
                          const next = [...data.certifications];
                          next[idx] = { ...cert, name: e.target.value };
                          setData({ ...data, certifications: next });
                        }}
                        className="col-span-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Issuer"
                        value={cert.issuer}
                        onChange={(e) => {
                          const next = [...data.certifications];
                          next[idx] = { ...cert, issuer: e.target.value };
                          setData({ ...data, certifications: next });
                        }}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Date / Year"
                        value={cert.date}
                        onChange={(e) => {
                          const next = [...data.certifications];
                          next[idx] = { ...cert, date: e.target.value };
                          setData({ ...data, certifications: next });
                        }}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            certifications: data.certifications.filter((x) => x.id !== cert.id),
                          })
                        }
                        className="col-span-2 text-right text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        certifications: [
                          ...data.certifications,
                          { id: uid("cert"), name: "", issuer: "", date: "" },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Certification
                  </button>
                </div>
              )}

              {/* LANGUAGES */}
              {activeSection === "languages" && (
                <div className="space-y-3 text-xs">
                  {data.languages.map((lang, idx) => (
                    <div key={lang.id} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Language"
                        value={lang.language}
                        onChange={(e) => {
                          const next = [...data.languages];
                          next[idx] = { ...lang, language: e.target.value };
                          setData({ ...data, languages: next });
                        }}
                        className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Proficiency (e.g. Native, B2)"
                        value={lang.proficiency}
                        onChange={(e) => {
                          const next = [...data.languages];
                          next[idx] = { ...lang, proficiency: e.target.value };
                          setData({ ...data, languages: next });
                        }}
                        className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            languages: data.languages.filter((x) => x.id !== lang.id),
                          })
                        }
                        className="px-2 text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        languages: [...data.languages, { id: uid("lang"), language: "", proficiency: "" }],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Language
                  </button>
                </div>
              )}

              {/* ACHIEVEMENTS */}
              {activeSection === "achievements" && (
                <div className="space-y-3 text-xs">
                  {data.achievements.map((ach, idx) => (
                    <div
                      key={ach.id}
                      className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                    >
                      <input
                        type="text"
                        placeholder="Achievement Title"
                        value={ach.title}
                        onChange={(e) => {
                          const next = [...data.achievements];
                          next[idx] = { ...ach, title: e.target.value };
                          setData({ ...data, achievements: next });
                        }}
                        className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Organization / Event"
                          value={ach.issuer || ""}
                          onChange={(e) => {
                            const next = [...data.achievements];
                            next[idx] = { ...ach, issuer: e.target.value };
                            setData({ ...data, achievements: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Year"
                          value={ach.date || ""}
                          onChange={(e) => {
                            const next = [...data.achievements];
                            next[idx] = { ...ach, date: e.target.value };
                            setData({ ...data, achievements: next });
                          }}
                          className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            achievements: data.achievements.filter((x) => x.id !== ach.id),
                          })
                        }
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        achievements: [
                          ...data.achievements,
                          { id: uid("ach"), title: "", issuer: "", date: "" },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Achievement
                  </button>
                </div>
              )}

              {/* REFERENCES */}
              {activeSection === "references" && (
                <div className="space-y-3 text-xs">
                  {data.references.map((refItem, idx) => (
                    <div
                      key={refItem.id}
                      className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                    >
                      <input
                        type="text"
                        placeholder="Reference Name or Note"
                        value={refItem.name}
                        onChange={(e) => {
                          const next = [...data.references];
                          next[idx] = { ...refItem, name: e.target.value };
                          setData({ ...data, references: next });
                        }}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Title & Organization"
                        value={refItem.title}
                        onChange={(e) => {
                          const next = [...data.references];
                          next[idx] = { ...refItem, title: e.target.value };
                          setData({ ...data, references: next });
                        }}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Email"
                        value={refItem.email || ""}
                        onChange={(e) => {
                          const next = [...data.references];
                          next[idx] = { ...refItem, email: e.target.value };
                          setData({ ...data, references: next });
                        }}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={refItem.phone || ""}
                        onChange={(e) => {
                          const next = [...data.references];
                          next[idx] = { ...refItem, phone: e.target.value };
                          setData({ ...data, references: next });
                        }}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            references: data.references.filter((x) => x.id !== refItem.id),
                          })
                        }
                        className="col-span-2 text-right text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setData({
                        ...data,
                        references: [
                          ...data.references,
                          { id: uid("ref"), name: "", title: "", organization: "" },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Reference
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DRAG & STYLE TAB */}
          {activeTab === "layout" && (
            <div className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
              <div>
                <h2 className="font-bold">Typography & Color</h2>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium">Font Family</label>
                    <select
                      value={style.fontFamily}
                      onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                    >
                      {[
                        "Inter",
                        "Plus Jakarta Sans",
                        "IBM Plex Sans",
                        "Merriweather",
                        "Source Serif 4",
                        "DM Sans",
                        "Space Grotesk",
                      ].map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Density</label>
                    <select
                      value={style.fontSize}
                      onChange={(e) =>
                        setStyle({
                          ...style,
                          fontSize: e.target.value as ResumeStyleConfig["fontSize"],
                        })
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                    >
                      <option value="compact">Compact</option>
                      <option value="standard">Standard</option>
                      <option value="comfortable">Comfortable</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1.5 block font-medium">Accent Color</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setStyle({ ...style, accentColor: hex })}
                        aria-label={`Accent ${hex}`}
                        className={`h-6 w-6 rounded-full border-2 ${
                          style.accentColor === hex ? "border-slate-900 dark:border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <input
                      type="color"
                      value={style.accentColor}
                      onChange={(e) => setStyle({ ...style, accentColor: e.target.value })}
                      className="h-7 w-9 cursor-pointer rounded border border-[var(--fcs-border)]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--fcs-border)] pt-3">
                <h2 className="font-bold">Drag & Drop Section Order</h2>
                <p className="mb-2 text-[11px] text-[var(--fcs-ink-muted)]">
                  Drag rows or use arrows to reorder sections. Toggle visibility per section.
                </p>
                <ul className="space-y-1.5">
                  {style.sectionOrder.map((key) => {
                    const isHidden = style.hiddenSections.includes(key);
                    return (
                      <li
                        key={key}
                        draggable
                        onDragStart={() => setDragKey(key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropSection(key)}
                        className="flex items-center justify-between rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3.5 w-3.5 cursor-grab text-[var(--fcs-ink-muted)]" />
                          <span className={isHidden ? "line-through opacity-50" : "font-medium"}>
                            {SECTION_LABELS[key]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSection(key, -1)}
                            aria-label={`Move ${SECTION_LABELS[key]} up`}
                            className="rounded p-1 hover:bg-[var(--fcs-surface)]"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSection(key, 1)}
                            aria-label={`Move ${SECTION_LABELS[key]} down`}
                            className="rounded p-1 hover:bg-[var(--fcs-surface)]"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSectionVisibility(key)}
                            aria-label={`Toggle ${SECTION_LABELS[key]}`}
                            className="rounded p-1 hover:bg-[var(--fcs-surface)]"
                          >
                            {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* CREATOR AI TAB */}
          {activeTab === "ai" && (
            <div className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3">
                  <p className="text-[11px] text-[var(--fcs-ink-muted)]">Overall Quality</p>
                  <p className="mt-1 text-2xl font-bold">{qualityReport.overallScore}/100</p>
                </div>
                <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3">
                  <p className="text-[11px] text-[var(--fcs-ink-muted)]">ATS Readiness</p>
                  <p className="mt-1 text-2xl font-bold text-teal-700 dark:text-teal-400">
                    {qualityReport.atsReadiness}% ({qualityReport.atsLevel})
                  </p>
                </div>
              </div>

              <p className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 text-[11px] text-[var(--fcs-ink-muted)]">
                {qualityReport.disclaimer}
              </p>

              {qualityReport.recommendations.length > 0 && (
                <div>
                  <p className="mb-1.5 font-bold">Detected Improvements</p>
                  <ul className="space-y-1.5">
                    {qualityReport.recommendations.map((rec) => (
                      <li
                        key={rec.id}
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5"
                      >
                        <p className="font-semibold">{rec.title}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                          {rec.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="mb-1 block font-semibold">
                  Paste Target Job Description (Optional ATS Keyword Check)
                </label>
                <textarea
                  rows={3}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job requirements to measure keyword alignment..."
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 outline-none focus:border-teal-600"
                />
                {qualityReport.keywordMatches && (
                  <div className="mt-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 text-[11px]">
                    <p className="font-semibold">
                      Job Description Overlap: {qualityReport.keywordMatches.matchPercentage}%
                    </p>
                    {qualityReport.keywordMatches.missing.length > 0 && (
                      <p className="mt-1 text-[var(--fcs-ink-muted)]">
                        Consider including (if applicable):{" "}
                        {qualityReport.keywordMatches.missing.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--fcs-border)] pt-3">
                <p className="mb-2 flex items-center gap-1.5 font-bold">
                  <Wand2 className="h-3.5 w-3.5 text-teal-600" /> AI Writing & Optimization Tools
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() =>
                      runAiTask(
                        "resume_summary",
                        "Professional Summary",
                        "Generate a sharp 3-sentence professional summary tailored to my resume."
                      )
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-left font-medium hover:border-teal-600/40"
                  >
                    Generate Summary
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() =>
                      runAiTask(
                        "resume_objective",
                        "Career Objective",
                        "Generate a concise career objective for my target role."
                      )
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-left font-medium hover:border-teal-600/40"
                  >
                    Generate Objective
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() =>
                      runAiTask(
                        "resume_improve",
                        "Improved Experience Bullets",
                        "Rewrite my experience and project bullet points using strong action verbs and measurable structure without inventing numbers."
                      )
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-left font-medium hover:border-teal-600/40"
                  >
                    Improve Bullets
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() =>
                      runAiTask(
                        "resume_grammar",
                        "Grammar & Clarity Review",
                        "Check my entire resume text for grammar, tense consistency, and conciseness issues."
                      )
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-left font-medium hover:border-teal-600/40"
                  >
                    Fix Grammar
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() =>
                      runAiTask(
                        "resume_skills",
                        "Suggested Skills",
                        "Suggest relevant technical and soft skills to consider adding based on my background and target role."
                      )
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-left font-medium hover:border-teal-600/40"
                  >
                    Suggest Skills
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() =>
                      runAiTask(
                        "resume_ats_optimize",
                        "ATS & JD Optimization",
                        "Provide specific ATS optimization recommendations and keyword alignment advice based on my resume and pasted job description."
                      )
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-left font-medium hover:border-teal-600/40"
                  >
                    Optimize for ATS
                  </button>
                </div>

                {aiLoading && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--fcs-ink-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running Creator AI...
                  </div>
                )}

                {aiError && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {aiSuggestion && (
                  <div className="mt-3 space-y-2 rounded-xl border border-teal-600/30 bg-teal-50/70 p-3 dark:bg-teal-950/30">
                    <p className="font-bold text-teal-800 dark:text-teal-300">
                      Review Suggestion: {aiSuggestion.label}
                    </p>
                    <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed">
                      {aiSuggestion.text}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={applyAiSuggestion}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-[11px] font-semibold text-white"
                      >
                        <Check className="h-3 w-3" />
                        {aiSuggestion.mode === "resume_summary" ||
                        aiSuggestion.mode === "resume_objective"
                          ? "Approve & Apply"
                          : "Copy Suggestion"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiSuggestion(null)}
                        className="rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-[11px]"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT LIVE A4 PREVIEW */}
        <div className="lg:col-span-7">
          <div className="no-print mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--fcs-ink-muted)]">
              Live Print-Ready A4 Preview
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              {[0.65, 0.78, 0.9, 1].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                    zoom === z
                      ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                      : "border-[var(--fcs-border)]"
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--fcs-border)] bg-slate-200/70 p-4 dark:bg-slate-900/60">
            <div
              className="origin-top-left transition-transform"
              style={{
                transform: `scale(${zoom})`,
                width: `${794 * zoom}px`,
                height: `${1123 * zoom}px`,
              }}
            >
              <ResumeRenderer
                ref={previewRef}
                data={data}
                style={style}
                templateSlug={templateSlug}
              />
            </div>
          </div>
        </div>
      </div>

      <PhotoEditorModal
        open={photoModalOpen}
        initialShape={data.profilePhoto.shape}
        initialImageUrl={data.profilePhoto.url}
        onClose={() => setPhotoModalOpen(false)}
        onApply={handleApplyPhoto}
        title="Resume Profile Photo Editor"
      />
    </div>
  );
}
