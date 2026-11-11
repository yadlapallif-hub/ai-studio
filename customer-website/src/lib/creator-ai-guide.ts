export function buildCreatorAiGuideReply(input: {
  mode?: string;
  contextPage?: string;
  messages: Array<{ role: string; content: string }>;
  contextData?: Record<string, unknown>;
}): string {
  const lastUserMsg =
    [...input.messages].reverse().find((m) => m.role === "user")?.content?.trim() || "";
  const q = lastUserMsg.toLowerCase();
  const mode = input.mode || "chat";

  if (mode === "certificate_assist") {
    const title = String(input.contextData?.title || "Certificate of Completion");
    const course = String(input.contextData?.courseOrAchievement || "the program");
    const org = String(input.contextData?.organizationName || "the issuing organization");
    return [
      `Creator AI Design & Wording Guide for "${title}":`,
      "",
      `• Recommended Formal Citation:`,
      `"Awarded in recognition of successfully completing ${course} under ${org}, demonstrating technical proficiency, consistent dedication, and mastery of all required project evaluations."`,
      "",
      "• Typography & Visual Balance:",
      "- Keep Cormorant Garamond or Playfair Display for the Certificate Title and Recipient Name, paired with Plus Jakarta Sans for dates and descriptions.",
      "- Use Double Gold or Prestige Navy frames with high-contrast dark ink on warm ivory (#FFFDF7) for print clarity.",
      "- Place your organization stamp near bottom-right or center-bottom without covering the QR verification badge.",
      "",
      "• Publishing as Verified:",
      "Click 'Publish Verified Certificate' in the top toolbar so the certificate ID is registered as Verified on /verify.",
    ].join("\n");
  }

  // How to build a certificate / publish / verify
  const asksCertificate =
    q.includes("certificate") ||
    q.includes("cert") ||
    q.includes("stamp") ||
    q.includes("seal") ||
    q.includes("verify") ||
    q.includes("publish") ||
    q.includes("draft") ||
    q.includes("qr");

  // How to build a website
  const asksBuildWebsite =
    q.includes("build a website") ||
    q.includes("built a website") ||
    q.includes("make a website") ||
    q.includes("create a website") ||
    q.includes("develop a website") ||
    q.includes("how to build website") ||
    q.includes("how to built") ||
    (q.includes("website") && (q.includes("build") || q.includes("built") || q.includes("create") || q.includes("make") || q.includes("code") || q.includes("stack")));

  // About this website (Creator Studio info)
  const asksAboutPlatform =
    q.includes("about") ||
    q.includes("what is") ||
    q.includes("creator studio") ||
    q.includes("website info") ||
    q.includes("information") ||
    q.includes("features") ||
    q.includes("how does this") ||
    q.includes("help") ||
    q.includes("sign in") ||
    q.includes("login") ||
    q.includes("free") ||
    q.includes("open source");

  const asksResume =
    q.includes("resume") ||
    q.includes("cv") ||
    q.includes("ats") ||
    q.includes("bullet") ||
    q.includes("fresher") ||
    q.includes("summary");

  if (asksBuildWebsite && asksCertificate) {
    return [
      "Here is how to build a website AND how to create & publish a verified certificate in Creator Studio:",
      "",
      "1. How to Build a Modern Website:",
      "• Plan & Structure: Define your core pages (Home, Builder/App pages, Auth, Admin/Dashboard) and user workflow.",
      "• Frontend UI: Use React + Next.js (App Router) and Tailwind CSS for responsive layouts, interactive editors, and clean typography.",
      "• Database & Auth: Connect PostgreSQL + Row-Level Security (e.g. Supabase) for accounts (Just Email magic links or password), storage buckets, and live data.",
      "• API & Verification: Build server API routes for secure writes, validation (Zod), and public lookup routes.",
      "• Deploy: Push your Git repository to GitHub and deploy to Vercel with HTTPS and environment variables.",
      "",
      "2. How to Create & Publish a Verified Certificate here:",
      "• Step 1 — Authorized Access: Sign in and request Authorized Organization approval at /verify (or use your Admin-approved organization).",
      "• Step 2 — Choose Template: Go to Certificate Studio (/certificate-builder) and pick from 100 templates across 9 categories.",
      "• Step 3 — Customize & Stamps: Fill Recipient, Achievement, Dates & Signatory; open 'Org Stamps' or /stamps to design, add, reposition, or delete stamps.",
      "• Step 4 — Publish Verified: Click 'Publish Verified Certificate' in the top toolbar (turns status from Draft to Verified).",
      "• Step 5 — Check Verification: Open /verify or scan the QR code — it displays Officially Verified.",
    ].join("\n");
  }

  if (asksBuildWebsite) {
    return [
      "Step-by-Step Guide: How to Build a Complete Modern Website",
      "",
      "1. Plan Pages & Architecture",
      "• Map your pages (Landing page, main tools/workspace, login, dashboard, and API routes) and choose a clean color & typography system.",
      "",
      "2. Build the Frontend (Next.js + React + Tailwind CSS)",
      "• Create reusable UI components (Navbar, Footer, Interactive Forms, Modals) with mobile-first responsive grids and light/dark themes.",
      "",
      "3. Add Authentication & Database (Supabase / PostgreSQL)",
      "• Store users, documents, and verification records in relational tables with Row-Level Security (RLS) so each user only edits their own records.",
      "• Enable Email Magic Links ('Just Email') or Email + Password login via secure server/browser auth clients.",
      "",
      "4. Add Server APIs & Asset Storage",
      "• Use Next.js Route Handlers (/api/...) for secure server actions (like certificate verification, uploads, and AI calls) and cloud storage buckets for images/PDFs.",
      "",
      "5. Test & Deploy Live",
      "• Run TypeScript checks, linting, unit tests, and production builds (`npm run build`), push to GitHub, and deploy to Vercel with environment variables configured.",
      "",
      "Tip: Creator Studio itself is open-source (MIT) Built by Francis using Next.js, TypeScript, Tailwind CSS, Supabase, and Vercel!",
    ].join("\n");
  }

  if (asksCertificate) {
    return [
      "How to Build & Publish a Verified Certificate in Creator Studio:",
      "",
      "1. Authorized Organization Access",
      "• Certificate creation & custom stamps are restricted to Admin-approved Authorized Organizations. Apply or check your approval status at /verify.",
      "",
      "2. Design Your Certificate",
      "• Open Certificate Studio (/certificate-builder) and pick any of the 100 templates (or click New Certificate).",
      "• Enter the Certificate Title, Recipient Name, Course/Achievement, Issuing Organization, Dates, and Signatory.",
      "• Open the 'Org Stamps' tab (or visit /stamps) to design, apply, drag, resize, or delete official stamps, seals, signatures, and recipient photos.",
      "",
      "3. Publish to Verified Certificate",
      "• Click 'Publish Verified Certificate' right in the Certificate Studio top toolbar (or inside the Details panel).",
      "• Your certificate status immediately updates from Draft to Verified under your approved organization.",
      "",
      "4. Verify Publicly",
      "• Visit /verify (or scan the certificate's QR code) and enter the Certificate ID (e.g. FCS-2026-XXXXXX). It will display as Officially Verified.",
    ].join("\n");
  }

  if (asksResume) {
    return [
      "How to Build an ATS-Ready Resume in Creator Studio:",
      "",
      "1. Open Resume Studio (/resume-builder) — free to start immediately, even before signing in.",
      "2. Pick from 100 clean templates across Tech, Executive, Academic, Student, Minimal, and Creative styles.",
      "3. Complete key sections among the 14 structured panels (Header, Summary, Experience, Projects, Skills, Education, Certifications, Achievements).",
      "4. Use strong action verbs + numbers (e.g. 'Reduced API response time by 42%' instead of 'Worked on APIs').",
      "5. Check the Creator AI tab inside the studio for your live ATS Readiness score, upload a photo with automatic background removal, and export crisp A4 PDF or PNG for free.",
    ].join("\n");
  }

  if (asksAboutPlatform) {
    return [
      "About CREATOR STUDIO (Built by Francis):",
      "",
      "Creator Studio is a 100% free, open-source (MIT) document engineering platform with zero subscriptions, zero paid downloads, and zero watermarks.",
      "",
      "What You Can Do on This Website:",
      "• AI Resume Studio (/resume-builder): 100 resume templates, 14 structured sections, ATS readiness checks, photo background removal, and free A4 PDF/PNG exports.",
      "• Authorized Certificate Studio (/certificate-builder): 100 templates across 9 categories exclusively for Admin-approved Authorized Organizations, with one-click Publish to Verified Certificate.",
      "• Organization Stamp Studio (/stamps): Create official round/oval/square/shield stamps, seals, and signatures, place them on certificates, or delete them anytime.",
      "• Public Verification Portal (/verify): Instant QR & Certificate ID verification showing Officially Verified status.",
      "• Easy Sign-In (/auth/login): Sign in with Just Email (instant sign-in link) or Email & Password to save documents to your private Vault (/vault).",
      "",
      "Ask me: 'How do I build a certificate?' or 'How do I build a website?' for step-by-step guides!",
    ].join("\n");
  }

  return [
    `I'm Creator AI (${input.contextPage || "Creator Studio"}). Here is how I can help right away:`,
    "",
    "• Website Information: Creator Studio (Built by Francis) gives you a free AI Resume Builder (100 templates), Authorized Certificate Studio (100 templates + Stamp Studio + QR Verification), Document Vault, and Just Email sign-in.",
    "• Build & Publish a Verified Certificate: Go to /certificate-builder -> customize details & Org Stamps -> click 'Publish Verified Certificate' -> check it at /verify so it displays as Verified.",
    "• Build a Website: Start with clear pages & UI (Next.js + React + Tailwind), connect auth & database (Supabase/PostgreSQL), add server APIs, test, and deploy to Vercel.",
    "• Build an ATS Resume: Open /resume-builder, fill measurable bullets, review your ATS score, and download print-ready A4 PDF or PNG.",
    "",
    "Try asking a specific question such as 'Tell me about Creator Studio website', 'How do I create and publish a verified certificate?', or 'How do I build a website?'.",
  ].join("\n");
}
