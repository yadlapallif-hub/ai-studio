export type ResumeCategoryKey =
  | "ats"
  | "modern"
  | "executive"
  | "technical"
  | "academic"
  | "minimal"
  | "creative";

export type ResumeHeadingStyle =
  | "uppercase-rule"
  | "accent-bar"
  | "serif-underline"
  | "mono-tag"
  | "classic-centered"
  | "minimal-label"
  | "pill-badge";

export interface ResumeLayoutConfig {
  columns: 1 | 2;
  sidebarPosition?: "left" | "right";
  sidebarWidth?: string;
  sidebarTint?: string;
  fontFamily: string;
  headingStyle: ResumeHeadingStyle;
  accent: string;
  photoSupported: boolean;
  photoShape?: "circle" | "square";
  headerAlign?: "left" | "center" | "split" | "band";
}

export interface ResumeTemplateCatalogItem {
  slug: string;
  name: string;
  description: string;
  category: ResumeCategoryKey;
  isAtsFriendly: boolean;
  sortOrder: number;
  layoutConfig: ResumeLayoutConfig;
}

export type CertificateCategoryKey =
  | "academic"
  | "course_completion"
  | "internship"
  | "achievement"
  | "participation"
  | "excellence"
  | "appreciation"
  | "corporate"
  | "training"
  | "sports"
  | "competition"
  | "volunteer"
  | "professional"
  | "educational";

export const CERTIFICATE_CATEGORIES: Array<{
  key: CertificateCategoryKey;
  label: string;
  description: string;
}> = [
  { key: "course_completion", label: "Course Completion", description: "Bootcamps, cohorts, online academies, and workshops" },
  { key: "academic", label: "Academic", description: "Universities, honor rolls, and scholarly distinctions" },
  { key: "internship", label: "Internship", description: "Engineering, research, business, and externship tenures" },
  { key: "achievement", label: "Achievement", description: "High-impact milestones, winners, and honors" },
  { key: "participation", label: "Participation", description: "Summits, hackathons, seminars, and conferences" },
  { key: "excellence", label: "Excellence", description: "Distinction awards, fellowships, and presidential citations" },
  { key: "appreciation", label: "Appreciation", description: "Mentors, speakers, judges, and community contributors" },
  { key: "corporate", label: "Corporate", description: "Quarterly awards, onboarding, leadership, and service tenure" },
  { key: "training", label: "Training", description: "Technical certifications, compliance, and workplace safety" },
  { key: "sports", label: "Sports", description: "Tournaments, athletics, championship podiums, and clubs" },
  { key: "competition", label: "Competition", description: "Coding contests, olympiads, robotics, and design challenges" },
  { key: "volunteer", label: "Volunteer", description: "Civic programs, nonprofit hours, and humanitarian impact" },
  { key: "professional", label: "Professional Development", description: "Chartered credentials, CEUs, and executive memberships" },
  { key: "educational", label: "Educational", description: "Diplomas, student clubs, STEM labs, and K-12 honors" },
];

export type CertificateBorderStyleKey =
  | "double-gold"
  | "architectural"
  | "filigree"
  | "modern-frame"
  | "prestige-navy"
  | "editorial-warm"
  | "clean-grid"
  | "board-crest"
  | "academic-crest";

export interface CertificateLayoutConfig {
  borderStyle: CertificateBorderStyleKey;
  background: string;
  primaryColor: string;
  accentColor: string;
  fontDisplay: string;
  fontBody: string;
  titleDefault: string;
}

export interface CertificateTemplateCatalogItem {
  slug: string;
  name: string;
  description: string;
  category: CertificateCategoryKey;
  orientation: "landscape" | "portrait";
  sortOrder: number;
  layoutConfig: CertificateLayoutConfig;
}

const RESUME_CORE_7: ResumeTemplateCatalogItem[] = [
  {
    slug: "ats-clean",
    name: "ATS Precision Standard",
    description:
      "Single-column, recruiter-tested ATS layout with clear typographic hierarchy and zero parsing traps.",
    category: "ats",
    isAtsFriendly: true,
    sortOrder: 1,
    layoutConfig: {
      columns: 1,
      fontFamily: "Inter",
      headingStyle: "uppercase-rule",
      accent: "#0F766E",
      photoSupported: false,
      headerAlign: "left",
    },
  },
  {
    slug: "modern-studio",
    name: "Studio Slate Editorial",
    description:
      "Refined two-zone editorial resume featuring a crisp left metadata rail, profile photo slot, and structured timeline.",
    category: "modern",
    isAtsFriendly: true,
    sortOrder: 2,
    layoutConfig: {
      columns: 2,
      sidebarPosition: "left",
      sidebarWidth: "32%",
      sidebarTint: "#F8FAFC",
      fontFamily: "Plus Jakarta Sans",
      headingStyle: "accent-bar",
      accent: "#0F766E",
      photoSupported: true,
      photoShape: "circle",
      headerAlign: "left",
    },
  },
  {
    slug: "executive-serif",
    name: "Executive Serif Monograph",
    description:
      "Authoritative leadership resume pairing classic serif headings with balanced spacing and executive summary callout.",
    category: "executive",
    isAtsFriendly: true,
    sortOrder: 3,
    layoutConfig: {
      columns: 1,
      fontFamily: "Merriweather",
      headingStyle: "serif-underline",
      accent: "#1E293B",
      photoSupported: true,
      photoShape: "square",
      headerAlign: "left",
    },
  },
  {
    slug: "technical-spec",
    name: "Systems & Engineering Spec",
    description:
      "Dense, scannable layout tailored for software engineers, ML researchers, and product builders highlighting stack & projects.",
    category: "technical",
    isAtsFriendly: true,
    sortOrder: 4,
    layoutConfig: {
      columns: 1,
      fontFamily: "IBM Plex Sans",
      headingStyle: "mono-tag",
      accent: "#0369A1",
      photoSupported: false,
      headerAlign: "split",
    },
  },
  {
    slug: "academic-cv",
    name: "Academic & Research Dossier",
    description:
      "Structured multi-section CV built for fellowships, publications, teaching experience, certifications, and references.",
    category: "academic",
    isAtsFriendly: true,
    sortOrder: 5,
    layoutConfig: {
      columns: 1,
      fontFamily: "Source Serif 4",
      headingStyle: "classic-centered",
      accent: "#1D4ED8",
      photoSupported: false,
      headerAlign: "center",
    },
  },
  {
    slug: "minimal-swiss",
    name: "Swiss Grid Minimal",
    description:
      "Clean asymmetrical grid inspired by Swiss editorial typography with generous whitespace and razor-sharp alignment.",
    category: "minimal",
    isAtsFriendly: true,
    sortOrder: 6,
    layoutConfig: {
      columns: 2,
      sidebarPosition: "left",
      sidebarWidth: "28%",
      sidebarTint: "#FFFFFF",
      fontFamily: "DM Sans",
      headingStyle: "minimal-label",
      accent: "#111827",
      photoSupported: true,
      photoShape: "square",
      headerAlign: "left",
    },
  },
  {
    slug: "creative-folio",
    name: "Creator Folio Showcase",
    description:
      "Expressive studio header with balanced two-column skill and project cards while keeping text selectable in PDF exports.",
    category: "creative",
    isAtsFriendly: false,
    sortOrder: 7,
    layoutConfig: {
      columns: 2,
      sidebarPosition: "left",
      sidebarWidth: "34%",
      sidebarTint: "#FFFBEB",
      fontFamily: "Space Grotesk",
      headingStyle: "pill-badge",
      accent: "#B45309",
      photoSupported: true,
      photoShape: "circle",
      headerAlign: "band",
    },
  },
];

