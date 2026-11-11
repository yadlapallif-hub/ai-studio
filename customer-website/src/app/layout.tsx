import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingAiAssistant } from "@/components/ai/FloatingAiAssistant";
import { IntroSplash } from "@/components/brand/IntroSplash";
import { getPublicPlatformData } from "@/lib/platform";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FRANCIS CREATOR STUDIO — Free & Open-Source AI Resume & Certificate Platform",
  description:
    "Create Your Future. Design Your Identity. Free, open-source AI Resume Builder, Certificate Studio with QR Verification, and Document Vault. Created & Developed by FRANCIS.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const platform = await getPublicPlatformData();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <IntroSplash />
          <div className="flex min-h-screen flex-col">
            <Navbar
              platformName={platform.branding.platformName}
              announcements={platform.announcements}
            />
            <main className="flex-1">{children}</main>
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
