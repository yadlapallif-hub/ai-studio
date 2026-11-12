import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FileLock2, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy & Data Protection",
  description:
    "How Francis Creator Studio protects resumes, certificate drafts, uploaded photos, Document Vault assets, retention, deletion, and AI processing.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--fcs-bg)] text-[var(--fcs-ink)]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="border-b border-[var(--fcs-border)] pb-6">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Privacy &amp; Security Policy
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
            Last updated: November 11, 2026 • Applies to Francis Creator Studio
          </p>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--fcs-ink-muted)]">
          <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <div className="flex items-center gap-2 text-base font-bold text-[var(--fcs-ink)]">
              <FileLock2 className="h-4 w-4 text-teal-600" />
              <h2>1. Resumes, Certificates &amp; Document Vault Storage</h2>
            </div>
            <p className="mt-3 text-xs sm:text-sm">
              Your resumes, certificate drafts, uploaded photos, stamps, signatures, and Document
              Vault files belong to you. Saved documents are stored in PostgreSQL and Supabase
              Storage (`fcs-vault` and `fcs-support-attachments`) partitioned strictly by your
              authenticated user ID (`user.id`).
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs sm:text-sm">
              <li>
                Database Row-Level Security (RLS) restricts private resume, certificate draft, AI
                conversation, notification, and uploaded asset rows exclusively to their owner.
              </li>
              <li>
                Private Document Vault files are never exposed via public bucket URLs; downloads use
                authenticated, path-validated signed URLs valid for 300 seconds.
              </li>
              <li>
                Unauthenticated or public QR lookups on <code>/verify</code> only expose official
                certificate verification status metadata (recipient name, credential title, issuing
                organization, status) when an authorized certificate exists.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <div className="flex items-center gap-2 text-base font-bold text-[var(--fcs-ink)]">
              <UserCheck className="h-4 w-4 text-teal-600" />
              <h2>2. AI Processing, Image Editing &amp; Cookies</h2>
            </div>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs sm:text-sm">
              <li>
                <strong>No third-party ad networks or behavioral tracking:</strong> Francis Creator
                Studio does not embed third-party advertising trackers, behavioral fingerprinting, or
                session-replay spyware. Only essential authentication cookies (`sb-*`) and local UI
                preferences (theme light/dark) are used.
              </li>
              <li>
                <strong>Photo Background Removal:</strong> Uses on-device client segmentation by
                default when no external API key is configured, keeping uploaded images on your
                device unless you save them into your Vault.
              </li>
              <li>
                <strong>Creator AI Assistant:</strong> Prompts and optional workspace context are sent
                only when you explicitly invoke Creator AI or click Analyze Workspace. Suggestions are
                never written into your resume without your confirmation.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
            <div className="flex items-center gap-2 text-base font-bold text-[var(--fcs-ink)]">
              <Trash2 className="h-4 w-4 text-teal-600" />
              <h2>3. Retention, Export &amp; Account Deletion</h2>
            </div>
            <p className="mt-3 text-xs sm:text-sm">
              You may export your resumes or certificates anytime as PDF or PNG, delete individual
              files inside Document Vault or Account Settings, or request full account and stored
              data removal through <Link href="/settings" className="text-teal-700 underline dark:text-teal-400">Account Settings</Link>{" "}
              or <Link href="/support" className="text-teal-700 underline dark:text-teal-400">Live Support</Link>{" "}
              (or email <code>yadlapallifrancis@gmail.com</code>).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