const RESUME_ROLE_TRACKS: Array<{
  slugBase: string;
  title: string;
  summary: string;
  category: ResumeCategoryKey;
  ats: boolean;
}> = [
  { slugBase: "fullstack-developer", title: "Full-Stack Developer", summary: "Built for TypeScript, React, APIs, and production deployment metrics.", category: "technical", ats: true },
  { slugBase: "ai-ml-researcher", title: "AI & ML Engineer", summary: "Highlights model evaluation, training pipelines, and applied benchmarks.", category: "technical", ats: true },
  { slugBase: "cloud-devops-architect", title: "Cloud & DevOps Architect", summary: "Spotlights reliability SLAs, Kubernetes, Terraform, and CI/CD scale.", category: "technical", ats: true },
  { slugBase: "cybersecurity-analyst", title: "Cybersecurity Specialist", summary: "Emphasizes incident response, threat modeling, and security compliance.", category: "technical", ats: true },
  { slugBase: "data-science-lead", title: "Data Science & Analytics", summary: "Balances statistical modeling, SQL pipelines, and business impact.", category: "technical", ats: true },
  { slugBase: "mobile-app-engineer", title: "Mobile & Cross-Platform", summary: "Clean section framing for iOS, Android, React Native, and app telemetry.", category: "modern", ats: true },
  { slugBase: "product-manager-impact", title: "Product Manager Impact", summary: "Prioritizes KPI outcomes, roadmap execution, and stakeholder alignment.", category: "modern", ats: true },
  { slugBase: "ux-product-designer", title: "UX & Product Designer", summary: "Balanced visual rhythm for research insights, design systems, and prototypes.", category: "creative", ats: false },
  { slugBase: "brand-creative-director", title: "Brand & Creative Director", summary: "Editorial framing crafted for campaign portfolios and creative leadership.", category: "creative", ats: false },
  { slugBase: "investment-banking", title: "Finance & Investment Banking", summary: "High-density single-column format trusted by finance & advisory teams.", category: "ats", ats: true },
  { slugBase: "management-consultant", title: "Strategy & Consulting", summary: "Structured impact-first narrative for case teams and client engagements.", category: "executive", ats: true },
  { slugBase: "vp-engineering-exec", title: "VP & Engineering Leader", summary: "Executive summary, org scaling metrics, and architecture governance.", category: "executive", ats: true },
  { slugBase: "founder-operator", title: "Founder & General Manager", summary: "Crisp one-page synthesis of P&L ownership, fundraising, and growth.", category: "executive", ats: true },
  { slugBase: "clinical-healthcare", title: "Healthcare & Clinical Lead", summary: "Clear credential placement for licenses, rotations, and patient care.", category: "ats", ats: true },
  { slugBase: "corporate-legal", title: "Legal & Compliance Counsel", summary: "Formal serif monograph layout built for bar admissions and case briefs.", category: "executive", ats: true },
  { slugBase: "university-fellowship", title: "University & PhD Fellowship", summary: "Academic dossier framing grants, peer-reviewed papers, and labs.", category: "academic", ats: true },
  { slugBase: "stem-faculty-cv", title: "Faculty & Lecturer CV", summary: "Clear hierarchy for teaching evaluations, symposia, and publications.", category: "academic", ats: true },
  { slugBase: "fresh-graduate-launchpad", title: "Fresh Graduate Launchpad", summary: "Elevates projects, coursework, internships, and technical competencies.", category: "ats", ats: true },
  { slugBase: "internship-sprint", title: "Campus Internship Ready", summary: "Compact ATS-safe starter template ideal for student applications.", category: "minimal", ats: true },
  { slugBase: "saas-account-exec", title: "Enterprise Sales & GTM", summary: "Quota attainment callouts, pipeline leadership, and key account wins.", category: "modern", ats: true },
  { slugBase: "digital-growth-marketing", title: "Growth & Performance Marketer", summary: "Highlights funnel metrics, attribution lifts, and campaign experiments.", category: "creative", ats: false },
  { slugBase: "supply-chain-ops", title: "Operations & Supply Chain", summary: "Built for process optimization, vendor metrics, and lean Six Sigma.", category: "ats", ats: true },
  { slugBase: "civil-mechanical-eng", title: "Mechanical & Civil Engineer", summary: "Clean CAD/FEA tool tags, PE credentials, and field project scopes.", category: "technical", ats: true },
  { slugBase: "minimalist-monochrome", title: "Monochrome Typographic", summary: "Distraction-free Swiss spacing focused purely on crisp prose.", category: "minimal", ats: true },
  { slugBase: "architecture-urban", title: "Architecture & Spatial Design", summary: "Asymmetric rail highlighting studios, competitions, and toolkits.", category: "creative", ats: false },
  { slugBase: "journalism-media", title: "Editorial & Communications", summary: "Serif lead-in tailored for writers, editors, and communications leads.", category: "minimal", ats: true },
  { slugBase: "biotech-research", title: "Biotech & Lab Scientist", summary: "Highlights lab methodologies, instrumentation, and clinical studies.", category: "academic", ats: true },
  { slugBase: "hr-people-partner", title: "People Operations & HR", summary: "Warm modern layout centered on talent strategy, culture, and org design.", category: "modern", ats: true },
  { slugBase: "nonprofit-director", title: "Civic & Nonprofit Leadership", summary: "Clear donor impact, grant stewardship, and program governance layout.", category: "executive", ats: true },
  { slugBase: "remote-async-builder", title: "Distributed & Remote Lead", summary: "Clean global layout highlighting async collaboration and shipped work.", category: "minimal", ats: true },
  { slugBase: "qa-automation-sdet", title: "QA & Automation Engineer", summary: "Emphasizes test coverage, reliability tooling, and release pipelines.", category: "technical", ats: true },
];

