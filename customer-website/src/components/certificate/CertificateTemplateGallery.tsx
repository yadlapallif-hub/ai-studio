"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { Award, Clock, Heart, Search, Sparkles } from "lucide-react";
import {
  CERTIFICATE_CATEGORIES,
  getCertificateTemplateConfig,
} from "@francis/shared";
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

export function CertificateTemplateGallery({
  templates,
  canCreateOfficial = false,
  isAuthenticated = false,
  initialFavoriteSlugs = [],
  initialRecentSlugs = [],
}: {
  templates: CertificateTemplateCardItem[];
  canCreateOfficial?: boolean;
  isAuthenticated?: boolean;
  initialFavoriteSlugs?: string[];
  initialRecentSlugs?: string[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [orientation, setOrientation] = useState<"all" | "landscape" | "portrait">("all");
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(initialFavoriteSlugs);
  const [recentSlugs, setRecentSlugs] = useState<string[]>(initialRecentSlugs);

  useEffect(() => {
    try {
      const localFavs = JSON.parse(localStorage.getItem("fcs-cert-favs") || "[]") as string[];
      if (localFavs.length > 0 && initialFavoriteSlugs.length === 0) {
        setFavoriteSlugs(localFavs);
      }
      const localRecents = JSON.parse(localStorage.getItem("fcs-cert-recents") || "[]") as string[];
      if (localRecents.length > 0 && initialRecentSlugs.length === 0) {
        setRecentSlugs(localRecents);
      }
    } catch {
      // ignore local storage issues
    }
  }, [initialFavoriteSlugs.length, initialRecentSlugs.length]);

  const toggleFavorite = async (slug: string) => {
    const isFav = favoriteSlugs.includes(slug);
    const next = isFav
      ? favoriteSlugs.filter((s) => s !== slug)
      : [slug, ...favoriteSlugs.filter((s) => s !== slug)];
    setFavoriteSlugs(next);
    try {
      localStorage.setItem("fcs-cert-favs", JSON.stringify(next));
    } catch {
      // ignore
    }

    if (isAuthenticated) {
      await fetch("/api/templates/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_favorite",
          templateSlug: slug,
          templateType: "certificate",
          isFavorite: !isFav,
        }),
      }).catch(() => {});
    }
  };

  const recordRecent = (slug: string) => {
    const next = [slug, ...recentSlugs.filter((s) => s !== slug)].slice(0, 12);
    setRecentSlugs(next);
    try {
      localStorage.setItem("fcs-cert-recents", JSON.stringify(next));
    } catch {
      // ignore
    }
    if (isAuthenticated) {
      fetch("/api/templates/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track_use",
          templateSlug: slug,
          templateType: "certificate",
        }),
      }).catch(() => {});
    }
  };

  const categories = useMemo(() => {
    const list = CERTIFICATE_CATEGORIES.map((c) => ({
      key: c.key as string,
      label: c.label,
    }));
    const known = new Set(list.map((c) => c.key));
    for (const tpl of templates) {
      if (!known.has(tpl.category)) {
        known.add(tpl.category);
        list.push({
          key: tpl.category,
          label: tpl.category.replace(/_/g, " "),
        });
      }
    }
    return [{ key: "all", label: "All Categories" }, ...list];
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (category === "__favorites") {
        if (!favoriteSlugs.includes(tpl.slug)) return false;
      } else if (category === "__recent") {
        if (!recentSlugs.includes(tpl.slug)) return false;
      } else if (category !== "all" && tpl.category !== category) {
        return false;
      }
      if (orientation !== "all" && tpl.orientation !== orientation) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        (tpl.description || "").toLowerCase().includes(q) ||
        tpl.slug.toLowerCase().includes(q)
      );
    });
  }, [templates, search, category, orientation, favoriteSlugs, recentSlugs]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {templates.length} Certificate Templates across {categories.length - 1} Categories
          </h2>
          <p className="text-xs text-[var(--fcs-ink-muted)]">
            Showing {filtered.length} of {templates.length} designs — filter by credential type,
            favorites, or A4 orientation.
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
            placeholder="Search certificate templates (Hackathon, Medical, ISO, Sports, Internship, School, Gold)..."
            className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-xs outline-none focus:border-teal-600"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("__favorites")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
              category === "__favorites"
                ? "bg-rose-600 text-white"
                : "border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Heart className="h-3 w-3" /> Favorites ({favoriteSlugs.length})
          </button>
          <button
            type="button"
            onClick={() => setCategory("__recent")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
              category === "__recent"
                ? "bg-amber-600 text-white"
                : "border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Clock className="h-3 w-3" /> Recently Used ({recentSlugs.length})
          </button>

          {categories.map((cat) => {
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
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
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
          No certificate templates matched your filter. Try selecting &ldquo;All Categories&rdquo; or clearing search.
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
              const isFav = favoriteSlugs.includes(tpl.slug);

              return (
                <div
                  key={tpl.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 transition hover:border-teal-600/50 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => toggleFavorite(tpl.slug)}
                    aria-label={isFav ? `Remove ${tpl.name} from favorites` : `Save ${tpl.name} to favorites`}
                    className={`absolute top-6 right-6 z-10 rounded-full border p-1.5 shadow-xs transition ${
                      isFav
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-black/10 bg-white/90 text-slate-500 hover:text-rose-600"
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                  </button>

                  <div>
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
                      <div className="mt-1 h-0.5 w-10" style={{ backgroundColor: accent }} />
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

                  <SafeNavLink
                    href={`/certificate-builder/new?template=${tpl.slug}`}
                    onClick={() => recordRecent(tpl.slug)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 text-xs font-semibold transition hover:border-teal-600/50 hover:bg-teal-700 hover:text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {canCreateOfficial ? "Open in Studio →" : "Design Sample / Studio →"}
                  </SafeNavLink>
                </div>
              );
            })}
          </div>
        </SlideReveal>
      )}
    </section>
  );
}
