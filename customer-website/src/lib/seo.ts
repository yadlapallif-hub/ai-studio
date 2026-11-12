import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://francis-creator-studio.vercel.app";

export const SITE_NAME = "Francis Creator Studio";

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const canonicalUrl = `${SITE_URL}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  const fullTitle = `${input.title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description: input.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: fullTitle,
      description: input.description,
      images: [
        {
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — AI Resume, Certificate & QR Verification Studio`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [`${SITE_URL}/twitter-image`],
    },
  };
}