const RESUME_STYLE_FLAVORS: Array<{
  suffix: string;
  label: string;
  accent: string;
  fontFamily: string;
  columns: 1 | 2;
  sidebarPosition?: "left" | "right";
  sidebarWidth?: string;
  sidebarTint?: string;
  headingStyle: ResumeHeadingStyle;
  headerAlign: "left" | "center" | "split" | "band";
  photoSupported: boolean;
  photoShape?: "circle" | "square";
}> = [
  {
    suffix: "ivory-classic",
    label: "Classic",
    accent: "#0F766E",
    fontFamily: "Inter",
    columns: 1,
    headingStyle: "uppercase-rule",
    headerAlign: "left",
    photoSupported: false,
  },
  {
    suffix: "slate-sidebar",
    label: "Slate Rail",
    accent: "#0369A1",
    fontFamily: "Plus Jakarta Sans",
    columns: 2,
    sidebarPosition: "left",
    sidebarWidth: "32%",
    sidebarTint: "#F1F5F9",
    headingStyle: "accent-bar",
    headerAlign: "left",
    photoSupported: true,
    photoShape: "circle",
  },
  {
    suffix: "cobalt-right-rail",
    label: "Right Split",
    accent: "#1D4ED8",
    fontFamily: "IBM Plex Sans",
    columns: 2,
    sidebarPosition: "right",
    sidebarTint: "#EFF6FF",
    headingStyle: "mono-tag",
    headerAlign: "split",
    photoSupported: true,
    photoShape: "square",
  },
];

const RESUME_PALETTES = [
  "#0F766E",
  "#0369A1",
  "#1E293B",
  "#1D4ED8",
  "#B45309",
  "#047857",
  "#4338CA",
  "#9F1239",
  "#111827",
  "#0E7490",
  "#6D28D9",
  "#7C2D12",
];

const RESUME_FONTS = [
  "Inter",
  "Plus Jakarta Sans",
  "IBM Plex Sans",
  "DM Sans",
  "Merriweather",
  "Source Serif 4",
  "Space Grotesk",
];

function buildResumeCatalog(): ResumeTemplateCatalogItem[] {
  const list: ResumeTemplateCatalogItem[] = [...RESUME_CORE_7];
  let sortOrder = 8;

  for (let i = 0; i < RESUME_ROLE_TRACKS.length && list.length < 100; i++) {
    const track = RESUME_ROLE_TRACKS[i];
    for (let f = 0; f < RESUME_STYLE_FLAVORS.length && list.length < 100; f++) {
      const flavor = RESUME_STYLE_FLAVORS[f];
      const palette = RESUME_PALETTES[(i * 3 + f) % RESUME_PALETTES.length];
      const font =
        track.category === "academic" || track.category === "executive"
          ? f === 0
            ? "Merriweather"
            : f === 1
              ? "Source Serif 4"
              : "Plus Jakarta Sans"
          : RESUME_FONTS[(i + f) % RESUME_FONTS.length];

      const isAts =
        track.ats && flavor.columns === 1 ? true : track.category !== "creative" && flavor.columns === 2;

      const headingByCat: ResumeHeadingStyle =
        track.category === "technical"
          ? "mono-tag"
          : track.category === "academic"
            ? "classic-centered"
            : track.category === "executive"
              ? "serif-underline"
              : track.category === "creative"
                ? "pill-badge"
                : track.category === "minimal"
                  ? "minimal-label"
                  : flavor.headingStyle;

      list.push({
        slug: `${track.slugBase}-${flavor.suffix}`,
        name: `${track.title} — ${flavor.label}`,
        description: track.summary,
        category: track.category,
        isAtsFriendly: isAts,
        sortOrder: sortOrder++,
        layoutConfig: {
          columns: flavor.columns,
          sidebarPosition: flavor.sidebarPosition,
          sidebarWidth: flavor.columns === 2 ? (f === 1 ? "32%" : "30%") : undefined,
          sidebarTint: flavor.sidebarTint,
          fontFamily: font,
          headingStyle: headingByCat,
          accent: palette,
          photoSupported: flavor.photoSupported,
          photoShape: flavor.photoShape,
          headerAlign:
            track.category === "academic"
              ? "center"
              : track.category === "creative"
                ? "band"
                : flavor.headerAlign,
        },
      });
    }
  }

  return list.slice(0, 100);
}

export const RESUME_TEMPLATE_CATALOG: ResumeTemplateCatalogItem[] = buildResumeCatalog();

const CERT_CORE_9: CertificateTemplateCatalogItem[] = [
  {
    slug: "course-completion",
    name: "Course Completion Classic",
    description:
      "Balanced double-bordered credential layout ideal for bootcamps, online courses, and workshops.",
    category: "course_completion",
    orientation: "landscape",
    sortOrder: 1,
    layoutConfig: {
      borderStyle: "double-gold",
      background: "#FFFDF7",
      primaryColor: "#0F4C5C",
      accentColor: "#C59B27",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Plus Jakarta Sans",
      titleDefault: "Certificate of Completion",
    },
  },
  {
    slug: "internship-credential",
    name: "Internship Experience Credential",
    description:
      "Modern corporate credential highlighting role, tenure, signatory, and verification QR code.",
    category: "internship",
    orientation: "landscape",
    sortOrder: 2,
    layoutConfig: {
      borderStyle: "architectural",
      background: "#FFFFFF",
      primaryColor: "#0F172A",
      accentColor: "#0F766E",
      fontDisplay: "Playfair Display",
      fontBody: "Inter",
      titleDefault: "Certificate of Internship",
    },
  },
  {
    slug: "achievement-honor",
    name: "Achievement Honor Plaque",
    description:
      "Distinguished award layout with corner filigree accents and embossed seal placement.",
    category: "achievement",
    orientation: "landscape",
    sortOrder: 3,
    layoutConfig: {
      borderStyle: "filigree",
      background: "#FCFBF7",
      primaryColor: "#1E293B",
      accentColor: "#B45309",
      fontDisplay: "Cinzel",
      fontBody: "Inter",
      titleDefault: "Certificate of Achievement",
    },
  },
  {
    slug: "participation-summit",
    name: "Event & Summit Participation",
    description:
      "Clean contemporary design for conferences, hackathons, seminars, and community cohorts.",
    category: "participation",
    orientation: "landscape",
    sortOrder: 4,
    layoutConfig: {
      borderStyle: "modern-frame",
      background: "#F8FAFC",
      primaryColor: "#0369A1",
      accentColor: "#0F766E",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      titleDefault: "Certificate of Participation",
    },
  },
  {
    slug: "excellence-distinction",
    name: "Distinction & Excellence Award",
    description:
      "Formal high-contrast prestige design with navy and antique gold ribbon framing.",
    category: "excellence",
    orientation: "landscape",
    sortOrder: 5,
    layoutConfig: {
      borderStyle: "prestige-navy",
      background: "#FFFEFA",
      primaryColor: "#1E3A8A",
      accentColor: "#D97706",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Plus Jakarta Sans",
      titleDefault: "Certificate of Excellence",
    },
  },
  {
    slug: "appreciation-gratitude",
    name: "Appreciation & Recognition",
    description:
      "Warm editorial framing recognizing mentors, speakers, volunteers, and contributors.",
    category: "appreciation",
    orientation: "landscape",
    sortOrder: 6,
    layoutConfig: {
      borderStyle: "editorial-warm",
      background: "#FFFBF5",
      primaryColor: "#7C2D12",
      accentColor: "#C2410C",
      fontDisplay: "Playfair Display",
      fontBody: "DM Sans",
      titleDefault: "Certificate of Appreciation",
    },
  },
  {
    slug: "training-technical",
    name: "Technical Training & Compliance",
    description:
      "Crisp institutional layout built for corporate training, lab safety, and technical skill tracks.",
    category: "training",
    orientation: "landscape",
    sortOrder: 7,
    layoutConfig: {
      borderStyle: "clean-grid",
      background: "#FFFFFF",
      primaryColor: "#0F766E",
      accentColor: "#334155",
      fontDisplay: "IBM Plex Sans",
      fontBody: "IBM Plex Sans",
      titleDefault: "Certificate of Training",
    },
  },
  {
    slug: "professional-board",
    name: "Professional Board Credential",
    description:
      "Portrait A4 credential format suited for professional certifications, licensing, and memberships.",
    category: "professional",
    orientation: "portrait",
    sortOrder: 8,
    layoutConfig: {
      borderStyle: "board-crest",
      background: "#FCFCFA",
      primaryColor: "#111827",
      accentColor: "#B45309",
      fontDisplay: "Cinzel",
      fontBody: "Inter",
      titleDefault: "Professional Certification",
    },
  },
  {
    slug: "educational-diploma",
    name: "Academic & Educational Award",
    description:
      "Formal academic portrait layout with institutional header space, recipient photo option, and seal zone.",
    category: "educational",
    orientation: "portrait",
    sortOrder: 9,
    layoutConfig: {
      borderStyle: "academic-crest",
      background: "#FFFDF9",
      primaryColor: "#1E293B",
      accentColor: "#0F766E",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Source Serif 4",
      titleDefault: "Educational Certificate",
    },
  },
];

