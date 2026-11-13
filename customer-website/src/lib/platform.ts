import { createServerSupabase } from "@/lib/supabase/server";
import type { PublicBranding, WebsiteContent } from "@francis/shared";

export interface PublicPlatformStats {
  resumeTemplates: number;
  certificateTemplates: number;
  categories: number;
  tutorials: number;
  totalResumesCreated: number;
  totalCertificatesIssued: number;
  verifiedIssuersCount: number;
}

export interface PublicTestimonialItem {
  id: string;
  author_name: string;
  author_role: string;
  organization: string | null;
  quote: string;
  rating: number;
  created_at: string;
}

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
  stats: PublicPlatformStats;
  testimonials: PublicTestimonialItem[];
}

const DEFAULT_BRANDING: PublicBranding = {
  platformName: "FRANCIS CREATOR STUDIO",
  tagline: "Create. Design. Innovate.",
  developerCredit: "Created & Developed by FRANCIS.",
  accentHex: "#0F766E",
  githubUrl: "https://github.com/yadlapallif-hub/ai-studio",
  supportEmail: "support@franciscreatorstudio.org",
  license: "MIT",
};

const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  heroBadge: "Version 2.0 • 100% Free & Open-Source • MIT Licensed",
  heroHeadline: "Your Ideas. Your Creativity. One Intelligent Studio.",
  heroSubheadline:
    "Create professional resumes, design certificates, manage documents and unlock AI-powered creativity — all in one workspace.",
  primaryCta: "Start Creating",
  secondaryCta: "Explore Studio",
  openSourceNote:
    "Francis Creator Studio is free, open-source software with zero subscriptions, zero paid downloads, and zero hidden locks. Self-host with your own Supabase instance and AI provider.",
};

const DEFAULT_FOOTER = {
  credit: "Created & Developed by FRANCIS.",
  license: "Released under the MIT Open-Source License",
  githubUrl: "https://github.com/yadlapallif-hub/ai-studio",
  contactEmail: "support@franciscreatorstudio.org",
  disclaimer:
    "Certificate creation and official organizational stamps are restricted exclusively to Admin-approved Authorized Organizations.",
};

const DEFAULT_STATS: PublicPlatformStats = {
  resumeTemplates: 100,
  certificateTemplates: 124,
  categories: 14,
  tutorials: 12,
  totalResumesCreated: 0,
  totalCertificatesIssued: 0,
  verifiedIssuersCount: 0,
};

export async function getPublicPlatformData(): Promise<PublicPlatformData> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      branding: DEFAULT_BRANDING,
      websiteContent: DEFAULT_WEBSITE_CONTENT,
      footerContent: DEFAULT_FOOTER,
      announcements: [],
      faqs: [],
      stats: DEFAULT_STATS,
      testimonials: [],
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
      supabase.from("fcs_resume_templates").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("fcs_certificate_templates").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("fcs_template_categories").select("id", { count: "exact", head: true }),
      supabase.from("fcs_tutorials").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("fcs_resumes").select("id", { count: "exact", head: true }),
      supabase.from("fcs_certificate_verifications").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
      supabase.from("fcs_authorized_issuers").select("id", { count: "exact", head: true }).eq("verification_status", "approved"),
      supabase
        .from("fcs_testimonials")
        .select("id, author_name, author_role, organization, quote, rating, created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Platform lookup timeout")), 3000)
    );

    const [
      { data: settings },
      { data: announcements },
      { data: faqs },
      rtCount,
      ctCount,
      catCount,
      tutCount,
      resumesCount,
      certsCount,
      issuersCount,
      testimonialsRes,
    ] = await Promise.race([queryPromise, timeoutPromise]);

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
      stats: {
        resumeTemplates: rtCount.count ?? 100,
        certificateTemplates: ctCount.count ?? 124,
        categories: catCount.count ?? 14,
        tutorials: tutCount.count ?? 12,
        totalResumesCreated: resumesCount.count ?? 0,
        totalCertificatesIssued: certsCount.count ?? 0,
        verifiedIssuersCount: issuersCount.count ?? 0,
      },
      testimonials: (testimonialsRes.data ?? []) as PublicTestimonialItem[],
    };
  } catch {
    return {
      branding: DEFAULT_BRANDING,
      websiteContent: DEFAULT_WEBSITE_CONTENT,
      footerContent: DEFAULT_FOOTER,
      announcements: [],
      faqs: [],
      stats: DEFAULT_STATS,
      testimonials: [],
    };
  }
}
