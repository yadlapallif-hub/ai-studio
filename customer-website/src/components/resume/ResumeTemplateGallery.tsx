"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { getResumeTemplateLayout } from "@francis/shared";

export interface ResumeTemplateCardItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  is_ats_friendly: boolean;
  layout_config?: Record<string, unknown>;
}

const CATEGORIES = [
  { key: "all", label: "All Templates" },
  { key: "ats", label: "ATS" },
  { key: "modern", label: "Modern" },
  { key: "executive", label: "Executive" },
  { key: "technical", label: "Technical" },
  { key: "academic", label: "Academic" },
  { key: "minimal", label: "Minimal" },
  { key: "creative", label: "Creative" },
];

export function ResumeTemplateGallery({
  templates,
}: {
  templates: ResumeTemplateCardItem[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [atsOnly, setAtsOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (category !== "all" && tpl.category !== category) return false;
      if (atsOnly && !tpl.is_ats_friendly) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        (tpl.description || "").toLowerCase().includes(q) ||
        tpl.slug.toLowerCase().includes(q)
      );
    });
  }, [templates, search, category, atsOnly]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {templates.length} Free Resume Templates
          </h2>
          <p className="text-xs text-[var(--fcs-ink-muted)]">
            Showing {filtered.length} of {templates.length} layouts — filter by role style, layout
            structure, or ATS optimization.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3 py-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={atsOnly}
            onChange={(e) => setAtsOnly(e.target.checked)}
            className="accent-teal-700"
          />
          <Sparkles className="h-3.5 w-3.5 text-teal-600" />
          ATS-Verified Only
        </label>
      </div>

      {/* Search + Category Filter Bar */}
      <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 100 resume templates (e.g. Executive, Frontend, Minimal, Academic, Creative)..."
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
          No templates matched &ldquo;{search}&rdquo;. Try clearing your search filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tpl) => {
            const fallbackLayout = getResumeTemplateLayout(tpl.slug);
            const cfg = (tpl.layout_config ?? {}) as Partial<typeof fallbackLayout>;
            const accent = cfg.accent || fallbackLayout.accent || "#0F766E";
            const cols = cfg.columns || fallbackLayout.columns || 1;
            const headerAlign = cfg.headerAlign || fallbackLayout.headerAlign || "left";
            const sidebarRight =
              (cfg.sidebarPosition || fallbackLayout.sidebarPosition) === "right";
            const fontFamily = cfg.fontFamily || fallbackLayout.fontFamily || "Inter";

            return (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 transition hover:border-teal-600/50"
              >
                <div>
                  {/* Miniature Wireframe Swatch */}
                  <div className="mb-3 h-28 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-inner">
                    {headerAlign === "band" ? (
                      <div
                        className="-mx-2.5 -mt-2.5 mb-2 px-2.5 py-2"
                        style={{ backgroundColor: accent }}
                      >
                        <div className="h-2 w-20 rounded bg-white/95" />
                        <div className="mt-1 h-1.5 w-12 rounded bg-white/70" />
                      </div>
                    ) : (
                      <div
                        className={`mb-2 border-b pb-1.5 ${
                          headerAlign === "center" ? "flex flex-col items-center" : ""
                        }`}
                        style={{ borderColor: accent }}
                      >
                        <div className="h-2 w-20 rounded bg-slate-800" />
                        <div
                          className="mt-1 h-1.5 w-12 rounded opacity-80"
                          style={{ backgroundColor: accent }}
                        />
                      </div>
                    )}

                    {cols === 2 ? (
                      <div className="grid grid-cols-12 gap-1.5">
                        {sidebarRight ? (
                          <>
                            <div className="col-span-8 space-y-1">
                              <div className="h-1.5 w-full rounded bg-slate-200" />
                              <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                              <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                            </div>
                            <div
                              className="col-span-4 space-y-1 rounded p-1"
                              style={{ backgroundColor: cfg.sidebarTint || "#F1F5F9" }}
                            >
                              <div
                                className="h-1.5 w-full rounded opacity-70"
                                style={{ backgroundColor: accent }}
                              />
                              <div className="h-1.5 w-3/4 rounded bg-slate-300" />
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className="col-span-4 space-y-1 rounded p-1"
                              style={{ backgroundColor: cfg.sidebarTint || "#F1F5F9" }}
                            >
                              <div
                                className="h-1.5 w-full rounded opacity-70"
                                style={{ backgroundColor: accent }}
                              />
                              <div className="h-1.5 w-3/4 rounded bg-slate-300" />
                            </div>
                            <div className="col-span-8 space-y-1">
                              <div className="h-1.5 w-full rounded bg-slate-200" />
                              <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                              <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div
                          className="h-1.5 w-16 rounded opacity-80"
                          style={{ backgroundColor: accent }}
                        />
                        <div className="h-1.5 w-full rounded bg-slate-200" />
                        <div className="h-1.5 w-5/6 rounded bg-slate-200" />
                        <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-[var(--fcs-surface-muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                      {tpl.category}
                    </span>
                    {tpl.is_ats_friendly && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                        <Sparkles className="h-3 w-3" /> ATS
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold leading-snug">{tpl.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--fcs-ink-muted)]">
                    {tpl.description}
                  </p>
                  <p className="mt-2 text-[10px] font-medium text-[var(--fcs-ink-muted)]">
                    {cols === 2 ? "2-Column" : "1-Column"} • {fontFamily}
                  </p>
                </div>

                <Link
                  href={`/resume-builder/new?template=${tpl.slug}`}
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 text-xs font-semibold transition hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300"
                >
                  Use Template →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