const CERT_CATEGORY_META: Array<{
  category: CertificateCategoryKey;
  titleDefault: string;
  themes: Array<{ slugPart: string; name: string; desc: string }>;
}> = [
  {
    category: "course_completion",
    titleDefault: "Certificate of Completion",
    themes: [
      { slugPart: "fullstack-bootcamp", name: "Full-Stack Bootcamp Honors", desc: "Clean coding academy completion credential with cohort badge space." },
      { slugPart: "ai-cohort-diploma", name: "AI & Applied ML Cohort", desc: "Crisp modern credential built for AI engineering tracks and workshops." },
      { slugPart: "cloud-masters", name: "Cloud Architecture Mastery", desc: "High-contrast technical completion award with crisp divider rules." },
      { slugPart: "product-academy", name: "Product Strategy Fellowship", desc: "Editorial modern diploma built for PM cohorts and capstone reviews." },
      { slugPart: "design-systems-grad", name: "UI/UX Design Systems", desc: "Balanced contemporary layout tailored for design & frontend cohorts." },
      { slugPart: "data-analytics-track", name: "Data Analytics Track", desc: "Structured quantitative credential with crisp grid geometry." },
      { slugPart: "open-learning-gold", name: "Open Learning Gold Frame", desc: "Warm ivory classical completion frame with antique brass trim." },
      { slugPart: "evening-seminar", name: "Executive Seminar Completion", desc: "Refined serif diploma suited for university continuing education." },
      { slugPart: "cyber-essentials", name: "Cyber Foundations Award", desc: "Precision slate border format for security fundamentals graduates." },
      { slugPart: "capstone-distinction", name: "Capstone Studio Completion", desc: "Portrait credential showcasing project title and mentor sign-off." },
    ],
  },
  {
    category: "internship",
    titleDefault: "Certificate of Internship",
    themes: [
      { slugPart: "summer-eng-intern", name: "Summer Engineering Intern", desc: "Clean corporate internship certificate highlighting team & tenure." },
      { slugPart: "research-fellow-intern", name: "Research Lab Internship", desc: "Academic-industry hybrid frame for R&D and lab placements." },
      { slugPart: "product-apprentice", name: "Product & Design Apprentice", desc: "Modern clean border format for studio and agency internships." },
      { slugPart: "finance-analyst-intern", name: "Finance Analyst Placement", desc: "Authoritative navy-bordered verification for advisory interns." },
      { slugPart: "startup-fellow", name: "Startup Venture Fellow", desc: "Sleek modern certificate built for accelerator & startup cohorts." },
      { slugPart: "clinical-externship", name: "Healthcare Externship Record", desc: "Formal portrait credential for clinical hours & hospital rotations." },
      { slugPart: "legal-clerkship", name: "Legal & Policy Clerkship", desc: "Traditional double-ruled parchment frame for law clerkships." },
      { slugPart: "marketing-internship", name: "Growth & Media Internship", desc: "Warm contemporary layout for communications and marketing teams." },
      { slugPart: "civic-fellowship-intern", name: "Civic Tech Fellowship", desc: "Minimal grid credential tailored for public-interest cohorts." },
      { slugPart: "remote-global-intern", name: "Global Remote Internship", desc: "International clean frame with prominent QR credential anchor." },
    ],
  },
  {
    category: "achievement",
    titleDefault: "Certificate of Achievement",
    themes: [
      { slugPart: "hackathon-winner", name: "Hackathon First Place", desc: "High-energy prestige award built for coding & innovation winners." },
      { slugPart: "deans-list-honor", name: "Dean's Honor Roll", desc: "Classical gold-filigree plaque recognizing top academic standing." },
      { slugPart: "innovation-medal", name: "Innovation & Patent Award", desc: "Executive crest design celebrating engineering breakthroughs." },
      { slugPart: "open-source-champion", name: "Open Source Contributor Gold", desc: "Modern studio honor recognizing major open-source milestones." },
      { slugPart: "olympiad-laureate", name: "STEM Olympiad Laureate", desc: "Crisp medallion layout tailored for math, physics, and CS contests." },
      { slugPart: "quarterly-mvp", name: "Quarterly Engineering MVP", desc: "Clean corporate plaque celebrating standout quarterly delivery." },
      { slugPart: "capstone-best-project", name: "Best Capstone Project", desc: "Gallery-worthy portrait honor for standout graduation projects." },
      { slugPart: "robotics-challenge", name: "Robotics Challenge Finalist", desc: "Architectural grid award for hardware & robotics competitions." },
      { slugPart: "sustainability-prize", name: "Impact & Sustainability Prize", desc: "Emerald-accented award honoring environmental & civic initiatives." },
      { slugPart: "founders-spotlight", name: "Founders Pitch Winner", desc: "Bold midnight prestige certificate for demo-day winners." },
    ],
  },
  {
    category: "participation",
    titleDefault: "Certificate of Participation",
    themes: [
      { slugPart: "annual-tech-summit", name: "Annual Tech Summit Pass", desc: "Contemporary conference participation credential with QR verification." },
      { slugPart: "community-hackathon", name: "24-Hour Hackathon Builder", desc: "Modern clean card recognizing sprint builders and finalists." },
      { slugPart: "ai-symposium", name: "AI Research Symposium", desc: "Crisp scholarly layout for symposium attendees and panelists." },
      { slugPart: "developer-meetup", name: "Developer Guild Workshop", desc: "Minimalist studio frame for hands-on weekend coding labs." },
      { slugPart: "design-jam", name: "Global Design Jam Delegate", desc: "Expressive warm frame crafted for collaborative design sprints." },
      { slugPart: "career-bootcamp-day", name: "Career Readiness Seminar", desc: "Clean single-border credential for university career workshops." },
      { slugPart: "open-web-forum", name: "Open Web Standards Forum", desc: "Structured Swiss border format for web engineering conferences." },
      { slugPart: "student-colloquium", name: "Student Research Colloquium", desc: "Classic scholarly framing for student poster presenters." },
      { slugPart: "cloud-native-day", name: "Cloud Native Community Day", desc: "Technical cobalt-accented pass for infrastructure attendees." },
      { slugPart: "civic-code-sprint", name: "Civic Open Data Sprint", desc: "Portrait participation record for public-sector sprints." },
    ],
  },
  {
    category: "excellence",
    titleDefault: "Certificate of Excellence",
    themes: [
      { slugPart: "midnight-prestige", name: "Midnight Gold Prestige", desc: "Deep obsidian paper with antique gold filigree for top honors." },
      { slugPart: "emerald-laurel", name: "Emerald Laurel Distinction", desc: "Rich forest-teal and brass typography for exceptional performance." },
      { slugPart: "presidential-citation", name: "Presidential Citation", desc: "Ultra-formal double-gold portrait citation with crest spacing." },
      { slugPart: "valedictorian-seal", name: "Top Scholar Distinction", desc: "Classic serif ivory layout celebrating highest cohort ranking." },
      { slugPart: "architecture-merit", name: "Architectural Merit Prize", desc: "Precision geometric frame tailored for design & engineering honors." },
      { slugPart: "craftsmanship-guild", name: "Master Craftsmanship Award", desc: "Warm parchment serif certificate honoring exceptional quality." },
      { slugPart: "leadership-circle", name: "Leadership Circle Distinction", desc: "Executive navy-and-brass recognition for team leadership." },
      { slugPart: "teaching-excellence", name: "Teaching Excellence Citation", desc: "Academic honor celebrating outstanding instruction & mentorship." },
      { slugPart: "quality-zero-defect", name: "Reliability Excellence Medal", desc: "Clean technical distinction for operational & engineering quality." },
      { slugPart: "global-fellow-honor", name: "Global Fellow Distinction", desc: "Prestige portrait award for international merit scholars." },
    ],
  },
  {
    category: "appreciation",
    titleDefault: "Certificate of Appreciation",
    themes: [
      { slugPart: "keynote-speaker", name: "Keynote Speaker Gratitude", desc: "Warm editorial appreciation award for conference keynotes." },
      { slugPart: "cohort-mentor", name: "Industry Mentor Recognition", desc: "Refined slate-and-amber recognition for dedicated mentors." },
      { slugPart: "community-volunteer", name: "Community Volunteer Honor", desc: "Friendly warm ivory frame recognizing civic volunteer hours." },
      { slugPart: "hackathon-judge", name: "Official Hackathon Judge", desc: "Crisp architectural recognition for competition jury members." },
      { slugPart: "faculty-advisor", name: "Faculty Advisor Gratitude", desc: "Classic serif appreciation plaque for academic advisors." },
      { slugPart: "open-source-maintainer", name: "OSS Maintainer Thank-You", desc: "Modern studio gratitude card for community maintainers." },
      { slugPart: "donor-patron", name: "Patron & Sponsor Recognition", desc: "Formal parchment frame thanking institutional sponsors." },
      { slugPart: "peer-reviewer", name: "Journal Peer Reviewer Note", desc: "Clean scholarly credential thanking conference reviewers." },
      { slugPart: "alumni-panelist", name: "Alumni Career Panelist", desc: "Balanced contemporary layout for returning alumni speakers." },
      { slugPart: "workshop-host", name: "Workshop Host Appreciation", desc: "Portrait appreciation certificate for campus organizers." },
    ],
  },
  {
    category: "training",
    titleDefault: "Certificate of Training",
    themes: [
      { slugPart: "security-awareness", name: "InfoSec & Privacy Compliance", desc: "Clean enterprise compliance verification with issue & expiry dates." },
      { slugPart: "kubernetes-lab", name: "Container & Cloud Lab", desc: "Technical grid layout highlighting hands-on infrastructure hours." },
      { slugPart: "workplace-safety", name: "Lab & Field Safety Training", desc: "High-visibility formal certificate for safety inductions." },
      { slugPart: "agile-scrum-workshop", name: "Agile Delivery Workshop", desc: "Modern crisp credential for sprint and product training tracks." },
      { slugPart: "accessibility-wcag", name: "WCAG Accessibility Training", desc: "High-contrast readable design for digital accessibility cohorts." },
      { slugPart: "postgres-dba-track", name: "Database Security & Tuning", desc: "Monospace-accented training record for backend engineering teams." },
      { slugPart: "ai-ethics-governance", name: "AI Governance Training", desc: "Balanced institutional certificate for responsible AI modules." },
      { slugPart: "first-aid-responder", name: "Emergency Readiness Record", desc: "Portrait compliance credential with prominent expiry indicator." },
      { slugPart: "quality-iso-audit", name: "ISO Audit Readiness", desc: "Precision clean-grid certificate for internal quality auditors." },
      { slugPart: "onboarding-academy", name: "Engineering Onboarding", desc: "Modern workspace layout for new-hire technical bootcamps." },
    ],
  },
  {
    category: "professional",
    titleDefault: "Professional Certification",
    themes: [
      { slugPart: "certified-architect", name: "Certified Systems Architect", desc: "Authoritative board-crest layout for senior technical credentials." },
      { slugPart: "guild-fellowship", name: "Chartered Guild Fellow", desc: "Portrait serif diploma built for professional society memberships." },
      { slugPart: "certified-pm-lead", name: "Certified Product Leader", desc: "Executive slate & brass framing for management certifications." },
      { slugPart: "data-steward-cert", name: "Certified Data Steward", desc: "Crisp modern credential for data governance professionals." },
      { slugPart: "cloud-security-pro", name: "Cloud Security Practitioner", desc: "Dark-ink architectural credential with clear verification QR." },
      { slugPart: "executive-coach", name: "Accredited Executive Coach", desc: "Refined ivory certificate for coaching & advisory boards." },
      { slugPart: "ux-accessibility-pro", name: "Certified UX Specialist", desc: "Clean modern frame showcasing practitioner credential ID." },
      { slugPart: "financial-modeling-pro", name: "Financial Modeling Charter", desc: "Classic navy double-frame built for quantitative analysts." },
      { slugPart: "scrum-practitioner", name: "Certified Delivery Lead", desc: "Crisp horizontal board credential with dual-signature layout." },
      { slugPart: "ethics-compliance-officer", name: "Compliance Officer Charter", desc: "Formal portrait charter with prominent issuer approval seal zone." },
    ],
  },
  {
    category: "educational",
    titleDefault: "Educational Certificate",
    themes: [
      { slugPart: "stem-scholars-diploma", name: "STEM Scholars Diploma", desc: "Traditional portrait crest format with recipient portrait zone." },
      { slugPart: "honors-baccalaureate", name: "Honors Curriculum Record", desc: "Formal university-style ivory frame with double antique trim." },
      { slugPart: "language-proficiency", name: "Language Proficiency Award", desc: "Clean editorial credential noting CEFR level and fluency hours." },
      { slugPart: "summer-school-merit", name: "Summer Academy Merit", desc: "Bright modern academic design for pre-college STEM cohorts." },
      { slugPart: "coding-for-youth", name: "Youth Coding Fellowship", desc: "Engaging teal-framed educational certificate for young builders." },
      { slugPart: "continuing-ed-unit", name: "Continuing Education CEU", desc: "Structured transcript-ready layout with issue & credit hours." },
      { slugPart: "math-enrichment", name: "Applied Math Enrichment", desc: "Classic serif honor recognizing rigorous problem-solving study." },
      { slugPart: "fellowship-graduate", name: "Postgraduate Seminar Award", desc: "Refined academic portrait layout for graduate research seminars." },
      { slugPart: "robotics-edu-lab", name: "STEM Robotics Lab Award", desc: "Architectural frame built for university maker & hardware labs." },
      { slugPart: "lifelong-learner", name: "Open University Scholar", desc: "Clean ivory-and-teal frame celebrating open-access mastery." },
    ],
  },
];

