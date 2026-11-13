import React from "react";
import type { Metadata } from "next";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { buildPageMetadata } from "@/lib/seo";
import { WatchTutorialButton } from "@/components/tutorials/WatchTutorialButton";
import {
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  Code2,
  Compass,
  Download,
  FileSpreadsheet,
  FileText,
  FolderLock,
  Layers,
  LifeBuoy,
  Mic,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Stamp,
} from "lucide-react";
import { getPublicPlatformData } from "@/lib/platform";
import { SlideReveal } from "@/components/motion/SlideReveal";
import { ReplayIntroButton } from "@/components/brand/ReplayIntroButton";
import { HomeInteractiveDemo } from "@/components/home/HomeInteractiveDemo";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Home — Your Ideas. Your Creativity. One Intelligent Studio.",
  description:
    "Create professional resumes, design certificates, manage documents in a private vault, and unlock Creator AI — all in one open-source workspace.",
  path: "/",
});

export default async function HomePage() {
  const platform = await getPublicPlatformData();
  const { websiteContent, branding, faqs, stats, testimonials } = platform;

  const featureCards = [
    {
      icon: FileText,
      title: "AI Resume Studio",
      badge: `${stats.resumeTemplates} Templates`,
      description:
        "14 structured sections, drag-and-drop ordering, multi-column layouts, 8-axis AI Resume Health Check, and instant PDF, PNG & DOCX exports.",
      href: "/resume-builder",
      cta: "Open Resume Studio",
      color: "text-teal-700 dark:text-teal-400",
    },
    {
      icon: Award,
      title: "Certificate & Stamp Atelier",
      badge: `${stats.certificateTemplates} Designs`,
      description:
        "Visual drag-and-drop layer editor, custom seals, auto photo cropping, 1–500 quantity or CSV/Excel bulk generation, and QR verification.",
      href: "/certificate-builder",
      cta: "Open Certificate Studio",
      color: "text-amber-700 dark:text-amber-400",
    },
    {
      icon: Bot,
      title: "Creator AI Assistant",
      badge: "Voice + Vision",
      description:
        "Conversational guidance, speech input, read-aloud TTS, screenshot & document analysis, and permission-gated resume upgrades across Ollama, Gemini, Groq & OpenAI.",
      href: "/assistant",
      cta: "Launch Creator AI",
      color: "text-teal-700 dark:text-teal-400",
    },
    {
      icon: FolderLock,
      title: "Private Document Vault",
      badge: "Folders + Versions",
      description:
        "Organize PDF, DOCX, TXT, PNG & JPG files in custom folders with tags, inline previews, version history, and short-lived signed URLs.",
      href: "/vault",
      cta: "Open Vault",
      color: "text-teal-700 dark:text-teal-400",
    },
    {
      icon: Search,
      title: "Universal Command Search",
      badge: "Ctrl + K",
      description:
        "Jump instantly across resumes, certificates, templates, vault assets, AI chats, and recent activity using your keyboard.",
      href: "/dashboard",
      cta: "Open Workspace",
      color: "text-teal-700 dark:text-teal-400",
    },
    {
      icon: LifeBuoy,
      title: "Live Support Center",
      badge: "AI + Human Agents",
      description:
        "Instant AI troubleshooting with screenshot uploads, structured ticket tracking, priority escalation, and real-time staff replies.",
      href: "/support",
      cta: "Visit Support",
      color: "text-teal-700 dark:text-teal-400",
    },
  ];

  return (
    <div className="bg-[var(--fcs-bg)] text-[var(--fcs-ink)]">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 68% 55% at 15% 15%, rgba(15, 118, 110, 0.09), transparent 65%), radial-gradient(ellipse 55% 50% at 85% 20%, rgba(180, 130, 50, 0.08), transparent 65%), linear-gradient(to right, rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.055) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 100% 100%, 44px 44px, 44px 44px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-20">
          <SlideReveal direction="up" duration={520}>
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-700/25 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{websiteContent.heroBadge}</span>
                </div>
                <ReplayIntroButton variant="gold" label="Cinema Intro" className="rounded-full py-1" />
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-[var(--fcs-ink)] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
                {websiteContent.heroHeadline}
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--fcs-ink-muted)] sm:text-lg">
                {websiteContent.heroSubheadline}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <SafeNavLink
                  href="/dashboard"
                  className="fcs-btn-secondary px-5 py-2.5 text-sm font-semibold"
                >
                  <Layers className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                  <span>Explore Studio</span>
                </SafeNavLink>
                <SafeNavLink
                  href="/resume-builder/new"
                  className="fcs-btn-primary group px-5 py-2.5 text-sm font-semibold"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Start Creating</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </SafeNavLink>
                <a
                  href="#features"
                  className="fcs-btn-ghost px-4 py-2.5 text-sm text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)] hover:text-teal-700 dark:hover:text-teal-300"
                >
                  Discover Features
                </a>
                <WatchTutorialButton sectionKey="home" label="Watch Tour (EN / తెలుగు)" />
              </div>
            </div>
          </SlideReveal>

          {/* 2. INTERACTIVE PRODUCT DEMONSTRATION */}
          <div id="interactive-demo" className="mt-10 sm:mt-12">
            <SlideReveal direction="up" delay={100} duration={560}>
              <HomeInteractiveDemo />
            </SlideReveal>
          </div>
        </div>
      </section>

      {/* 3. REAL-DATA PLATFORM STATISTICS */}
      <section className="border-b border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4 sm:px-6 lg:grid-cols-6">
          <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <p className="font-mono text-2xl font-bold text-teal-700 dark:text-teal-400">
              {stats.resumeTemplates}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--fcs-ink-muted)]">
              ATS Resume Templates
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <p className="font-mono text-2xl font-bold text-amber-700 dark:text-amber-400">
              {stats.certificateTemplates}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--fcs-ink-muted)]">
              Certificate Templates ({stats.categories} Categories)
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <p className="font-mono text-2xl font-bold">{stats.tutorials}</p>
            <p className="mt-1 text-xs font-medium text-[var(--fcs-ink-muted)]">
              Bilingual Video Tutorials
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <p className="font-mono text-2xl font-bold">{stats.totalResumesCreated}</p>
            <p className="mt-1 text-xs font-medium text-[var(--fcs-ink-muted)]">
              Cloud Resumes Saved
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <p className="font-mono text-2xl font-bold">{stats.totalCertificatesIssued}</p>
            <p className="mt-1 text-xs font-medium text-[var(--fcs-ink-muted)]">
              Verified Certificates
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <p className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {stats.verifiedIssuersCount}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--fcs-ink-muted)]">
              Approved Organizations
            </p>
          </div>
        </div>
      </section>

      {/* 4. FEATURE SHOWCASE */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SlideReveal direction="up">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Intelligent Creative Ecosystem
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Six integrated studios, zero paywalls
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fcs-ink-muted)]">
              {branding.tagline} Designed with calm minimalism, honest AI assistance, and real
              cloud persistence across desktop and mobile.
            </p>
          </div>
        </SlideReveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card, idx) => (
            <SlideReveal key={card.href + card.title} delay={idx * 40}>
              <div className="fcs-card-interactive flex h-full flex-col justify-between rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                    <span className="rounded-md bg-[var(--fcs-surface-muted)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--fcs-ink-muted)]">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="mt-3.5 text-sm font-bold">{card.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
                    {card.description}
                  </p>
                </div>
                <SafeNavLink
                  href={card.href}
                  className="group mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                >
                  {card.cta}{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </SafeNavLink>
              </div>
            </SlideReveal>
          ))}
        </div>
      </section>

      {/* 5 & 6. RESUME & CERTIFICATE STUDIO PREVIEWS */}
      <section className="border-y border-[var(--fcs-border)] bg-[var(--fcs-surface)] py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-bg)] p-6 sm:p-7">
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Resume Studio Preview
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              ATS structure, 14 sections, DOCX &amp; PDF exports
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--fcs-ink-muted)]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  100 ATS-ready layouts with custom fonts, colors, 1- or 2-column switches, and
                  drag-and-drop section reordering.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  <strong>AI Resume Health Check</strong> scores 8 dimensions (Structure, Summary,
                  Skills, Experience, Education, Grammar, ATS, Job Relevance) with one-click approved
                  updates.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  Save multiple named resume versions and export print-ready A4 PDF, PNG, or
                  editable Microsoft Word <strong>.DOCX</strong>.
                </span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <SafeNavLink
                href="/resume-builder"
                className="fcs-btn-primary px-4 py-2 text-xs font-semibold"
              >
                Explore 100 Templates
              </SafeNavLink>
              <SafeNavLink
                href="/assistant"
                className="fcs-btn-secondary px-4 py-2 text-xs font-semibold"
              >
                Launch AI Health Check
              </SafeNavLink>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-bg)] p-6 sm:p-7">
            <p className="text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-amber-400">
              Certificate Designer Preview
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Exact-parity visual canvas, bulk cohorts &amp; QR trust
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--fcs-ink-muted)]">
              <li className="flex items-start gap-2.5">
                <Stamp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  124 templates across {stats.categories} categories with undo/redo, layer controls,
                  custom borders, auto photo crop, and Stamp &amp; Signature Studio.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Generate <strong>1–500 identical certificates by number</strong> or import CSV /
                  Excel rosters for multi-page PDF and ZIP exports.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Unscaled 1:1 export pipeline ensures PNG, 2K/4K, JPEG &amp; A4 PDF match the live
                  preview pixel-for-pixel, backed by public QR verification.
                </span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <SafeNavLink
                href="/certificate-builder"
                className="fcs-btn-primary px-4 py-2 text-xs font-semibold"
              >
                Open Certificate Studio
              </SafeNavLink>
              <SafeNavLink
                href="/bulk-generator"
                className="fcs-btn-secondary px-4 py-2 text-xs font-semibold"
              >
                Bulk Generator (1–500)
              </SafeNavLink>
              <SafeNavLink
                href="/verify"
                className="fcs-btn-secondary px-4 py-2 text-xs font-semibold"
              >
                <QrCode className="h-3.5 w-3.5" /> Verify ID
              </SafeNavLink>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CREATOR AI INTRODUCTION */}
      <section className="border-b border-[var(--fcs-border)] bg-[var(--fcs-bg)] py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Creator AI Architecture
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              An intelligent co-pilot that asks before applying changes
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--fcs-ink-muted)]">
              Run Creator AI with your choice of provider—local Ollama, Google Gemini, Groq, or
              OpenAI-compatible endpoints—while keeping every API key strictly server-side.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-3.5">
                <Mic className="h-4 w-4 text-teal-600" />
                <p className="mt-2 font-bold">Voice Input &amp; Read-Aloud</p>
                <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                  Dictate prompts hands-free and listen to responses.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-3.5">
                <Compass className="h-4 w-4 text-teal-600" />
                <p className="mt-2 font-bold">Screenshot &amp; Doc Analysis</p>
                <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                  Upload PNG/JPG screenshots, PDF, DOCX, or TXT files.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <SafeNavLink href="/assistant" className="fcs-btn-primary px-5 py-2.5 text-xs">
                Open Creator AI Hub
              </SafeNavLink>
              <SafeNavLink href="/settings" className="fcs-btn-secondary px-4 py-2.5 text-xs">
                Configure Personal AI Provider
              </SafeNavLink>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
              <p className="font-mono text-[11px] font-semibold uppercase text-teal-700 dark:text-teal-400">
                Supported Open Providers (Zero Vendor Lock-In)
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["Ollama (Local)", "Google Gemini", "Groq Fast", "OpenAI / Custom"].map((p) => (
                  <div
                    key={p}
                    className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-3 text-center text-xs font-semibold"
                  >
                    {p}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
                {websiteContent.openSourceNote}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <SafeNavLink
                  href={branding.githubUrl}
                  external
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-700"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> View MIT Source on GitHub
                </SafeNavLink>
                <SafeNavLink
                  href="/tutorials"
                  className="fcs-btn-secondary px-3.5 py-2 text-xs"
                >
                  Watch 12 Tutorials (EN / తెలుగు)
                </SafeNavLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CUSTOMER TESTIMONIALS (REAL DATABASE BACKED) */}
      <TestimonialsSection initialTestimonials={testimonials} />

      {/* 9. FAQS */}
      <section
        id="faq"
        className="border-t border-[var(--fcs-border)] bg-[var(--fcs-surface)] py-16"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Frequently Asked Questions
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Clear answers on privacy, AI &amp; verification
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="group rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-bg)] p-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  <span>{faq.question}</span>
                  <span className="ml-4 text-teal-700 transition group-open:rotate-45 dark:text-teal-400">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
