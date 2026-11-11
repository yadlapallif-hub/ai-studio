import {
  CertificateCanvasElement,
  CertificateStyleConfig,
  DEFAULT_RESUME_SECTION_ORDER,
  ResumeData,
  ResumeStyleConfig,
} from "../types/index";

export function createEmptyResumeData(): ResumeData {
  return {
    personalInfo: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      github: "",
    },
    profilePhoto: {
      url: "",
      shape: "circle",
      position: "right",
      brightness: 100,
      contrast: 100,
      rotation: 0,
      zoom: 1,
      bgRemoved: false,
    },
    summary: "",
    careerObjective: "",
    education: [],
    experience: [],
    technicalSkills: [],
    softSkills: [],
    projects: [],
    internships: [],
    certifications: [],
    languages: [],
    achievements: [],
    references: [],
  };
}

export function createSampleStarterResumeData(): ResumeData {
  return {
    personalInfo: {
      fullName: "Alex Rivera",
      headline: "Full-Stack Software Engineer",
      email: "alex.rivera@example.org",
      phone: "+1 (555) 234-8910",
      location: "Austin, TX • Open to Remote",
      website: "https://alexrivera.dev",
      linkedin: "linkedin.com/in/alexrivera",
      github: "github.com/alexrivera",
    },
    profilePhoto: {
      url: "",
      shape: "circle",
      position: "right",
      brightness: 100,
      contrast: 100,
      rotation: 0,
      zoom: 1,
      bgRemoved: false,
    },
    summary:
      "Product-minded full-stack engineer with 3+ years designing TypeScript, Next.js, and PostgreSQL applications. Built high-reliability document workflows and reduced page load latency by 38% across customer-facing dashboards.",
    careerObjective: "",
    education: [
      {
        id: "edu-1",
        institution: "State University of Engineering",
        degree: "B.S. in Computer Science",
        field: "Distributed Systems & Software Engineering",
        startDate: "2019",
        endDate: "2023",
        gpa: "3.8 / 4.0",
        highlights: "Senior Capstone: Real-time collaborative document renderer",
      },
    ],
    experience: [
      {
        id: "exp-1",
        company: "Northstar Digital Systems",
        role: "Software Engineer",
        location: "Austin, TX",
        startDate: "Jul 2023",
        endDate: "Present",
        current: true,
        bullets: [
          "Architected responsive Next.js and PostgreSQL document workspace serving 28,000+ monthly active users with 99.95% uptime.",
          "Optimized database query plans and client caching, reducing median dashboard render time by 38%.",
          "Implemented role-based access controls and automated integration tests covering 92% of critical API endpoints.",
        ],
      },
    ],
    technicalSkills: [
      "TypeScript",
      "Next.js",
      "React",
      "Node.js",
      "PostgreSQL",
      "Supabase",
      "Tailwind CSS",
      "Docker",
      "Git",
    ],
    softSkills: [
      "Technical Writing",
      "Cross-Functional Collaboration",
      "System Design",
      "Mentoring",
    ],
    projects: [
      {
        id: "proj-1",
        name: "OpenVerify Credential Engine",
        role: "Lead Creator",
        url: "github.com/alexrivera/openverify",
        techStack: ["TypeScript", "PostgreSQL", "QRCode", "Next.js"],
        startDate: "2025",
        endDate: "2025",
        description:
          "Open-source credential verification registry with cryptographic QR links and audit logging.",
        highlights: [
          "Processed 4,500+ test credential lookups with sub-40ms median verification latency.",
        ],
      },
    ],
    internships: [
      {
        id: "int-1",
        organization: "CivicTech Labs",
        role: "Backend Engineering Intern",
        duration: "May 2022 – Aug 2022",
        location: "Remote",
        highlights: [
          "Built REST API validators and cut duplicate record ingestion by 64%.",
        ],
      },
    ],
    certifications: [
      {
        id: "cert-1",
        name: "PostgreSQL Performance & Security Fundamentals",
        issuer: "OpenDB Institute",
        date: "2024",
        credentialId: "ODB-88412",
      },
    ],
    languages: [
      { id: "lang-1", language: "English", proficiency: "Native / Fluent" },
      { id: "lang-2", language: "Spanish", proficiency: "Conversational" },
    ],
    achievements: [
      {
        id: "ach-1",
        title: "1st Place — Open-Source Accessibility Hackathon",
        issuer: "Civic Code Summit",
        date: "2024",
        description: "Built keyboard-navigable PDF viewer tools for screen-reader users.",
      },
    ],
    references: [
      {
        id: "ref-1",
        name: "Available upon request",
        title: "Professional References",
        organization: "Provided during final interview stage",
      },
    ],
  };
}