const CERT_PALETTES: Array<{
  borderStyle: CertificateBorderStyleKey;
  background: string;
  primaryColor: string;
  accentColor: string;
  fontDisplay: string;
  fontBody: string;
}> = [
  {
    borderStyle: "double-gold",
    background: "#FFFDF7",
    primaryColor: "#0F4C5C",
    accentColor: "#C59B27",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Plus Jakarta Sans",
  },
  {
    borderStyle: "architectural",
    background: "#FFFFFF",
    primaryColor: "#0F172A",
    accentColor: "#0F766E",
    fontDisplay: "Playfair Display",
    fontBody: "Inter",
  },
  {
    borderStyle: "filigree",
    background: "#FCFBF7",
    primaryColor: "#1E293B",
    accentColor: "#B45309",
    fontDisplay: "Cinzel",
    fontBody: "Inter",
  },
  {
    borderStyle: "modern-frame",
    background: "#F8FAFC",
    primaryColor: "#0369A1",
    accentColor: "#0F766E",
    fontDisplay: "Space Grotesk",
    fontBody: "Inter",
  },
  {
    borderStyle: "prestige-navy",
    background: "#FFFEFA",
    primaryColor: "#1E3A8A",
    accentColor: "#D97706",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Plus Jakarta Sans",
  },
  {
    borderStyle: "editorial-warm",
    background: "#FFFBF5",
    primaryColor: "#7C2D12",
    accentColor: "#C2410C",
    fontDisplay: "Playfair Display",
    fontBody: "DM Sans",
  },
  {
    borderStyle: "clean-grid",
    background: "#FFFFFF",
    primaryColor: "#0F766E",
    accentColor: "#334155",
    fontDisplay: "IBM Plex Sans",
    fontBody: "IBM Plex Sans",
  },
  {
    borderStyle: "board-crest",
    background: "#FAF8F3",
    primaryColor: "#111827",
    accentColor: "#B45309",
    fontDisplay: "Cinzel",
    fontBody: "Inter",
  },
  {
    borderStyle: "academic-crest",
    background: "#F7FBF9",
    primaryColor: "#1E293B",
    accentColor: "#047857",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Source Serif 4",
  },
  {
    borderStyle: "double-gold",
    background: "#0F172A",
    primaryColor: "#F8FAFC",
    accentColor: "#F59E0B",
    fontDisplay: "Cinzel",
    fontBody: "Plus Jakarta Sans",
  },
];

