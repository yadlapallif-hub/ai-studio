"use client";

import React, { useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  ArrowRight,
  Award,
  Check,
  FileText,
  Globe,
  QrCode,
  Sparkles,
} from "lucide-react";

type DemoTab = "resume" | "certificate" | "portfolio" | "ai";

export function HomeInteractiveDemo() {
  const [tab, setTab] = useState<DemoTab>("resume");
  const [resumeAccent, setResumeAccent] = useState("#0F766E");
  const [certTone, setCertTone] = useState<"gold" | "navy" | "teal">("gold");
  const [portfolioDark, setPortfolioDark] = useState(true);
  const [aiApplied, setAiApplied] = useState(false);

  const tabs: Array<{
    id: DemoTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "resume", label: "Resume Studio", icon: FileText },
    { id: "certificate", label: "Certificate Designer", icon: Award },
    { id: "portfolio", label: "Portfolio Builder", icon: Globe },
    { id: "ai", label: "Creator AI", icon: Sparkles },
  ];

  const certColors =
    certTone === "gold"
      ? { border: "#B45309", accent: "#B45309", bg: "#FFFDF7" }
      : certTone === "navy"
        ? { border: "#1E3A8A", accent: "#1D4ED8", bg: "#F8FAFC" }
        : { border: "#0F766E", accent: "#0F766E", bg: "#F4FBF9" };

  return (
    <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-3 shadow-sm sm:p-5">
      {/* Studio Switcher Rail */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--fcs-border)] pb-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-teal-700 text-white shadow-xs"
                    : "border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <span className="hidden font-mono text-[10px] tracking-wider uppercase text-[var(--fcs-ink-muted)] sm:inline">
          Interactive Workbench
        </span>
      </div>

      {/* Tab 1: Resume */}
      {tab === "resume" && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <p className="text-xs font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
              100 Templates • 14 Sections • PDF &amp; DOCX
            </p>
            <h3 className="text-lg font-bold tracking-tight">
              Precision ATS Resume Engineering
            </h3>
            <p className="text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Drag sections into any order, switch between 1 or 2 columns, check your 8-axis AI
              Resume Health Check score, and export print-ready PDF, PNG, or Microsoft Word DOCX.
            </p>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[var(--fcs-ink-muted)]">
                Try Accent Color Live:
              </p>
              <div className="flex gap-2">
                {["#0F766E", "#1D4ED8", "#B45309", "#111827"].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Preview accent ${hex}`}
                    onClick={() => setResumeAccent(hex)}
                    className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                      resumeAccent === hex ? "scale-110 border-teal-400" : "border-transparent"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
            <SafeNavLink
              href="/resume-builder/new"
              className="fcs-btn-primary inline-flex px-4 py-2 text-xs"
            >
              Open Resume Studio <ArrowRight className="h-3.5 w-3.5" />
            </SafeNavLink>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-xl border border-[var(--fcs-border)] bg-white p-5 text-slate-900 shadow-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="text-base font-bold tracking-tight">Aarav Sharma</p>
                  <p className="text-xs font-semibold" style={{ color: resumeAccent }}>
                    Full-Stack Software Engineer
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Bengaluru • TypeScript • Next.js • PostgreSQL
                  </p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                  Health Check 94/100
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <p
                    className="border-b pb-0.5 text-[10px] font-bold tracking-wider uppercase"
                    style={{ color: resumeAccent, borderColor: resumeAccent }}
                  >
                    Experience
                  </p>
                  <div>
                    <p className="text-[11px] font-bold">Software Engineering Intern — CloudStack</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      • Engineered REST APIs and automated integration tests reducing CI regressions.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p
                    className="border-b pb-0.5 text-[10px] font-bold tracking-wider uppercase"
                    style={{ color: resumeAccent, borderColor: resumeAccent }}
                  >
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["TypeScript", "React", "Next.js", "PostgreSQL", "Docker"].map((s) => (
                      <span
                        key={s}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Certificate */}
      {tab === "certificate" && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <p className="text-xs font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400">
              124 Designs • 14 Categories • Quantity &amp; CSV Bulk
            </p>
            <h3 className="text-lg font-bold tracking-tight">
              Verifiable Certificate &amp; Stamp Studio
            </h3>
            <p className="text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Drag and resize logos, seals, signatures, and recipient photos. Export single A4
              credentials or generate 1–500 certificates in one ZIP/PDF batch with live QR IDs.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(["gold", "navy", "teal"] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setCertTone(tone)}
                  className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    certTone === tone
                      ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                      : "border-[var(--fcs-border)]"
                  }`}
                >
                  {tone} Frame
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <SafeNavLink
                href="/certificate-builder"
                className="fcs-btn-primary inline-flex px-4 py-2 text-xs"
              >
                Open Certificate Studio <ArrowRight className="h-3.5 w-3.5" />
              </SafeNavLink>
              <SafeNavLink
                href="/bulk-generator"
                className="fcs-btn-secondary inline-flex px-3.5 py-2 text-xs"
              >
                Bulk (1–500)
              </SafeNavLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              className="rounded-xl border-4 p-4 text-slate-900 shadow-xs transition-colors"
              style={{ borderColor: certColors.border, backgroundColor: certColors.bg }}
            >
              <div
                className="border p-4 text-center"
                style={{ borderColor: `${certColors.border}55` }}
              >
                <p
                  className="font-serif text-[11px] font-bold tracking-[0.22em] uppercase"
                  style={{ color: certColors.accent }}
                >
                  Official Credential
                </p>
                <p className="mt-1 font-serif text-lg font-bold">
                  Certificate of Technical Distinction
                </p>
                <p className="mt-1.5 text-[11px] text-slate-600">
                  Proudly awarded to <strong className="text-slate-900">Priya Nair</strong> for
                  completing Full-Stack Systems Engineering
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2.5 text-[10px]">
                  <span className="font-mono text-slate-500">ID: FCS-2026-V2DEMO</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <QrCode className="h-3.5 w-3.5" /> Public Registry Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Portfolio */}
      {tab === "portfolio" && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <p className="text-xs font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
              6 Templates • Live URL • Download Source Code
            </p>
            <h3 className="text-lg font-bold tracking-tight">
              AI Personal Portfolio Generator
            </h3>
            <p className="text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Import directly from your saved resume or generate with Creator AI. Customize dark
              and light modes, publish live at <code className="font-mono">/p/your-name</code>, or
              export full static HTML/Next.js code.
            </p>
            <button
              type="button"
              onClick={() => setPortfolioDark((p) => !p)}
              className="cursor-pointer rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-[11px] font-semibold"
            >
              Toggle {portfolioDark ? "Light" : "Dark"} Preview
            </button>
            <div>
              <SafeNavLink
                href="/portfolio-builder"
                className="fcs-btn-primary inline-flex px-4 py-2 text-xs"
              >
                Open Portfolio Builder <ArrowRight className="h-3.5 w-3.5" />
              </SafeNavLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              className={`rounded-xl border p-5 transition-colors ${
                portfolioDark
                  ? "border-slate-800 bg-[#0B0F14] text-slate-100"
                  : "border-slate-200 bg-[#F8F7F4] text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] opacity-70">
                <span className="font-semibold">francis.dev</span>
                <span>Projects • Experience • Contact</span>
              </div>
              <p className="mt-3 text-base font-bold tracking-tight">
                Designing resilient products &amp; developer systems.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div
                  className={`rounded-lg border p-3 ${
                    portfolioDark
                      ? "border-slate-800 bg-slate-900/80"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-[11px] font-bold">Creator Studio SaaS</p>
                  <p className="mt-0.5 text-[10px] opacity-70">Next.js • TypeScript • Supabase</p>
                </div>
                <div
                  className={`rounded-lg border p-3 ${
                    portfolioDark
                      ? "border-slate-800 bg-slate-900/80"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-[11px] font-bold">Trust Verify Registry</p>
                  <p className="mt-0.5 text-[10px] opacity-70">PostgreSQL • RLS • QR</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Creator AI */}
      {tab === "ai" && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <p className="text-xs font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
              Voice • Vision • Permission-Gated Actions
            </p>
            <h3 className="text-lg font-bold tracking-tight">
              Creator AI Assistant &amp; Health Check
            </h3>
            <p className="text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Supports Ollama, Gemini, Groq, and OpenAI-compatible models with voice input, read
              aloud, document uploads, and explicit user-approved diffs before modifying any
              resume.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAiApplied(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-600/40 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
              >
                <Check className="h-3.5 w-3.5" />
                {aiApplied ? "Approved & Applied!" : "Preview Approved Apply"}
              </button>
              <SafeNavLink
                href="/assistant"
                className="fcs-btn-primary inline-flex px-4 py-1.5 text-xs"
              >
                Launch Creator AI <ArrowRight className="h-3.5 w-3.5" />
              </SafeNavLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="space-y-2.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 text-xs">
              <div className="rounded-lg bg-teal-700 px-3 py-2 text-white">
                &ldquo;Improve my resume for a software developer internship.&rdquo;
              </div>
              <div className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-3">
                <p className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                  Proposed Before → After Diff (Requires Your Approval)
                </p>
                <p className="mt-1 text-[11px] line-through opacity-60">
                  Before: Worked on backend APIs and helped with database bugs.
                </p>
                <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  After: Engineered REST API endpoints and optimized PostgreSQL queries for higher
                  reliability.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
