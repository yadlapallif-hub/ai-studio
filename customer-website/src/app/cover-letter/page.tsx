import React from "react";
import type { Metadata } from "next";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { buildPageMetadata } from "@/lib/seo";
import { CoverLetterClient } from "@/components/cover-letter/CoverLetterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Cover Letter Generator",
  description:
    "Tailor compelling cover letters from your saved resume or uploaded file and export as clean PDF or Word DOCX.",
  path: "/cover-letter",
});

export default async function CoverLetterPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const { supabase, user } = await getAuthenticatedContext();

  let letters: never[] = [];
  let resumes: never[] = [];

  if (user) {
    const [{ data: clData }, { data: resData }] = await Promise.all([
      supabase
        .from("fcs_cover_letters")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("fcs_resumes")
        .select("id, title, data")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(15),
    ]);
    letters = (clData ?? []) as never[];
    resumes = (resData ?? []) as never[];
  }

  return (
    <CoverLetterClient
      isAuthenticated={Boolean(user)}
      initialLetters={letters}
      userResumes={resumes}
      initialActiveId={id}
    />
  );
}
