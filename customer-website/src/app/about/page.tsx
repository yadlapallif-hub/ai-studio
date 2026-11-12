import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Code2,
  Compass,
  FileText,
  FolderLock,
  Film,
  QrCode,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About & Documentation",
  description:
    "Learn how Francis Creator Studio works: ATS Resume Builder, 124 Certificate Designs, Authorized Organization approval, Public QR Verification, Creator AI, and Open-Source transparency.",
  path: "/about",
});

export default function AboutPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Francis Creator Studio free and open-source?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Francis Creator Studio is MIT-licensed free and open-source software with free PDF and PNG exports and zero paywalls.",
        },
      },
      {
        "@type": "Question",
        name: "Who can issue officially verified certificates?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Any user can explore sample certificate drafts, while official verifiable QR credentials and Official Stamps require submitting an Authorized Organization application and passing Administrator review.",
        },
      },
      {
        "@type": "Question",
        name: "How does public certificate verification work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Every officially issued certificate stores a unique verification code linked to the database registry. Anyone can scan its QR code or enter the code on /verify to check authentic, revoked, or sample status.",
        },
      },
      {
        "@type": "Question",
        name: "Does Creator AI modify my resume automatically without approval?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Creator AI generates inspectable suggestions with transparent rationale and only updates your workspace when you explicitly apply or confirm changes.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--fcs-bg)] text-[var(--fcs-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="border-b border-[var(--fcs-border)] pb-8">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            <Code2 className="h-3.5 w-3.5" /> About &amp; Platform Documentation
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            How Francis Creator Studio Works
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--fcs-ink-muted)] sm:text-base">
            Francis Creator Studio is an open-source digital document engineering platform created
            by Francis Y. It combines an ATS-structured Resume Studio, a Certificate Design Studio
            with role-gated official credential verification, Creator AI career guidance, and a
            private Document Vault in one unified Next.js &amp; Supabase workspace.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <Link href="/tutorials" className="fcs-btn-primary px-4 py-2">
              <Film className="h-3.5 w-3.5" /> Watch 12 Video Tutorials
            </Link>
            <Link href="/privacy" className="fcs-btn-secondary px-4 py-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Privacy &amp; Data Protection
            </Link>
          </div>
        </div>

        <section className="mt-10 grid gap-5 sm:grid-cols-2">
          {[
            {
              icon: FileText,
              title: "AI Resume Studio",
              href: "/resume-builder",
              desc: "Build resumes across 100 structured templates and 14 sections with drag-and-drop ordering, client-side & optional server background removal, ATS scoring, and clean A4 PDF/PNG export.",
            },
            {
              icon: Award,
              title: "Certificate Design Studio",
              href: "/certificate-builder",
              desc: "Design across 124 certificate layouts in 14 categories. Users can preview sample drafts anytime, while Admin-approved Authorized Organizations unlock official QR issuance and Bulk ZIP generation.",
            },
            {
              icon: QrCode,
              title: "QR Certificate Verification",
              href: "/verify",
              desc: "Public verification lookup backed by PostgreSQL RPC (`fcs_lookup_certificate_verification`) distinguishes Officially Verified, Revoked, Sample drafts, and accepts suspicious-certificate reports.",
            },
            {
              icon: Compass,
              title: "Creator AI, Career Roadmap & Sessions",
              href: "/assistant",
              desc: "Interactive assistant supporting platform questions, Career Roadmap skill gap & interview prep plans, workspace quality audits, and topic-separated chat sessions.",
            },
            {
              icon: Stamp,
              title: "Stamp Studio & Authorized Organizations",
              href: "/stamps",
              desc: "Generate transparent SVG/PNG sample stamps for previews, or apply for Authorized Organization verification reviewed by platform administrators.",
            },
            {
              icon: FolderLock,
              title: "Private Document Vault & Support",
              href: "/vault",
              desc: "All personal uploads and exports live in owner-scoped Supabase storage protected by RLS policies and 300-second signed download links, paired with real-time Support Tickets.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6"
            >
              <card.icon className="h-5 w-5 text-teal-700 dark:text-teal-400" />
              <h2 className="mt-3 text-base font-bold">{card.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">{card.desc}</p>
              <Link
                href={card.href}
                className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
              >
                Open {card.title} →
              </Link>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 sm:p-8">
          <h2 className="text-xl font-bold">Core Security &amp; Integrity Guarantees</h2>
          <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-[var(--fcs-ink-muted)] sm:text-sm">
            {[
              "Zero fabricated verification seals: unapproved users can design sample drafts marked clearly as Sample, never Official Verified.",
              "Separate Staff & Admin Console with database-verified role checks (`super_admin`, `admin`, `support_agent`, `content_manager`) and audit logging.",
              "Server-side rate limiting, strict UUID & Zod schema input validation, and owner-prefix checks on every private storage signed-URL request.",
              "Canonical URLs, transparent MIT open-source license, and direct support at yadlapallifrancis@gmail.com.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[11px] text-[var(--fcs-ink-muted)]">
            Canonical reference URL:{" "}
            <a href={SITE_URL} className="underline">
              {SITE_URL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
