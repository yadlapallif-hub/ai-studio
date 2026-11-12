import React from "react";
import type { Metadata } from "next";
import { TUTORIAL_CATALOG } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import {
  TutorialsCenterClient,
  type TutorialRecord,
} from "@/components/tutorials/TutorialsCenterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Video Tutorials Center (English & Telugu)",
  description:
    "Watch 12 step-by-step video walkthroughs for AI Resume Studio, Certificate Design Studio, QR Verification, Creator AI, Document Vault, and Admin Operations in English and Telugu.",
  path: "/tutorials",
});

function catalogFallback(): TutorialRecord[] {
  return TUTORIAL_CATALOG.map((item) => ({
    id: item.slug,
    slug: item.slug,
    episode_number: item.episodeNumber,
    category: item.category,
    section_key: item.sectionKey,
    section_route: item.sectionRoute,
    title_en: item.titleEn,
    title_te: item.titleTe,
    description_en: item.descriptionEn,
    description_te: item.descriptionTe,
    duration_seconds: item.durationSeconds,
    video_url_en: `/api/tutorials/stream?file=${item.slug}-en.mp4`,
    video_url_te: `/api/tutorials/stream?file=${item.slug}-te.mp4`,
    thumbnail_url: `/tutorials/${item.slug}.png`,
    subtitle_vtt_en: `/tutorials/${item.slug}-en.vtt`,
    subtitle_vtt_te: `/tutorials/${item.slug}-te.vtt`,
    transcript_en: item.narrationEn,
    transcript_te: item.narrationTe,
    is_published: true,
    sort_order: item.episodeNumber,
  }));
}

export default async function TutorialsPage({
  searchParams,
}: {
  searchParams: Promise<{ watch?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  let tutorials: TutorialRecord[] = catalogFallback();

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("fcs_tutorials")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("episode_number", { ascending: true });

    if (!error && data && data.length > 0) {
      tutorials = data as TutorialRecord[];
    }
  } catch {
    // use fallback cleanly
  }

  const videoListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Francis Creator Studio Video Tutorials",
    itemListElement: tutorials.map((t, index) => ({
      "@type": "VideoObject",
      position: index + 1,
      name: t.title_en,
      description: t.description_en,
      thumbnailUrl: `${SITE_URL}${t.thumbnail_url || `/tutorials/${t.slug}.png`}`,
      contentUrl: `${SITE_URL}${t.video_url_en || `/api/tutorials/stream?file=${t.slug}-en.mp4`}`,
      duration: `PT${t.duration_seconds}S`,
      inLanguage: ["en", "te"],
    })),
  };

  return (
    <div className="min-h-screen bg-[var(--fcs-bg)] text-[var(--fcs-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoListJsonLd) }}
      />
      <TutorialsCenterClient
        tutorials={tutorials}
        initialWatchSlug={sp.watch}
        initialLang={sp.lang === "te" ? "te" : "en"}
      />
    </div>
  );
}
