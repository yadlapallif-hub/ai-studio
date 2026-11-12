import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-telugu/600.css";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransitionShell } from "@/components/layout/PageTransitionShell";
import { Footer } from "@/components/layout/Footer";
import { FloatingAiAssistant } from "@/components/ai/FloatingAiAssistant";
import { IntroSplash } from "@/components/brand/IntroSplash";
import { getPublicPlatformData } from "@/lib/platform";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Create. Design. Innovate.`,
    template: `%s`,
  },
  description:
    "Create. Design. Innovate. Free, open-source AI Resume Studio (100 templates), Certificate Design Studio (124 templates), AI Portfolio Builder, Cover Letter Studio, QR Verification, Creator AI, and Document Vault.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Free AI Resume Builder & Certificate Verification Platform`,
    description:
      "Build ATS-ready resumes, design certificates across 14 categories, verify QR credentials online, and learn with 12 bilingual English & Telugu tutorials.",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Social Preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI Resume & Certificate Studio`,
    description:
      "Free open-source ATS Resume Studio, 124 Certificate Designs, Public QR Verification, Creator AI, and Document Vault.",
    images: [`${SITE_URL}/twitter-image`],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const platform = await getPublicPlatformData();

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        email: platform.footerContent.contactEmail,
        sameAs: [platform.branding.githubUrl],
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        license: "https://opensource.org/licenses/MIT",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Open-source AI Resume Studio, Certificate Design Studio with QR verification, Creator AI Assistant, and Document Vault.",
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <ThemeProvider>
          <IntroSplash />
          <div className="flex min-h-screen flex-col">
            <Navbar
              platformName={platform.branding.platformName}
              announcements={platform.announcements}
            />
            <main className="flex-1">
              <PageTransitionShell>{children}</PageTransitionShell>
            </main>
            <Footer
              footerContent={platform.footerContent}
              githubUrl={platform.branding.githubUrl}
            />
          </div>
          <FloatingAiAssistant />
        </ThemeProvider>
      </body>
    </html>
  );
}