function buildCertificateCatalog(): CertificateTemplateCatalogItem[] {
  const list: CertificateTemplateCatalogItem[] = [...CERT_CORE_9];
  let sortOrder = 10;

  for (let c = 0; c < CERT_CATEGORY_META.length; c++) {
    const cat = CERT_CATEGORY_META[c];
    for (let t = 0; t < cat.themes.length; t++) {
      const theme = cat.themes[t];
      const palette = CERT_PALETTES[(c * 2 + t) % CERT_PALETTES.length];
      const isPortrait =
        cat.category === "professional" ||
        cat.category === "educational"
          ? t % 3 !== 2
          : t === 9 || t === 5;

      list.push({
        slug: `${cat.category.replace(/_/g, "-")}-${theme.slugPart}`,
        name: theme.name,
        description: theme.desc,
        category: cat.category,
        orientation: isPortrait ? "portrait" : "landscape",
        sortOrder: sortOrder++,
        layoutConfig: {
          borderStyle: palette.borderStyle,
          background: palette.background,
          primaryColor: palette.primaryColor,
          accentColor: palette.accentColor,
          fontDisplay: palette.fontDisplay,
          fontBody: palette.fontBody,
          titleDefault: cat.titleDefault,
        },
      });
    }
  }

  // Ensure exact count up to 100 (9 + 90 = 99 -> add 1 prestige flagship capstone)
  if (list.length < 100) {
    list.push({
      slug: "francis-flagship-fellow-100",
      name: "Creator Studio Flagship Open-Source Award",
      description:
        "Signature commemorative open-source achievement credential combining antique brass double framing and deep teal ink.",
      category: "excellence",
      orientation: "landscape",
      sortOrder: 100,
      layoutConfig: {
        borderStyle: "double-gold",
        background: "#FFFDF8",
        primaryColor: "#0F766E",
        accentColor: "#B45309",
        fontDisplay: "Cormorant Garamond",
        fontBody: "Plus Jakarta Sans",
        titleDefault: "Certificate of Flagship Excellence",
      },
    });
  }

  return list.slice(0, 100);
}

