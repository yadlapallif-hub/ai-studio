"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Captions,
  Clock,
  ExternalLink,
  Maximize2,
  Play,
  Video,
  X,
} from "lucide-react";
import { TUTORIAL_CATALOG, type TutorialCatalogItem } from "@francis/shared";

interface TutorialItem {
  slug: string;
  episode_number: number;
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
  section_key: string;
  section_route: string;
}

function fromCatalog(def: TutorialCatalogItem): TutorialItem {
  return {
    slug: def.slug,
    episode_number: def.episodeNumber,
    title_en: def.titleEn,
    title_te: def.titleTe,
    description_en: def.descriptionEn,
    description_te: def.descriptionTe,
    duration_seconds: def.durationSeconds,
    video_url_en: `/api/tutorials/stream?file=${def.slug}-en.mp4`,
    video_url_te: `/api/tutorials/stream?file=${def.slug}-te.mp4`,
    thumbnail_url: `/tutorials/${def.slug}.png`,
    subtitle_vtt_en: `/tutorials/${def.slug}-en.vtt`,
    subtitle_vtt_te: `/tutorials/${def.slug}-te.vtt`,
    transcript_en: def.narrationEn,
    transcript_te: def.narrationTe,
    section_key: def.sectionKey,
    section_route: def.sectionRoute,
  };
}

export function WatchTutorialButton({
  sectionKey,
  slug,
  label = "Watch Tutorial",
  variant = "pill",
  className = "",
}: {
  sectionKey?: string;
  slug?: string;
  label?: string;
  variant?: "pill" | "compact" | "inline";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "te">("en");
  const [speed, setSpeed] = useState<number>(1);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [dbItem, setDbItem] = useState<TutorialItem | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const fallback = useMemo(() => {
    const match = TUTORIAL_CATALOG.find(
      (item) => (slug && item.slug === slug) || (sectionKey && item.sectionKey === sectionKey)
    );
    return match ? fromCatalog(match) : fromCatalog(TUTORIAL_CATALOG[0]);
  }, [sectionKey, slug]);

  const active = dbItem ?? fallback;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/tutorials")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { tutorials?: TutorialItem[] } | null) => {
        if (cancelled || !payload?.tutorials) return;
        const found = payload.tutorials.find(
          (item) =>
            (slug && item.slug === slug) ||
            (sectionKey && item.section_key === sectionKey)
        );
        if (found) setDbItem(found);
      })
      .catch(() => {
        // fallback already loaded
      });
    return () => {
      cancelled = true;
    };
  }, [open, sectionKey, slug]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed, lang, open]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!captionsOn) {
        track.mode = "disabled";
      } else {
        track.mode = track.language === lang ? "showing" : "disabled";
      }
    }
  }, [captionsOn, lang, open]);

  const baseStyle =
    variant === "compact"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-teal-700/25 bg-teal-50/85 px-2.5 py-1 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/70"
      : variant === "inline"
        ? "inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
        : "inline-flex items-center gap-1.5 rounded-full border border-teal-700/25 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-800 shadow-xs transition hover:border-teal-600/40 hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/70";

  const currentVideoSrc =
    lang === "te"
      ? active.video_url_te || active.video_url_en || `/api/tutorials/stream?file=${active.slug}-te.mp4`
      : active.video_url_en || `/api/tutorials/stream?file=${active.slug}-en.mp4`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${baseStyle} cursor-pointer whitespace-nowrap ${className}`}
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={lang === "te" ? active.title_te : active.title_en}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fcs-border)] px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  <Video className="h-3.5 w-3.5" />
                  <span>Episode {String(active.episode_number).padStart(2, "0")}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {Math.floor(active.duration_seconds / 60)}:
                    {String(active.duration_seconds % 60).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-0.5 truncate text-sm font-bold text-[var(--fcs-ink)] sm:text-base">
                  {lang === "te" ? active.title_te : active.title_en}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLang("en");
                      setVideoError(false);
                    }}
                    className={`rounded-md px-2.5 py-1 font-semibold transition ${
                      lang === "en" ? "bg-teal-700 text-white" : "text-[var(--fcs-ink-muted)]"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLang("te");
                      setVideoError(false);
                    }}
                    className={`rounded-md px-2.5 py-1 font-semibold transition ${
                      lang === "te" ? "bg-teal-700 text-white" : "text-[var(--fcs-ink-muted)]"
                    }`}
                  >
                    తెలుగు
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCaptionsOn((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    captionsOn
                      ? "border-teal-600/40 bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                      : "border-[var(--fcs-border)] text-[var(--fcs-ink-muted)]"
                  }`}
                >
                  <Captions className="h-3.5 w-3.5" />
                  {captionsOn ? "CC On" : "CC Off"}
                </button>

                <select
                  aria-label="Playback speed"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1.5 text-xs font-semibold"
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <option key={r} value={r}>
                      {r}x
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close tutorial modal"
                  className="rounded-lg border border-[var(--fcs-border)] p-1.5 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="bg-black">
              <video
                ref={videoRef}
                key={currentVideoSrc}
                src={currentVideoSrc}
                poster={active.thumbnail_url || undefined}
                controls
                playsInline
                preload="metadata"
                onError={() => setVideoError(true)}
                onCanPlay={() => setVideoError(false)}
                className="aspect-video w-full bg-black"
              >
                {active.subtitle_vtt_en && (
                  <track
                    kind="subtitles"
                    src={active.subtitle_vtt_en}
                    srcLang="en"
                    label="English"
                    default={lang === "en"}
                  />
                )}
                {active.subtitle_vtt_te && (
                  <track
                    kind="subtitles"
                    src={active.subtitle_vtt_te}
                    srcLang="te"
                    label="తెలుగు (Telugu)"
                    default={lang === "te"}
                  />
                )}
              </video>
              {videoError && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/30 bg-slate-950 px-4 py-2.5 text-xs text-slate-200">
                  <span className="text-amber-300">
                    {lang === "te"
                      ? "తెలుగు ఆడియో త్వరలో వస్తుంది — ఇంగ్లీష్ వీడియో + తెలుగు సబ్‌టైటిల్స్ చూడండి."
                      : "Clip awaiting audio synthesis batch — click All 12 Tutorials for synchronized transcript."}
                  </span>
                  {lang === "te" && active.episode_number <= 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLang("en");
                        setCaptionsOn(true);
                        setVideoError(false);
                      }}
                      className="rounded-md bg-teal-600 px-2.5 py-1 font-semibold text-white hover:bg-teal-500"
                    >
                      Play EN + తెలుగు Captions
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fcs-border)] px-5 py-3.5 text-xs">
              <p className="max-w-xl text-[var(--fcs-ink-muted)]">
                {lang === "te" ? active.description_te : active.description_en}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => videoRef.current?.requestFullscreen?.()}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 font-semibold hover:bg-[var(--fcs-surface-muted)]"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
                </button>
                <Link
                  href={`/tutorials?watch=${encodeURIComponent(active.slug)}&lang=${lang}`}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white hover:bg-teal-800"
                >
                  All 12 Tutorials <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
