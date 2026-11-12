"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Captions,
  Clock,
  Film,
  Languages,
  Maximize2,
  Play,
  Search,
  SkipForward,
} from "lucide-react";
import { TUTORIAL_CATEGORIES, type TutorialCategoryKey } from "@francis/shared";

export interface TutorialRecord {
  id: string;
  slug: string;
  episode_number: number;
  category: TutorialCategoryKey;
  section_key: string;
  section_route: string;
  title_en: string;
  title_te: string;
  description_en: string;
  description_te: string;
  duration_seconds: number;
  video_url_en: string | null;
  video_url_te: string | null;
  thumbnail_url: string | null;
  subtitle_vtt_en: string | null;
  subtitle_vtt_te: string | null;
  transcript_en?: string | null;
  transcript_te?: string | null;
  is_published: boolean;
  sort_order: number;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TutorialsCenterClient({
  tutorials,
  initialWatchSlug,
  initialLang = "en",
}: {
  tutorials: TutorialRecord[];
  initialWatchSlug?: string;
  initialLang?: "en" | "te";
}) {
  const [lang, setLang] = useState<"en" | "te">(initialLang);
  const [category, setCategory] = useState<"all" | TutorialCategoryKey>("all");
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string>(() => {
    if (initialWatchSlug && tutorials.some((t) => t.slug === initialWatchSlug)) {
      return initialWatchSlug;
    }
    return tutorials[0]?.slug ?? "";
  });
  const [speed, setSpeed] = useState<number>(1);
  const [captionsMode, setCaptionsMode] = useState<"en" | "te" | "off">(initialLang);
  const [showTranscript, setShowTranscript] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeTutorial = useMemo(
    () => tutorials.find((t) => t.slug === activeSlug) ?? tutorials[0] ?? null,
    [tutorials, activeSlug]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutorials.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title_en.toLowerCase().includes(q) ||
        item.title_te.toLowerCase().includes(q) ||
        item.description_en.toLowerCase().includes(q) ||
        item.description_te.toLowerCase().includes(q) ||
        item.section_key.toLowerCase().includes(q)
      );
    });
  }, [tutorials, category, query]);

  const nextTutorial = useMemo(() => {
    if (!activeTutorial || tutorials.length === 0) return null;
    const idx = tutorials.findIndex((t) => t.slug === activeTutorial.slug);
    return tutorials[(idx + 1) % tutorials.length] ?? null;
  }, [tutorials, activeTutorial]);

  const relatedTutorials = useMemo(() => {
    if (!activeTutorial) return [];
    const sameCat = tutorials.filter(
      (t) => t.slug !== activeTutorial.slug && t.category === activeTutorial.category
    );
    const others = tutorials.filter(
      (t) => t.slug !== activeTutorial.slug && t.category !== activeTutorial.category
    );
    return [...sameCat, ...others].slice(0, 4);
  }, [tutorials, activeTutorial]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed, lang, activeSlug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (captionsMode === "off") {
        track.mode = "disabled";
      } else {
        track.mode = track.language === captionsMode ? "showing" : "disabled";
      }
    }
  }, [captionsMode, activeSlug, lang]);

  const handleSelectLanguage = (nextLang: "en" | "te") => {
    setLang(nextLang);
    setVideoError(false);
    if (captionsMode !== "off") {
      setCaptionsMode(nextLang);
    }
  };

  const activeVideoUrl = activeTutorial
    ? lang === "te"
      ? activeTutorial.video_url_te ||
        activeTutorial.video_url_en ||
        `/api/tutorials/stream?file=${activeTutorial.slug}-te.mp4`
      : activeTutorial.video_url_en ||
        `/api/tutorials/stream?file=${activeTutorial.slug}-en.mp4`
    : "";

  const selectEpisode = (slug: string) => {
    setActiveSlug(slug);
    setVideoError(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("watch", slug);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header & Language Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--fcs-border)] pb-6">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            <Film className="h-3.5 w-3.5" /> Video Walkthrough Library
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
            {lang === "te" ? "Creator Studio వీడియో ట్యుటోరియల్స్" : "Francis Creator Studio Tutorials"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--fcs-ink-muted)]">
            {lang === "te"
              ? "వెబ్‌సైట్‌లోని ప్రతి స్టూడియో మరియు ఫీచర్ కోసం తెలుగు మరియు ఇంగ్లీష్‌లో 12 దశలవారీ వీడియో గైడ్‌లు."
              : "12 real screen-recorded walkthroughs with English & Telugu audio, synchronized captions, playback speed controls, and direct links to every tool."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--fcs-ink-muted)]">
            <Languages className="h-4 w-4" /> Audio &amp; UI:
          </span>
          <div className="inline-flex rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1 shadow-xs">
            <button
              type="button"
              onClick={() => handleSelectLanguage("en")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                lang === "en"
                  ? "bg-teal-700 text-white"
                  : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleSelectLanguage("te")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                lang === "te"
                  ? "bg-teal-700 text-white"
                  : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              తెలుగు (Telugu)
            </button>
          </div>
        </div>
      </div>

      {/* Featured Player */}
      {activeTutorial && (
        <section className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="overflow-hidden rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] shadow-sm lg:col-span-8">
            <div className="relative bg-black">
              <video
                ref={videoRef}
                key={activeVideoUrl}
                src={activeVideoUrl}
                poster={activeTutorial.thumbnail_url || undefined}
                controls
                playsInline
                preload="metadata"
                onError={() => {
                  setVideoError(true);
                  setShowTranscript(true);
                }}
                onCanPlay={() => setVideoError(false)}
                onEnded={() => {
                  if (nextTutorial) selectEpisode(nextTutorial.slug);
                }}
                className="aspect-video w-full bg-black"
              >
                {activeTutorial.subtitle_vtt_en && (
                  <track
                    kind="subtitles"
                    src={activeTutorial.subtitle_vtt_en}
                    srcLang="en"
                    label="English"
                    default={captionsMode === "en"}
                  />
                )}
                {activeTutorial.subtitle_vtt_te && (
                  <track
                    kind="subtitles"
                    src={activeTutorial.subtitle_vtt_te}
                    srcLang="te"
                    label="తెలుగు"
                    default={captionsMode === "te"}
                  />
                )}
              </video>

              {videoError && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-500/30 bg-slate-950/95 px-4 py-3 text-xs text-slate-200">
                  <div>
                    <p className="font-semibold text-amber-300">
                      {lang === "te"
                        ? "తెలుగు వాయిస్-ఓవర్ త్వరలో అందుబాటులోకి వస్తుంది (ఇప్పటికే తెలుగు సబ్‌టైటిల్స్ & ట్రాన్స్‌క్రిప్ట్ సిద్ధంగా ఉన్నాయి)."
                        : "This clip's narration audio is queued in the final studio batch — step-by-step transcript is expanded below."}
                    </p>
                  </div>
                  {lang === "te" && activeTutorial.episode_number <= 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLang("en");
                        setCaptionsMode("te");
                        setVideoError(false);
                      }}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-500"
                    >
                      Play English Video + తెలుగు Captions
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                    Episode {String(activeTutorial.episode_number).padStart(2, "0")} / {tutorials.length}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--fcs-ink-muted)]">
                    <Clock className="h-3.5 w-3.5" /> {formatDuration(activeTutorial.duration_seconds)}
                  </span>
                </div>

                {/* Player Controls Bar */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 font-semibold">
                    <span>Speed</span>
                    <select
                      aria-label="Playback speed"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="bg-transparent outline-none"
                    >
                      {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                        <option key={r} value={r}>
                          {r}x
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 font-semibold">
                    <Captions className="h-3.5 w-3.5 text-teal-600" />
                    <select
                      aria-label="Subtitles language"
                      value={captionsMode}
                      onChange={(e) => setCaptionsMode(e.target.value as "en" | "te" | "off")}
                      className="bg-transparent outline-none"
                    >
                      <option value="en">EN Subtitles</option>
                      <option value="te">తెలుగు Subtitles</option>
                      <option value="off">Subtitles Off</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => videoRef.current?.requestFullscreen?.()}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 font-semibold hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
                  </button>

                  {nextTutorial && (
                    <button
                      type="button"
                      onClick={() => selectEpisode(nextTutorial.slug)}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white hover:bg-teal-800"
                    >
                      <SkipForward className="h-3.5 w-3.5" /> Next Video
                    </button>
                  )}
                </div>
              </div>

              <h2 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
                {lang === "te" ? activeTutorial.title_te : activeTutorial.title_en}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fcs-ink-muted)]">
                {lang === "te" ? activeTutorial.description_te : activeTutorial.description_en}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--fcs-border)] pt-4">
                <Link
                  href={activeTutorial.section_route}
                  className="fcs-btn-primary px-4 py-2 text-xs"
                >
                  Open Feature Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className="fcs-btn-secondary px-4 py-2 text-xs"
                >
                  {showTranscript ? "Hide Voice-over Transcript" : "Read Voice-over Transcript"}
                </button>
              </div>

              {showTranscript && (
                <div className="mt-4 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
                  <p className="mb-1.5 font-semibold text-[var(--fcs-ink)]">
                    {lang === "te" ? "తెలుగు ట్రాన్స్‌క్రిప్ట్" : "English Transcript"}
                  </p>
                  {lang === "te"
                    ? activeTutorial.transcript_te || activeTutorial.description_te
                    : activeTutorial.transcript_en || activeTutorial.description_en}
                </div>
              )}
            </div>
          </div>

          {/* Up Next & Related */}
          <aside className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 lg:col-span-4">
            <div className="flex items-center justify-between border-b border-[var(--fcs-border)] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--fcs-ink-muted)]">
                Up Next &amp; Related
              </h3>
              <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400">
                {tutorials.length} Videos
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {relatedTutorials.map((rel) => (
                <button
                  key={rel.slug}
                  type="button"
                  onClick={() => selectEpisode(rel.slug)}
                  className="group flex w-full items-start gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-[var(--fcs-border)] hover:bg-[var(--fcs-surface-muted)]"
                >
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--fcs-border)] bg-slate-900">
                    {rel.thumbnail_url && (
                      <img
                        src={rel.thumbnail_url}
                        alt={lang === "te" ? rel.title_te : rel.title_en}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 py-0.5 font-mono text-[9px] font-semibold text-white">
                      {formatDuration(rel.duration_seconds)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase text-teal-700 dark:text-teal-400">
                      Ep. {String(rel.episode_number).padStart(2, "0")}
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-xs font-bold text-[var(--fcs-ink)]">
                      {lang === "te" ? rel.title_te : rel.title_en}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </section>
      )}

      {/* Search & Category Filter */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                category === "all"
                  ? "bg-teal-700 text-white"
                  : "border border-[var(--fcs-border)] bg-[var(--fcs-surface)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              All 12 Tutorials
            </button>
            {TUTORIAL_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  category === cat.key
                    ? "bg-teal-700 text-white"
                    : "border border-[var(--fcs-border)] bg-[var(--fcs-surface)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                {lang === "te" ? cat.labelTe : cat.labelEn}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fcs-ink-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "te" ? "ట్యుటోరియల్ వెతకండి..." : "Search tutorials..."}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] py-2 pr-3 pl-9 text-xs outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {/* Video Cards Grid */}
        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-10 text-center text-sm text-[var(--fcs-ink-muted)]">
            No tutorials match your search filter. Clear your search to view all episodes.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const isPlaying = activeTutorial?.slug === item.slug;
              return (
                <article
                  key={item.slug}
                  className={`flex flex-col overflow-hidden rounded-2xl border transition ${
                    isPlaying
                      ? "border-teal-600 bg-[var(--fcs-surface)] ring-2 ring-teal-600/20"
                      : "border-[var(--fcs-border)] bg-[var(--fcs-surface)] hover:border-teal-600/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectEpisode(item.slug)}
                    className="group relative aspect-video w-full overflow-hidden bg-slate-900 text-left"
                  >
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt={lang === "te" ? item.title_te : item.title_en}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg">
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                      </span>
                    </div>
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                      EP {String(item.episode_number).padStart(2, "0")}
                    </span>
                    <span className="absolute right-2.5 bottom-2.5 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                      {formatDuration(item.duration_seconds)}
                    </span>
                  </button>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="text-sm font-bold leading-snug text-[var(--fcs-ink)]">
                        {lang === "te" ? item.title_te : item.title_en}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
                        {lang === "te" ? item.description_te : item.description_en}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[var(--fcs-border)] pt-3 text-xs">
                      <button
                        type="button"
                        onClick={() => selectEpisode(item.slug)}
                        className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-400"
                      >
                        <Play className="h-3.5 w-3.5" /> {isPlaying ? "Playing Now" : "Watch Video"}
                      </button>
                      <Link
                        href={item.section_route}
                        className="text-[11px] font-medium text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                      >
                        Open Section →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
