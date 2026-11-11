"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Award, Lock, Search } from "lucide-react";
import { getCertificateTemplateConfig } from "@francis/shared";
import { SlideReveal } from "@/components/motion/SlideReveal";

export interface CertificateTemplateCardItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  orientation: "landscape" | "portrait";
  layout_config?: Record<string, unknown>;
}

const CATEGORIES = [
  { key: "all", label: "All Categories" },
  { key: "course_completion", label: "Course Completion" },
  { key: "internship", label: "Internship" },
  { key: "achievement", label: "Achievement" },
  { key: "participation", label: "Participation" },
  { key: "excellence", label: "Excellence" },
  { key: "appreciation", label: "Appreciation" },
  { key: "training", label: "Training" },
  { key: "professional", label: "Professional" },
  { key: "educational", label: "Educational" },
];

export function CertificateTemplateGallery({
  templates,
  canCreateCertificates = false,
}: {
  templates: CertificateTemplateCardItem[];
  canCreateCertificates?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [orientation, setOrientation] = useState<"all" | "landscape" | "portrait">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (category !== "all" && tpl.category !== category) return false;
      if (orientation !== "all" && tpl.orientation !== orientation) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        (tpl.description || "").toLowerCase().includes(q) ||
        tpl.slug.toLowerCase().includes(q)
      );
    });
  }, [templates, search, category, orientation]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {templates.length} Certificate Templates across 9 Categories
          </h2>
          <p className="text-xs text-[var(--fcs-ink-muted)]">
            Showing {filtered.length} of {templates.length} designs — filter by credential type or
            A4 orientation.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1 text-xs font-semibold">
          {(["all", "landscape", "portrait"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrientation(o)}
              className={`rounded-lg px-3 py-1 capitalize transition ${
                orientation === o
                  ? "bg-teal-700 text-white"
                  : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              {o === "all" ? "All Orientations" : o}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Category Bar */}
      <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 100 certificate templates (e.g. Hackathon, Internship, Gold, Diploma, ISO)..."
            className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-xs outline-none focus:border-teal-600"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const count =
              cat.key === "all"
                ? templates.length
                : templates.filter((t) => t.category === cat.key).length;
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-teal-700 text-white"
                    : "border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-10 text-center text-sm text-[var(--fcs-ink-muted)]">
          No certificate templates matched &ldquo;{search}&rdquo;. Try clearing your filters.
        </div>
      ) : (
        <SlideReveal direction="up" delay={70}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tpl) => {
            const fallback = getCertificateTemplateConfig(tpl.slug)?.layoutConfig;
            const cfg = (tpl.layout_config ?? {}) as Record<string, string>;
            const bg = cfg.background || fallback?.background || "#FFFDF7";
            const primary = cfg.primaryColor || fallback?.primaryColor || "#0F4C5C";
            const accent = cfg.accentColor || fallback?.accentColor || "#C59B27";
            const titleDefault = cfg.titleDefault || fallback?.titleDefault || tpl.name;

            return (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 transition hover:border-teal-600/50"
              >
                <div>
                  {/* Miniature Certificate Frame Preview */}
                  <div
                    className="relative mb-3 flex h-28 flex-col items-center justify-center overflow-hidden rounded-xl border p-3 text-center shadow-inner"
                    style={{
                      backgroundColor: bg,
                      borderColor: accent,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-1.5 border"
                      style={{ borderColor: accent }}
                    />
                    <Award className="h-4 w-4" style={{ color: accent }} />
                    <p
                      className="mt-1 line-clamp-1 font-serif text-xs font-bold"
                      style={{ color: primary }}
                    >
                      {titleDefault}
                    </p>
                    <div
                      className="mt-1 h-0.5 w-10"
                      style={{ backgroundColor: accent }}
                    />
                    <p
                      className="mt-1 text-[9px] tracking-widest uppercase opacity-75"
                      style={{ color: primary }}
                    >
                      A4 {tpl.orientation}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-[var(--fcs-surface-muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                      {tpl.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-[var(--fcs-ink-muted)]">
                      {tpl.orientation}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold leading-snug">{tpl.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--fcs-ink-muted)]">
                    {tpl.description}
                  </p>
                </div>

                {canCreateCertificates ? (
                  <Link
                    href={`/certificate-builder/new?template=${tpl.slug}`}
                    className="mt-4 inline-flex items-center justify-center rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 text-xs font-semibold transition hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300"
                  >
                    Open Template →
                  </Link>
                ) : (
                  <Link
                    href="/verify"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 text-xs font-semibold text-[var(--fcs-ink-muted)] transition hover:border-amber-600/40 hover:text-amber-800 dark:hover:text-amber-300"
                  >
                    <Lock className="h-3.5 w-3.5" /> Authorized Access Required
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        </SlideReveal>
      )}
    </section>
  );
}