export function createDefaultResumeStyle(overrides?: Partial<ResumeStyleConfig>): ResumeStyleConfig {
  return {
    fontFamily: "Inter",
    accentColor: "#0F766E",
    fontSize: "standard",
    lineSpacing: "normal",
    sectionOrder: [...DEFAULT_RESUME_SECTION_ORDER],
    hiddenSections: [],
    showPhoto: false,
    ...overrides,
  };
}

export function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FCS-${year}-${suffix}`;
}

export function createDefaultCertificateStyle(
  overrides?: Partial<CertificateStyleConfig>
): CertificateStyleConfig {
  return {
    backgroundColor: "#FFFDF7",
    primaryColor: "#0F4C5C",
    accentColor: "#C59B27",
    borderStyle: "double-gold",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Plus Jakarta Sans",
    showQrCode: true,
    showBorder: true,
    ...overrides,
  };
}

export function createDecorativeSampleStampSvg(
  variant: "round_sample" | "gold_seal_sample" | "rect_draft_stamp"
): { label: string; svgDataUrl: string; shape: "circle" | "rectangle"; inkStyle: "blue_ink" | "red_ink" | "gold_embossed" } {
  if (variant === "gold_seal_sample") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">
      <defs>
        <radialGradient id="g" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#FDE68A"/>
          <stop offset="55%" stop-color="#D97706"/>
          <stop offset="100%" stop-color="#92400E"/>
        </radialGradient>
      </defs>
      <circle cx="110" cy="110" r="98" fill="url(#g)" stroke="#78350F" stroke-width="4" stroke-dasharray="7 4"/>
      <circle cx="110" cy="110" r="78" fill="none" stroke="#FEF3C7" stroke-width="2"/>
      <text x="110" y="96" text-anchor="middle" font-family="Georgia, serif" font-size="17" font-weight="bold" fill="#451A03" letter-spacing="2">DECORATIVE</text>
      <text x="110" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#451A03" letter-spacing="3">SAMPLE SEAL</text>
      <text x="110" y="144" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#78350F" letter-spacing="1.5">PREVIEW ONLY</text>
    </svg>`;
    return {
      label: "Decorative Gold Preview Seal (Sample Only)",
      svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      shape: "circle",
      inkStyle: "gold_embossed",
    };
  }

  if (variant === "rect_draft_stamp") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 120">
      <rect x="8" y="8" width="264" height="104" rx="10" fill="none" stroke="#B91C1C" stroke-width="5"/>
      <rect x="16" y="16" width="248" height="88" rx="6" fill="none" stroke="#B91C1C" stroke-width="1.5" stroke-dasharray="6 4"/>
      <text x="140" y="58" text-anchor="middle" font-family="monospace" font-size="24" font-weight="bold" fill="#B91C1C" letter-spacing="3">SAMPLE DRAFT</text>
      <text x="140" y="84" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#B91C1C" letter-spacing="1.8">DECORATIVE STAMP • NOT AN OFFICIAL SEAL</text>
    </svg>`;
    return {
      label: "Decorative Red Draft Stamp (Sample Only)",
      svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      shape: "rectangle",
      inkStyle: "red_ink",
    };
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">
    <circle cx="110" cy="110" r="96" fill="none" stroke="#1D4ED8" stroke-width="5"/>
    <circle cx="110" cy="110" r="84" fill="none" stroke="#1D4ED8" stroke-width="1.5" stroke-dasharray="5 3"/>
    <circle cx="110" cy="110" r="56" fill="none" stroke="#1D4ED8" stroke-width="1.5"/>
    <text x="110" y="102" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1D4ED8" letter-spacing="2">SAMPLE</text>
    <text x="110" y="124" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1D4ED8" letter-spacing="2">PREVIEW</text>
    <text x="110" y="182" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#1D4ED8" letter-spacing="1.2">DECORATIVE STAMP ONLY</text>
  </svg>`;
  return {
    label: "Decorative Blue Circular Stamp (Sample Only)",
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    shape: "circle",
    inkStyle: "blue_ink",
  };
}

export function createDefaultCertificateElements(): CertificateCanvasElement[] {
  const sampleSeal = createDecorativeSampleStampSvg("gold_seal_sample");
  return [
    {
      id: "el-sample-seal",
      type: "decorative_badge",
      label: sampleSeal.label,
      src: sampleSeal.svgDataUrl,
      x: 78,
      y: 66,
      width: 118,
      height: 118,
      rotation: 0,
      opacity: 0.9,
      zIndex: 5,
      shape: "circle",
      inkStyle: "gold_embossed",
      isSampleDecorative: true,
    },
  ];
}
