import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildDeterministicCertificateDesignPatch,
  type CertificateAiDesignPatch,
} from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { invokeCreatorAi } from "@/lib/ai-server";

const DesignAiSchema = z.object({
  prompt: z.string().trim().min(2).max(1200),
  currentDesign: z
    .object({
      title: z.string().optional(),
      recipientName: z.string().optional(),
      courseOrAchievement: z.string().optional(),
      organizationName: z.string().optional(),
      titleFontSize: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = DesignAiSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Enter a certificate design prompt." },
      { status: 400 }
    );
  }

  const deterministic = buildDeterministicCertificateDesignPatch(
    parsed.data.prompt,
    parsed.data.currentDesign
  );

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let aiReplyText = deterministic.summary;
  let finalPatch: CertificateAiDesignPatch = deterministic;
  let providerUsed = "creator-ai-design-engine";

  if (session?.access_token && session.user?.id) {
    try {
      const llmRes = await invokeCreatorAi({
        accessToken: session.access_token,
        userId: session.user.id,
        mode: "certificate_assist",
        contextPage: "/certificate-builder",
        contextData: parsed.data.currentDesign as Record<string, unknown>,
        messages: [
          {
            role: "user",
            content:
              `Generate or modify certificate design based on this request: "${parsed.data.prompt}". ` +
              `Respond ONLY with valid JSON matching keys: summary, recommendedTemplateSlug, fields (title, recipientName, courseOrAchievement, organizationName, description, signatoryName, signatoryDesignation), stylePatch (backgroundColor, primaryColor, accentColor, borderStyle, fontDisplay, fontBody, titleFontSize), orientation ('landscape'|'portrait').`,
          },
        ],
      });

      if (llmRes.ok && llmRes.provider && llmRes.provider !== "creator-ai-guide" && llmRes.reply) {
        providerUsed = llmRes.provider;
        const jsonMatch = llmRes.reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedLlm = JSON.parse(jsonMatch[0]) as CertificateAiDesignPatch;
            finalPatch = {
              summary: parsedLlm.summary || deterministic.summary,
              recommendedTemplateSlug:
                parsedLlm.recommendedTemplateSlug || deterministic.recommendedTemplateSlug,
              fields: { ...deterministic.fields, ...(parsedLlm.fields || {}) },
              stylePatch: { ...deterministic.stylePatch, ...(parsedLlm.stylePatch || {}) },
              orientation: parsedLlm.orientation || deterministic.orientation,
              elementActions: deterministic.elementActions,
            };
            aiReplyText = finalPatch.summary;
          } catch {
            aiReplyText = deterministic.summary;
          }
        }
      }
    } catch {
      // keep deterministic engine cleanly
    }
  }

  return NextResponse.json({
    ok: true,
    provider: providerUsed,
    summary: aiReplyText,
    patch: finalPatch,
  });
}
