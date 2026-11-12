import React from "react";
import type { Metadata } from "next";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { buildPageMetadata } from "@/lib/seo";
import { PortfolioBuilderClient } from "@/components/portfolio/PortfolioBuilderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Portfolio Website Builder",
  description:
    "Generate, customize, preview across desktop and mobile, publish live, or export clean HTML/Next.js portfolio source code.",
  path: "/portfolio-builder",
});

export default async function PortfolioBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const { supabase, user } = await getAuthenticatedContext();

  let portfolios: never[] = [];
  let resumes: never[] = [];

  if (user) {
    const [{ data: pfData }, { data: resData }] = await Promise.all([
      supabase
        .from("fcs_portfolios")
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
    portfolios = (pfData ?? []) as never[];
    resumes = (resData ?? []) as never[];
  }

  return (
    <PortfolioBuilderClient
      isAuthenticated={Boolean(user)}
      initialPortfolios={portfolios}
      userResumes={resumes}
      initialActiveId={id}
    />
  );
}