export const CERTIFICATE_TEMPLATE_CATALOG: CertificateTemplateCatalogItem[] =
  buildCertificateCatalog();

export const EXTRA_CERTIFICATE_TEMPLATES: CertificateTemplateCatalogItem[] = [
  {
    slug: "academic-senate-honors",
    name: "Academic Senate Dean Citation",
    description: "University senate academic honor certificate with classical double-gold rule.",
    category: "academic",
    orientation: "portrait",
    sortOrder: 101,
    layoutConfig: { borderStyle: "academic-crest", background: "#FFFDF7", primaryColor: "#1E293B", accentColor: "#B45309", fontDisplay: "Cormorant Garamond", fontBody: "Source Serif 4", titleDefault: "Academic Honor Citation" },
  },
  {
    slug: "academic-thesis-distinction",
    name: "Thesis & Dissertation Excellence",
    description: "Formal academic monograph frame for graduate research defense awards.",
    category: "academic",
    orientation: "landscape",
    sortOrder: 102,
    layoutConfig: { borderStyle: "double-gold", background: "#FCFBF7", primaryColor: "#0F4C5C", accentColor: "#C59B27", fontDisplay: "Cinzel", fontBody: "Source Serif 4", titleDefault: "Certificate of Research Excellence" },
  },
  {
    slug: "academic-scholarship-award",
    name: "Merit Scholarship Charter",
    description: "Prestigious ivory & navy academic scholarship award document.",
    category: "academic",
    orientation: "portrait",
    sortOrder: 103,
    layoutConfig: { borderStyle: "prestige-navy", background: "#FFFEFA", primaryColor: "#1E3A8A", accentColor: "#D97706", fontDisplay: "Cormorant Garamond", fontBody: "Plus Jakarta Sans", titleDefault: "Merit Scholarship Award" },
  },
  {
    slug: "academic-faculty-symposium",
    name: "Faculty Colloquium Scholar",
    description: "Clean scholarly frame recognizing research colloquium presenters.",
    category: "academic",
    orientation: "landscape",
    sortOrder: 104,
    layoutConfig: { borderStyle: "architectural", background: "#FFFFFF", primaryColor: "#1E293B", accentColor: "#0F766E", fontDisplay: "Playfair Display", fontBody: "Inter", titleDefault: "Academic Certificate" },
  },
  {
    slug: "corporate-leadership-fellow",
    name: "Corporate Leadership Summit",
    description: "Executive charcoal & antique brass layout for corporate leadership cohorts.",
    category: "corporate",
    orientation: "landscape",
    sortOrder: 105,
    layoutConfig: { borderStyle: "architectural", background: "#FFFFFF", primaryColor: "#0F172A", accentColor: "#B45309", fontDisplay: "Playfair Display", fontBody: "Plus Jakarta Sans", titleDefault: "Certificate of Corporate Leadership" },
  },
  {
    slug: "corporate-service-milestone",
    name: "5-Year Service Tenure Plaque",
    description: "Distinguished corporate anniversary & employee appreciation credential.",
    category: "corporate",
    orientation: "landscape",
    sortOrder: 106,
    layoutConfig: { borderStyle: "prestige-navy", background: "#FAF8F3", primaryColor: "#1E3A8A", accentColor: "#C59B27", fontDisplay: "Cinzel", fontBody: "Inter", titleDefault: "Certificate of Dedicated Service" },
  },
  {
    slug: "corporate-innovation-star",
    name: "Enterprise Innovation Award",
    description: "Sleek modern corporate border for quarterly engineering & product winners.",
    category: "corporate",
    orientation: "landscape",
    sortOrder: 107,
    layoutConfig: { borderStyle: "modern-frame", background: "#F8FAFC", primaryColor: "#0F766E", accentColor: "#0369A1", fontDisplay: "Space Grotesk", fontBody: "Inter", titleDefault: "Corporate Innovation Award" },
  },
  {
    slug: "corporate-board-commendation",
    name: "Executive Board Commendation",
    description: "Midnight obsidian & gold presentation certificate for top enterprise awards.",
    category: "corporate",
    orientation: "landscape",
    sortOrder: 108,
    layoutConfig: { borderStyle: "double-gold", background: "#0F172A", primaryColor: "#F8FAFC", accentColor: "#F59E0B", fontDisplay: "Cinzel", fontBody: "Plus Jakarta Sans", titleDefault: "Executive Commendation" },
  },
  {
    slug: "sports-championship-gold",
    name: "Championship Gold Podium",
    description: "Bold athletic tournament winner certificate with high-contrast crest zone.",
    category: "sports",
    orientation: "landscape",
    sortOrder: 109,
    layoutConfig: { borderStyle: "filigree", background: "#FFFDF7", primaryColor: "#111827", accentColor: "#D97706", fontDisplay: "Cinzel", fontBody: "Plus Jakarta Sans", titleDefault: "Championship Sports Certificate" },
  },
  {
    slug: "sports-marathon-finisher",
    name: "Marathon & Endurance Finisher",
    description: "Dynamic clean modern finisher certificate highlighting distance & time.",
    category: "sports",
    orientation: "landscape",
    sortOrder: 110,
    layoutConfig: { borderStyle: "modern-frame", background: "#F8FAFC", primaryColor: "#0369A1", accentColor: "#0F766E", fontDisplay: "Space Grotesk", fontBody: "Inter", titleDefault: "Official Finisher Certificate" },
  },
  {
    slug: "sports-varsity-mvp",
    name: "Varsity Athletics MVP",
    description: "Collegiate navy & gold sports excellence frame for team MVPs.",
    category: "sports",
    orientation: "portrait",
    sortOrder: 111,
    layoutConfig: { borderStyle: "board-crest", background: "#FFFEFA", primaryColor: "#1E3A8A", accentColor: "#B45309", fontDisplay: "Cormorant Garamond", fontBody: "Plus Jakarta Sans", titleDefault: "Athletics Excellence Award" },
  },
  {
    slug: "sports-club-tournament",
    name: "Inter-Club Tournament Record",
    description: "Clean crisp grid certificate for regional tournaments & leagues.",
    category: "sports",
    orientation: "landscape",
    sortOrder: 112,
    layoutConfig: { borderStyle: "clean-grid", background: "#FFFFFF", primaryColor: "#0F766E", accentColor: "#1E293B", fontDisplay: "IBM Plex Sans", fontBody: "IBM Plex Sans", titleDefault: "Sports Tournament Certificate" },
  },
  {
    slug: "competition-coding-olympiad",
    name: "Algorithmic Coding Olympiad",
    description: "Precision technical competition certificate for coding & CTF laureates.",
    category: "competition",
    orientation: "landscape",
    sortOrder: 113,
    layoutConfig: { borderStyle: "clean-grid", background: "#0F172A", primaryColor: "#F8FAFC", accentColor: "#14B8A6", fontDisplay: "Space Grotesk", fontBody: "IBM Plex Sans", titleDefault: "Certificate of Competition Rank" },
  },
  {
    slug: "competition-science-fair",
    name: "National Science Fair Finalist",
    description: "Classic scholarly award recognizing STEM fair finalists and medalists.",
    category: "competition",
    orientation: "landscape",
    sortOrder: 114,
    layoutConfig: { borderStyle: "double-gold", background: "#FFFDF7", primaryColor: "#0F4C5C", accentColor: "#C59B27", fontDisplay: "Cormorant Garamond", fontBody: "Plus Jakarta Sans", titleDefault: "Competition Finalist Award" },
  },
  {
    slug: "competition-debate-rhetoric",
    name: "Parliamentary Debate Champion",
    description: "Editorial serif competition trophy certificate for debate & model UN.",
    category: "competition",
    orientation: "portrait",
    sortOrder: 115,
    layoutConfig: { borderStyle: "editorial-warm", background: "#FFFBF5", primaryColor: "#7C2D12", accentColor: "#C2410C", fontDisplay: "Playfair Display", fontBody: "DM Sans", titleDefault: "Certificate of Championship" },
  },
  {
    slug: "competition-design-award",
    name: "Global Product Design Finalist",
    description: "Minimal architectural competition award for design & architecture jurists.",
    category: "competition",
    orientation: "landscape",
    sortOrder: 116,
    layoutConfig: { borderStyle: "architectural", background: "#FFFFFF", primaryColor: "#111827", accentColor: "#0F766E", fontDisplay: "Playfair Display", fontBody: "Inter", titleDefault: "Design Competition Award" },
  },
  {
    slug: "volunteer-civic-service",
    name: "Civic Volunteer Service Medal",
    description: "Warm community service certificate recognizing verified volunteer hours.",
    category: "volunteer",
    orientation: "landscape",
    sortOrder: 117,
    layoutConfig: { borderStyle: "editorial-warm", background: "#FFFDF8", primaryColor: "#0F766E", accentColor: "#D97706", fontDisplay: "Playfair Display", fontBody: "Plus Jakarta Sans", titleDefault: "Certificate of Volunteer Service" },
  },
  {
    slug: "volunteer-eco-steward",
    name: "Environmental Stewardship Honor",
    description: "Emerald & ivory volunteer credential for sustainability initiatives.",
    category: "volunteer",
    orientation: "landscape",
    sortOrder: 118,
    layoutConfig: { borderStyle: "academic-crest", background: "#F7FBF9", primaryColor: "#065F46", accentColor: "#B45309", fontDisplay: "Cormorant Garamond", fontBody: "Inter", titleDefault: "Volunteer Appreciation Certificate" },
  },
  {
    slug: "volunteer-humanitarian-relief",
    name: "Community Impact & Relief",
    description: "Clean formal volunteer certificate for NGOs and campus outreach.",
    category: "volunteer",
    orientation: "portrait",
    sortOrder: 119,
    layoutConfig: { borderStyle: "modern-frame", background: "#FFFFFF", primaryColor: "#0369A1", accentColor: "#0F766E", fontDisplay: "Cormorant Garamond", fontBody: "Plus Jakarta Sans", titleDefault: "Certificate of Humanitarian Service" },
  },
  {
    slug: "volunteer-open-edu-tutor",
    name: "Open Education Peer Tutor",
    description: "Crisp ivory recognition card for community educators and STEM tutors.",
    category: "volunteer",
    orientation: "landscape",
    sortOrder: 120,
    layoutConfig: { borderStyle: "double-gold", background: "#FFFDF7", primaryColor: "#1E293B", accentColor: "#C59B27", fontDisplay: "Playfair Display", fontBody: "Inter", titleDefault: "Peer Educator Certificate" },
  },
  {
    slug: "professional-executive-ceu",
    name: "Executive Continuing Credit",
    description: "Board-grade continuing education unit certificate with dual signature zone.",
    category: "professional",
    orientation: "landscape",
    sortOrder: 121,
    layoutConfig: { borderStyle: "board-crest", background: "#FAF8F3", primaryColor: "#111827", accentColor: "#B45309", fontDisplay: "Cinzel", fontBody: "Inter", titleDefault: "Professional Development Certificate" },
  },
  {
    slug: "professional-agile-coach",
    name: "Agile & Delivery Practitioner",
    description: "Clean enterprise layout for agile leadership & scrum workshops.",
    category: "professional",
    orientation: "landscape",
    sortOrder: 122,
    layoutConfig: { borderStyle: "clean-grid", background: "#FFFFFF", primaryColor: "#0F4C5C", accentColor: "#0F766E", fontDisplay: "Space Grotesk", fontBody: "IBM Plex Sans", titleDefault: "Professional Training Credential" },
  },
  {
    slug: "professional-ai-practitioner",
    name: "Certified AI Systems Builder",
    description: "Modern deep-slate certification template for applied AI engineering tracks.",
    category: "professional",
    orientation: "landscape",
    sortOrder: 123,
    layoutConfig: { borderStyle: "modern-frame", background: "#0F172A", primaryColor: "#F8FAFC", accentColor: "#F59E0B", fontDisplay: "Space Grotesk", fontBody: "Plus Jakarta Sans", titleDefault: "Professional AI Certification" },
  },
  {
    slug: "professional-ethics-board",
    name: "Governance & Compliance Charter",
    description: "Formal portrait board credential for professional regulatory compliance.",
    category: "professional",
    orientation: "portrait",
    sortOrder: 124,
    layoutConfig: { borderStyle: "prestige-navy", background: "#FFFEFA", primaryColor: "#1E3A8A", accentColor: "#B45309", fontDisplay: "Cormorant Garamond", fontBody: "Inter", titleDefault: "Professional Development Charter" },
  },
];

export const ALL_CERTIFICATE_TEMPLATES: CertificateTemplateCatalogItem[] = [
  ...CERTIFICATE_TEMPLATE_CATALOG,
  ...EXTRA_CERTIFICATE_TEMPLATES,
];

export function getResumeTemplateLayout(slug: string): ResumeLayoutConfig {
  const found = RESUME_TEMPLATE_CATALOG.find((t) => t.slug === slug);
  return (
    found?.layoutConfig ?? {
      columns: 1,
      fontFamily: "Inter",
      headingStyle: "uppercase-rule",
      accent: "#0F766E",
      photoSupported: false,
      headerAlign: "left",
    }
  );
}

export function getCertificateTemplateConfig(slug: string): CertificateTemplateCatalogItem | undefined {
  return ALL_CERTIFICATE_TEMPLATES.find((t) => t.slug === slug);
}
