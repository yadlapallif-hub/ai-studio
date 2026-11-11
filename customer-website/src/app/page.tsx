import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Code2,
  Compass,
  Download,
  FileText,
  FolderLock,
  Layers,
  LifeBuoy,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stamp,
  Wand2,
} from "lucide-react";
import { getPublicPlatformData } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const platform = await getPublicPlatformData();
  const { websiteContent, branding, faqs } = platform;

  return (
    <div className="bg-[var(--fcs-bg)] text-[var(--fcs-ink)]">
      {/* HERO SECTION */}
      <section className="border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-700/25 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              <Code2 className="h-3.5 w-3.5" />
              <span>{websiteContent.heroBadge}</span>
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--fcs-ink)] sm:text-5xl sm:leading-[1.08]">
              {websiteContent.heroHeadline}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--fcs-ink-muted)] sm:text-lg">
              {websiteContent.heroSubheadline}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/resume-builder/new"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <FileText className="h-4 w-4" />
                <span>{websiteContent.primaryCta}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/certificate-builder/new"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--fcs-ink)] transition hover:border-teal-600/50"
              >
                <Award className="h-4 w-4 text-amber-600" />
                <span>{websiteContent.secondaryCta}</span>
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--fcs-ink-muted)] hover:text-teal-700 dark:hover:text-teal-300"
              >
                <QrCode className="h-4 w-4" />
                Verify a Certificate
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[var(--fcs-border)] pt-6 sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-[var(--fcs-ink)]">No Paywalls</p>
                <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                  Free PDF & PNG exports
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--fcs-ink)]">Try Instantly</p>
                <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                  Explore tools pre-signup
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--fcs-ink)]">QR Verification</p>
                <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                  Database-backed registry
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--fcs-ink)]">Open AI Support</p>
                <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                  Ollama, OpenAI, Gemini, Groq
                </p>
              </div>
            </div>
          </div>

          {/* ARCHITECTURAL LIVE STUDIO SHOWCASE */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between border-b border-[var(--fcs-border)] pb-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                  <span>Studio Preview Workspace</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--fcs-ink-muted)]">
                  A4 • 300 DPI Ready
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Mini Resume Sheet */}
                <div className="rounded-xl border border-[var(--fcs-border)] bg-white p-4 text-slate-900 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <p className="text-[11px] font-bold tracking-tight">ATS Precision CV</p>
                      <p className="text-[9px] text-slate-500">14 Structured Sections</p>
                    </div>
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-teal-800">
                      ATS Ready
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-3/4 rounded bg-slate-800" />
                    <div className="h-1.5 w-1/2 rounded bg-teal-700/70" />
                    <div className="pt-1.5 space-y-1">
                      <div className="h-1.5 w-full rounded bg-slate-200" />
                      <div className="h-1.5 w-11/12 rounded bg-slate-200" />
                      <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                    </div>
                    <div className="flex flex-wrap gap-1 pt-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-700">
                        TypeScript
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-700">
                        PostgreSQL
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-700">
                        Next.js
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mini Certificate Sheet */}
                <div className="rounded-xl border-2 border-amber-700/35 bg-[#FFFDF7] p-4 text-slate-900 shadow-sm">
                  <div className="border border-amber-700/30 p-2.5 text-center">
                    <p className="font-serif text-[10px] font-semibold tracking-widest uppercase text-amber-800">
                      Certificate
                    </p>
                    <p className="mt-1 font-serif text-xs font-bold text-slate-900">
                      Excellence & Completion
                    </p>
                    <div className="mx-auto my-2 h-px w-12 bg-amber-700/40" />
                    <p className="text-[9px] text-slate-600">
                      QR Verified • Custom Seal Studio
                    </p>
                    <div className="mt-3 flex items-center justify-between pt-1">
                      <span className="font-mono text-[8px] text-slate-500">FCS-2026</span>
                      <QrCode className="h-4 w-4 text-slate-800" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  <span className="font-medium">FRANCIS Intelligence</span>
                </div>
                <Link
                  href="/assistant"
                  className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                >
                  Open Studio →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM OVERVIEW */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Platform Architecture
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Every core studio built as real document engineering software
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fcs-ink-muted)]">
            {branding.tagline} Designed with clean typography, honest AI recommendations, private
            cloud storage, and verifiable credentials.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <FileText className="h-6 w-6 text-teal-700 dark:text-teal-400" />
            <h3 className="mt-4 text-base font-bold">AI Resume Builder</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              100 distinct resume layouts, 14 structured sections, drag-and-drop ordering, real
              background removal photo studio, and print-ready A4 PDF/PNG export.
            </p>
            <Link
              href="/resume-builder"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Open Resume Builder <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <Award className="h-6 w-6 text-amber-600" />
            <h3 className="mt-4 text-base font-bold">AI Certificate Studio</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              100 certificate designs across 9 categories, A4 portrait & landscape canvas,
              stamp/seal/signature layering, unique certificate IDs, and QR verification.
            </p>
            <Link
              href="/certificate-builder"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Open Certificate Studio <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <Compass className="h-6 w-6 text-teal-700 dark:text-teal-400" />
            <h3 className="mt-4 text-base font-bold">FRANCIS Intelligence</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Transparent resume quality scoring, job description keyword comparison, career
              roadmaps, and certificate layout reviews — never applying changes without approval.
            </p>
            <Link
              href="/assistant"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Explore Intelligence <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <LifeBuoy className="h-6 w-6 text-teal-700 dark:text-teal-400" />
            <h3 className="mt-4 text-base font-bold">Live Customer Support</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Real-time support chat, screenshot attachments, structured ticket tracking, and instant
              escalation from AI troubleshooting to human support agents.
            </p>
            <Link
              href="/support"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Visit Support Center <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* DEEP DIVE: RESUME + CERTIFICATE BUILDERS */}
      <section className="border-y border-[var(--fcs-border)] bg-[var(--fcs-surface)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              <Layers className="h-4 w-4" />
              <span>Resume Studio Highlights</span>
            </div>
            <h3 className="mt-3 text-xl font-bold">
              Built for both Applicant Tracking Systems and human clarity
            </h3>
            <ul className="mt-5 space-y-2.5 text-sm text-[var(--fcs-ink-muted)]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  All 14 sections: Summary, Career Objective, Work Experience, Internships, Projects,
                  Education, Technical & Soft Skills, Certifications, Languages, Achievements, References.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  Realistic Profile Photo Editor: Crop/Zoom, Rotate, Brightness/Contrast, Circle or
                  Square frame, plus real ML & server background removal without altering identity.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  One-click AI improvements: Generate summaries, polish bullets, fix grammar, or
                  compare against a pasted job description.
                </span>
              </li>
            </ul>
            <div className="mt-6">
              <Link
                href="/resume-builder/new"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Start Building Resume <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Stamp className="h-4 w-4" />
              <span>Certificate & Seal Studio Highlights</span>
            </div>
            <h3 className="mt-3 text-xl font-bold">
              Graphic design flexibility with strict verification integrity
            </h3>
            <ul className="mt-5 space-y-2.5 text-sm text-[var(--fcs-ink-muted)]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Drag, resize, rotate, and layer logos, recipient photos, stamps, gold seals, and
                  authorized signatures across A4 Landscape or Portrait canvases.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Ethical distinction: Sample preview stamps are clearly labeled decorative, while
                  genuine organizational seals & verification require authorized issuer approval.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Instant scannable QR code on every certificate connected to the live public
                  verification database.
                </span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/certificate-builder/new"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Open Certificate Studio <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-2 text-xs font-semibold"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Public Verify Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How It Works</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Choose a Studio & Template",
              desc: "Explore 100 ATS-ready resume templates or 100 certificate designs across 9 categories immediately without creating an account.",
              icon: Wand2,
            },
            {
              step: "02",
              title: "Edit & Enhance with AI",
              desc: "Customize typography, reorder sections, remove photo backgrounds, and run FRANCIS Intelligence audits.",
              icon: Sparkles,
            },
            {
              step: "03",
              title: "Save to Private Vault",
              desc: "Sign in for free to store multiple versions, logos, stamps, signatures, and exports securely in Supabase.",
              icon: FolderLock,
            },
            {
              step: "04",
              title: "Export & Verify Anywhere",
              desc: "Download crisp print-ready A4 PDFs or PNGs and verify certificates publicly via unique ID or QR code.",
              icon: Download,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400">
                  STEP {item.step}
                </span>
                <item.icon className="h-4 w-4 text-[var(--fcs-ink-muted)]" />
              </div>
              <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* OPEN SOURCE SECTION */}
      <section className="border-y border-[var(--fcs-border)] bg-[var(--fcs-surface)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Free & Open-Source Software
            </p>
            <h2 className="mt-2 text-xl font-bold sm:text-2xl">
              Zero paywalls. Full source transparency. MIT Licensed.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fcs-ink-muted)]">
              {websiteContent.openSourceNote}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={branding.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-2.5 text-xs font-semibold transition hover:border-teal-600/50"
            >
              <Code2 className="h-4 w-4" />
              View on GitHub
            </a>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Frequently Asked Questions
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Clear answers on privacy, AI & verification
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                <span>{faq.question}</span>
                <span className="ml-4 text-xs text-[var(--fcs-ink-muted)] group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
