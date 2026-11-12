import { NextResponse } from "next/server";
import { TUTORIAL_CATALOG } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveTutorialVideoUrl } from "@/lib/tutorials";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("fcs_tutorials")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("episode_number", { ascending: true });

    if (!error && data && data.length > 0) {
      const normalized = data.map((row) => ({
        ...row,
        video_url_en: resolveTutorialVideoUrl(row.video_url_en, `${row.slug}-en.mp4`),
        video_url_te: resolveTutorialVideoUrl(row.video_url_te, `${row.slug}-te.mp4`),
      }));
      return NextResponse.json({ tutorials: normalized, source: "database" });
    }
  } catch {
    // fallback cleanly to catalog below
  }

  return NextResponse.json({
    tutorials: TUTORIAL_CATALOG.map((item) => ({
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
      video_url_en: resolveTutorialVideoUrl(null, `${item.slug}-en.mp4`),
      video_url_te: resolveTutorialVideoUrl(null, `${item.slug}-te.mp4`),
      thumbnail_url: `/tutorials/${item.slug}.png`,
      subtitle_vtt_en: `/tutorials/${item.slug}-en.vtt`,
      subtitle_vtt_te: `/tutorials/${item.slug}-te.vtt`,
      transcript_en: item.narrationEn,
      transcript_te: item.narrationTe,
      is_published: true,
      sort_order: item.episodeNumber,
    })),
    source: "catalog",
  });
}
