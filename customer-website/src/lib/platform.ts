import { createServerSupabase } from "@/lib/supabase/server";
import type { PublicBranding, WebsiteContent } from "@francis/shared";

export interface PublicPlatformData {
  branding: PublicBranding;
  websiteContent: WebsiteContent;
  footerContent: {
    credit: string;
    license: string;
    githubUrl: string;
    contactEmail: string;
    disclaimer: string;
  };
  announcements: Array<{
    id: string;
    title: string;
    message: string;
    variant: "info" | "success" | "warning";
    link_label?: string | null;
    link_url?: string | null;
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category: string;
  }>;
}

const DEFAULT_BRANDING: PublicBranding = {
  platformName: "CREATOR STUDIO",
  tagline: "Create Your Future. Design Your Identity.",
  developerCredit: "Built by Francis",
  accentHex: "#0F766E",
  githubUrl: "https://github.com/yadlapallif-hub/ai-studio",
  supportEmail: "support@franciscreatorstudio.org",
  license: "MIT",
};

const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  heroBadge: "100% Free & Open-Source • MIT Licensed",
  heroHeadline: "Precision Resume & Certificate Engineering, Built for Everyone.",
  heroSubheadline:
    "Craft ATS-ready resumes and—for Admin-approved Authorized Organizations—design verifiable official certificates with custom stamps and QR verification, guided by Creator AI with zero paywalls.",
  primaryCta: "Launch Resume Studio",
  secondaryCta: "Launch Certificate Studio",
  openSourceNote:
    "Creator Studio is free software with zero subscriptions, zero paid downloads, and zero hidden locks. Self-host with your own Supabase instance and AI provider.",
};

const DEFAULT_FOOTER = {
  credit: "Built by Francis",
  license: "Released under the MIT Open-Source License",
  githubUrl: "https://github.com/yadlapallif-hub/ai-studio",
  contactEmail: "support@franciscreatorstudio.org",
  disclaimer:
    "Certificate creation and official organizational stamps are restricted exclusively to Admin-approved Authorized Organizations.",
};

export async function getPublicPlatformData(): Promise<PublicPlatformData> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      branding: DEFAULT_BRANDING,
      websiteContent: DEFAULT_WEBSITE_CONTENT,
      footerContent: DEFAULT_FOOTER,
      announcements: [],
      faqs: [],
    };
  }

  try {
    const supabase = await createServerSupabase();

      const queryPromise = Promise.all([
        supabase
          .from("fcs_platform_settings")
          .select("key, value")
          .eq("is_public", true)
          .in("key", ["branding", "website_content", "footer_content"]),
        supabase
          .from("fcs_announcements")
          .select("id, title, message, variant, link_label, link_url")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("fcs_faqs")
          .select("id, question, answer, category")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
      ]);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Platform lookup timeout")), 2500)
      );

      const [{ data: settings }, { data: announcements }, { data: faqs }] = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]);

    const settingsMap = new Map<string, Record<string, unknown>>();
    for (const row of settings ?? []) {
      settingsMap.set(row.key, row.value as Record<string, unknown>);
    }

    return {
      branding: { ...DEFAULT_BRANDING, ...(settingsMap.get("branding") ?? {}) } as PublicBranding,
      websiteContent: {
        ...DEFAULT_WEBSITE_CONTENT,
        ...(settingsMap.get("website_content") ?? {}),
      } as WebsiteContent,
      footerContent: {
        ...DEFAULT_FOOTER,
        ...(settingsMap.get("footer_content") ?? {}),
      } as PublicPlatformData["footerContent"],
      announcements: (announcements ?? []) as PublicPlatformData["announcements"],
      faqs: (faqs ?? []) as PublicPlatformData["faqs"],
    };
  } catch {
    return {
      branding: DEFAULT_BRANDING,
      websiteContent: DEFAULT_WEBSITE_CONTENT,
      footerContent: DEFAULT_FOOTER,
      announcements: [],
      faqs: [],
    };
  }
}
