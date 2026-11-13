"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, MessageSquarePlus, Star } from "lucide-react";
import type { PublicTestimonialItem } from "@/lib/platform";

export function TestimonialsSection({
  initialTestimonials,
}: {
  initialTestimonials: PublicTestimonialItem[];
}) {
  const [items] = useState<PublicTestimonialItem[]>(initialTestimonials);
  const [formOpen, setFormOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [organization, setOrganization] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: authorName,
          author_role: authorRole,
          organization,
          quote,
          rating,
        }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Sign in first to submit verified feedback.");
        return;
      }
      setFeedbackMsg(json.message || "Submitted! Pending admin review before publishing.");
      setAuthorName("");
      setAuthorRole("");
      setOrganization("");
      setQuote("");
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Community Reviews
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Verified creator &amp; organization feedback
          </h2>
          <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
            Every testimonial published here comes directly from signed-in Francis Creator Studio
            users and approved partner organizations — never fabricated.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((p) => !p)}
          className="fcs-btn-secondary cursor-pointer px-4 py-2 text-xs"
        >
          <MessageSquarePlus className="h-3.5 w-3.5 text-teal-600" />
          Share Your Experience
        </button>
      </div>

      {feedbackMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 text-xs sm:grid-cols-3"
        >
          <div>
            <label className="mb-1 block font-semibold">Your Name</label>
            <input
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Ananya Rao"
              className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">Role</label>
            <input
              required
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              placeholder="e.g. Computer Science Student / Program Director"
              className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">Organization (Optional)</label>
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="University, Startup, or Guild"
              className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 outline-none focus:border-teal-600"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1 block font-semibold">Your Honest Review</label>
            <textarea
              required
              rows={3}
              minLength={15}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Share how Resume Studio, Certificate Studio, Document Vault, or Creator AI helped your workflow..."
              className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 outline-none focus:border-teal-600"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Rating:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="cursor-pointer p-0.5"
                >
                  <Star
                    className={`h-4 w-4 ${
                      n <= rating ? "fill-amber-400 text-amber-500" : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {errorMsg && <span className="text-red-600">{errorMsg}</span>}
              <button
                type="submit"
                disabled={submitting}
                className="fcs-btn-primary cursor-pointer px-4 py-2 text-xs"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Submit Review
              </button>
            </div>
          </div>
        </form>
      )}

      {items.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5"
            >
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: item.rating }).map((_, idx) => (
                    <Star key={idx} className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--fcs-ink)]">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>
              <div className="mt-4 border-t border-[var(--fcs-border)] pt-3 text-xs">
                <p className="font-bold">{item.author_name}</p>
                <p className="text-[var(--fcs-ink-muted)]">
                  {item.author_role}
                  {item.organization ? ` • ${item.organization}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 rounded-2xl border border-dashed border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-teal-700 dark:text-teal-400">
              Students &amp; Graduates
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Craft ATS-ready resumes across 100 templates, run the 8-axis AI Health Check, export
              print-ready PDF and Word DOCX files, and manage multiple saved versions in minutes.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Institutes &amp; Training Cohorts
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Design official credentials across 124 templates, generate up to 500 certificates per
              batch via quantity or CSV/Excel, and publish QR verification records.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--fcs-ink)]">
              Open-Source Self-Hosters
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Connect local Ollama or custom Gemini, Groq, and OpenAI keys securely server-side. No
              subscriptions, watermarks, or feature locks — ever.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
