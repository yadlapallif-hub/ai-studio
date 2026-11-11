import React from "react";
import { notFound } from "next/navigation";
import {
  RESUME_TEMPLATE_CATALOG,
  createDefaultResumeStyle,
  createSampleStarterResumeData,
  type ResumeData,
  type ResumeStyleConfig,
} from "@francis/shared";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { ResumeStudio } from "@/components/resume/ResumeStudio";

export const dynamic = "force-dynamic";

export default async function ResumeEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { id } = await params;
  const { template } = await searchParams;
  const { supabase, user } = await getAuthenticatedContext();

  const { data: templates } = await supabase
    .from("fcs_resume_templates")
    .select("id, slug, name, category, is_ats_friendly, description, layout_config")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const tplList =
    templates && templates.length > 0
      ? templates
      : RESUME_TEMPLATE_CATALOG.map((t) => ({
          id: t.slug,
          slug: t.slug,
          name: t.name,
          category: t.category,
          is_ats_friendly: t.isAtsFriendly,
          description: t.description,
          layout_config: t.layoutConfig as unknown as Record<string, unknown>,
        }));

  if (id === "new") {
    const selectedSlug =
      tplList.find((t) => t.slug === template)?.slug || tplList[0]?.slug || "ats-clean";
    const matchedTpl = tplList.find((t) => t.slug === selectedSlug);
    const layoutCfg = (matchedTpl?.layout_config ?? {}) as {
      fontFamily?: string;
      accent?: string;
      photoSupported?: boolean;
    };

    return (
      <ResumeStudio
        initialResumeId={null}
        initialTitle="My Professional Resume"
        initialTemplateSlug={selectedSlug}
        initialTargetRole="Software Developer"
        initialData={createSampleStarterResumeData()}
        initialStyle={createDefaultResumeStyle({
          fontFamily: layoutCfg.fontFamily || "Inter",
          accentColor: layoutCfg.accent || "#0F766E",
          showPhoto: Boolean(layoutCfg.photoSupported),
        })}
        templates={tplList}
        isAuthenticated={Boolean(user)}
      />
    );
  }

  if (!user) {
    notFound();
  }

  const { data: resume } = await supabase
    .from("fcs_resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!resume) {
    notFound();
  }

  return (
    <ResumeStudio
      initialResumeId={resume.id}
      initialTitle={resume.title}
      initialTemplateSlug={resume.template_slug}
      initialTargetRole={resume.target_role || ""}
      initialData={resume.data as ResumeData}
      initialStyle={{
        ...createDefaultResumeStyle(),
        ...(resume.style_config as Partial<ResumeStyleConfig>),
      }}
      templates={tplList}
      isAuthenticated={true}
    />
  );
}
