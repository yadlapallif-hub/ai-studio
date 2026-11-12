"use client";

import React, { useMemo, useRef, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  buildDeterministicCoverLetter,
  type CoverLetterTone,
  type ResumeData,
} from "@francis/shared";
import {
  Check,
  Copy,
  FileDown,
  FileText,
  Loader2,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { exportCoverLetterToDocx, exportCoverLetterToPdf, logDocumentExport } from "@/lib/exportHelpers";
import { readFileToAiAttachment } from "@/lib/ai-client-helpers";

interface SavedCoverLetterRow {
  id: string;
  title: string;
  company_name: string;
  target_role: string;
  writing_style: string;
  content: string;
  job_description?: string | null;
  recommendations?: string[] | null;
  updated_at: string;
}

interface SavedResumeRow {
  id: string;
  title: string;
  data: ResumeData;
}

const STYLE_OPTIONS: Array<{ id: CoverLetterTone; label: string; desc: string }> = [
  { id: "modern_tech", label: "Modern Tech", desc: "Crisp, high-ownership engineering tone" },
  { id: "executive", label: "Executive", desc: "Strategic leadership & measurable delivery" },
  { id: "internship", label: "Internship / Entry", desc: "Eager builder & hands-on craft" },
  { id: "warm_story", label: "Mission / Story", desc: "Values-aligned narrative tone" },
  { id: "academic", label: "Academic / Research", desc: "Formal scholarly & fellowship style" },
];

export function CoverLetterClient({
  isAuthenticated,
  initialLetters,
  userResumes,
  initialActiveId,
}: {
  isAuthenticated: boolean;
  initialLetters: SavedCoverLetterRow[];
  userResumes: SavedResumeRow[];
  initialActiveId?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const starter =
    (initialActiveId && initialLetters.find((l) => l.id === initialActiveId)) ||
    initialLetters[0] ||
    null;

  const [letters, setLetters] = useState<SavedCoverLetterRow[]>(initialLetters);
  const [activeId, setActiveId] = useState<string | null>(starter?.id ?? null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(userResumes[0]?.id ?? "");
  const [uploadedResumeText, setUploadedResumeText] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [title, setTitle] = useState(starter?.title ?? "Software Engineer Cover Letter");
  const [candidateName, setCandidateName] = useState(
    userResumes[0]?.data?.personalInfo?.fullName || "Francis Creator"
  );
  const [candidateContact, setCandidateContact] = useState(
    [
      userResumes[0]?.data?.personalInfo?.email,
      userResumes[0]?.data?.personalInfo?.phone,
      userResumes[0]?.data?.personalInfo?.location,
    ]
      .filter(Boolean)
      .join(" • ") || "hello@example.com"
  );
  const [companyName, setCompanyName] = useState(starter?.company_name ?? "Acme Technologies");
  const [targetRole, setTargetRole] = useState(starter?.target_role ?? "Software Engineer");
  const [hiringManager, setHiringManager] = useState("");
  const [writingStyle, setWritingStyle] = useState<CoverLetterTone>(
    (starter?.writing_style as CoverLetterTone) || "modern_tech"
  );
  const [jobDescription, setJobDescription] = useState(starter?.job_description ?? "");
  const [content, setContent] = useState(
    starter?.content ??
      buildDeterministicCoverLetter({
        candidateName: userResumes[0]?.data?.personalInfo?.fullName || "Francis Creator",
        companyName: "Acme Technologies",
        targetRole: "Software Engineer",
        writingStyle: "modern_tech",
        resume: userResumes[0]?.data ?? null,
      }).content
  );
  const [recommendations, setRecommendations] = useState<string[]>(
    starter?.recommendations ?? []
  );

  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeResume = useMemo(
    () => userResumes.find((r) => r.id === selectedResumeId) ?? null,
    [userResumes, selectedResumeId]
  );

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const att = await readFileToAiAttachment(file);
      setUploadedFileName(file.name);
      setUploadedResumeText(att.textContent || "");
      setStatusMsg(`Loaded resume text from "${file.name}" for tailoring.`);
    } catch {
      setErrorMsg("Could not read uploaded file.");
    }
    e.target.value = "";
  };

  const handleInstantDraft = () => {
    const res = buildDeterministicCoverLetter({
      candidateName: activeResume?.data?.personalInfo?.fullName || candidateName,
      companyName,
      targetRole,
      hiringManager,
      writingStyle,
      resume: activeResume?.data ?? null,
      jobDescription,
    });
    if (activeResume?.data?.personalInfo?.fullName) {
      setCandidateName(activeResume.data.personalInfo.fullName);
    }
    setContent(res.content);
    setRecommendations(res.recommendations);
    setStatusMsg("Personalized cover letter drafted cleanly!");
  };

  const handleAiGenerate = async () => {
    setAiLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cover_letter_generate",
          contextPage: "Cover Letter Generator",
          contextData: {
            candidateName,
            companyName,
            targetRole,
            writingStyle,
            data: activeResume?.data,
            uploadedResumeExcerpt: uploadedResumeText.slice(0, 4000) || undefined,
          },
          jobDescription: jobDescription || undefined,
          messages: [
            {
              role: "user",
              content: `Write a tailored ${writingStyle} cover letter for ${targetRole} at ${companyName}${
                hiringManager ? ` addressed to ${hiringManager}` : ""
              }. Return honest wording strictly grounded in my experience.`,
            },
          ],
        }),
      });
      const json = (await res.json()) as {
        reply?: string;
        generatedCoverLetter?: { bodyText?: string; recommendations?: string[] };
        message?: string;
      };
      if (!res.ok) {
        setErrorMsg(json.message || "Sign in to run AI cover letter generation.");
        return;
      }
      if (json.generatedCoverLetter?.bodyText) {
        setContent(json.generatedCoverLetter.bodyText);
        if (json.generatedCoverLetter.recommendations) {
          setRecommendations(json.generatedCoverLetter.recommendations);
        }
      } else if (json.reply) {
        setContent(json.reply);
      }
      setStatusMsg("Creator AI generated a customized cover letter draft!");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      setErrorMsg("Sign in to save cover letters to your workspace.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/cover-letters", {
        method: activeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(activeId ? { id: activeId } : {}),
          title: title.trim() || `${targetRole} — ${companyName}`,
          company_name: companyName,
          target_role: targetRole,
          writing_style: writingStyle,
          job_description: jobDescription,
          content,
          recommendations,
          source_resume_id: selectedResumeId || undefined,
        }),
      });
      const json = (await res.json()) as {
        coverLetter?: SavedCoverLetterRow;
        error?: string;
      };
      if (!res.ok || !json.coverLetter) {
        setErrorMsg(json.error || "Could not save cover letter.");
        return;
      }
      setActiveId(json.coverLetter.id);
      setLetters((prev) => {
        const idx = prev.findIndex((x) => x.id === json.coverLetter!.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = json.coverLetter!;
          return next;
        }
        return [json.coverLetter!, ...prev];
      });
      setStatusMsg("Cover letter saved to your workspace.");
    } finally {
      setSaving(false);
    }
  };

  const baseFile = `${companyName || "Company"}_${targetRole || "Cover_Letter"}`.replace(
    /[^a-z0-9-_]+/gi,
    "_"
  );

  return (
    <div className="min-h-screen bg-[var(--fcs-bg)]">
      {/* Toolbar */}
      <div className="border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SafeNavLink
              href="/dashboard"
              className="rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
            >
              ← Dashboard
            </SafeNavLink>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-sm font-semibold outline-none focus:border-teal-600"
            />
            {letters.length > 0 && (
              <select
                value={activeId ?? ""}
                onChange={(e) => {
                  const found = letters.find((l) => l.id === e.target.value);
                  if (found) {
                    setActiveId(found.id);
                    setTitle(found.title);
                    setCompanyName(found.company_name);
                    setTargetRole(found.target_role);
                    setWritingStyle((found.writing_style as CoverLetterTone) || "modern_tech");
                    setJobDescription(found.job_description || "");
                    setContent(found.content);
                    setRecommendations(found.recommendations ?? []);
                  }
                }}
                className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs"
              >
                {letters.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={async () => {
                exportCoverLetterToPdf({
                  candidateName,
                  candidateContact,
                  companyName,
                  targetRole,
                  content,
                  filename: `${baseFile}.pdf`,
                });
                if (activeId) await logDocumentExport("cover_letter", activeId, "pdf");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              type="button"
              onClick={async () => {
                await exportCoverLetterToDocx({
                  candidateName,
                  candidateContact,
                  companyName,
                  targetRole,
                  content,
                  filename: `${baseFile}.docx`,
                });
                if (activeId) await logDocumentExport("cover_letter", activeId, "docx");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold"
            >
              <FileText className="h-3.5 w-3.5 text-teal-600" /> DOCX
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(content);
                setStatusMsg("Copied cover letter text to clipboard.");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>
      </div>

      {(statusMsg || errorMsg) && (
        <div className="mx-auto mt-3 max-w-[1500px] px-4 sm:px-6">
          {statusMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              <Check className="h-4 w-4" /> {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* LEFT CONTROLS */}
        <div className="space-y-4 text-xs lg:col-span-5">
          <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <h2 className="text-sm font-bold">1. Resume Source (Saved or Upload)</h2>
            {userResumes.length > 0 && (
              <div>
                <label className="mb-1 block font-semibold">Select Saved Cloud Resume</label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => {
                    setSelectedResumeId(e.target.value);
                    const found = userResumes.find((r) => r.id === e.target.value);
                    if (found?.data?.personalInfo?.fullName) {
                      setCandidateName(found.data.personalInfo.fullName);
                      setCandidateContact(
                        [
                          found.data.personalInfo.email,
                          found.data.personalInfo.phone,
                          found.data.personalInfo.location,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                      );
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                >
                  {userResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={handleResumeUpload}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 font-semibold hover:border-teal-600/40"
              >
                <Upload className="h-3.5 w-3.5 text-teal-600" />
                Upload Resume File (PDF / DOCX / TXT)
              </button>
              {uploadedFileName && (
                <span className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                  Loaded: {uploadedFileName}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <h2 className="text-sm font-bold">2. Target Role &amp; Writing Style</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-semibold">Your Name</label>
                <input
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Contact Line</label>
                <input
                  value={candidateContact}
                  onChange={(e) => setCandidateContact(e.target.value)}
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Company Name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Target Role</label>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-semibold">Hiring Manager (Optional)</label>
                <input
                  value={hiringManager}
                  onChange={(e) => setHiringManager(e.target.value)}
                  placeholder="e.g. Dr. Kavya Menon"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Writing Style</label>
                <select
                  value={writingStyle}
                  onChange={(e) => setWritingStyle(e.target.value as CoverLetterTone)}
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                >
                  {STYLE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold">Job Description</label>
              <textarea
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste job responsibilities & qualifications to tailor keywords..."
                className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleInstantDraft}
                className="flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-2.5 font-semibold hover:border-teal-600/40"
              >
                Draft Instantly
              </button>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Tailor with Creator AI
              </button>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
              <p className="font-bold">AI Tailoring Recommendations</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[var(--fcs-ink-muted)]">
                {recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT LETTER EDITOR & PRINT PREVIEW */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-[var(--fcs-border)] bg-white p-6 text-slate-900 shadow-xs sm:p-10">
            <div className="border-b-2 border-teal-700 pb-4">
              <p className="text-xl font-bold tracking-tight">{candidateName}</p>
              <p className="mt-0.5 text-xs text-slate-500">{candidateContact}</p>
            </div>
            <p className="mt-4 text-xs font-bold text-teal-800">
              RE: {targetRole}
              {companyName ? ` — ${companyName}` : ""}
            </p>
            <textarea
              rows={18}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Cover letter content"
              className="mt-4 w-full resize-y border-0 bg-transparent text-[13px] leading-relaxed text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
