import {
  CareerRecommendationReport,
  CertificateCanvasElement,
  CertificateDesignReview,
  CertificateStyleConfig,
  ResumeData,
  ResumeQualityReport,
  ResumeStyleConfig,
} from "../types/index";

const ACTION_VERBS = [
  "architected",
  "built",
  "created",
  "designed",
  "developed",
  "engineered",
  "implemented",
  "improved",
  "launched",
  "led",
  "managed",
  "optimized",
  "reduced",
  "scaled",
  "streamlined",
  "automated",
  "delivered",
  "analyzed",
  "collaborated",
  "deployed",
];

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "your",
    "will",
    "have",
    "more",
    "about",
    "into",
    "such",
    "work",
    "team",
    "role",
    "skills",
    "experience",
    "years",
    "strong",
    "ability",
    "using",
    "build",
  ]);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stopWords.has(t));
  return Array.from(new Set(tokens)).slice(0, 40);
}

export function analyzeResumeQuality(
  resume: ResumeData,
  style?: Partial<ResumeStyleConfig>,
  jobDescription?: string
): ResumeQualityReport {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingSections: string[] = [];
  const recommendations: ResumeQualityReport["recommendations"] = [];

  let structureScore = 0;
  let impactScore = 0;
  let atsScore = 30;

  const p = resume.personalInfo;
  if (p.fullName.trim()) {
    structureScore += 6;
    atsScore += 6;
  } else {
    missingSections.push("Full Name in Personal Info");
  }

  if (p.email.trim() && p.phone.trim()) {
    structureScore += 6;
    atsScore += 10;
    strengths.push("Complete primary contact information (email and phone) is included.");
  } else {
    weaknesses.push("Missing email or phone number in contact header.");
    recommendations.push({
      id: "rec-contact",
      title: "Add complete contact details",
      impact: "high",
      description: "Include a verified email address, phone number, and city/region in Personal Info.",
      rationale: "Recruiters and ATS parsers require direct contact fields before advancing candidates.",
    });
  }

  if (resume.summary.trim().length >= 80) {
    structureScore += 10;
    atsScore += 10;
    strengths.push("Clear professional summary introduces your background and scope.");
  } else if (resume.careerObjective.trim().length >= 60) {
    structureScore += 8;
    atsScore += 8;
    strengths.push("Career objective gives early-career focus for recruiters.");
  } else {
    missingSections.push("Professional Summary or Career Objective");
    recommendations.push({
      id: "rec-summary",
      title: "Add a 2–3 sentence Professional Summary",
      impact: "high",
      description:
        "Summarize your core domain, strongest technical stack, and one concrete outcome.",
      rationale:
        "Your current summary is empty or under 80 characters; recruiters scan the top summary within 6 seconds.",
    });
  }

  if (resume.education.length > 0) {
    structureScore += 10;
    atsScore += 8;
  } else {
    missingSections.push("Education");
    recommendations.push({
      id: "rec-education",
      title: "Add your Education history",
      impact: "medium",
      description: "Include your degree, institution name, field of study, and graduation year.",
      rationale: "Education section currently has 0 entries.",
    });
  }

  const workCount = resume.experience.length + resume.internships.length;
  if (workCount > 0) {
    structureScore += 14;
    atsScore += 12;
  } else {
    missingSections.push("Work Experience or Internships");
    weaknesses.push("No work experience or internships listed yet.");
    recommendations.push({
      id: "rec-exp",
      title: "Add internships, freelance work, or roles",
      impact: "high",
      description:
        "If you are a fresher, add academic internships, open-source contributions, or campus leadership roles.",
      rationale: "Both Experience and Internships sections currently contain 0 entries.",
    });
  }

  if (resume.projects.length >= 2) {
    structureScore += 12;
    atsScore += 8;
    strengths.push(`Showcases ${resume.projects.length} concrete projects.`);
  } else {
    if (resume.projects.length === 0) missingSections.push("Projects");
    recommendations.push({
      id: "rec-projects",
      title:
        resume.projects.length === 0
          ? "Add 2 hands-on technical or portfolio projects"
          : "Add 1 more project to demonstrate breadth",
      impact: "high",
      description:
        "Include project name, tools used, problem solved, and measurable result or user impact.",
      rationale: `You currently have ${resume.projects.length} project(s); 2+ well-documented projects strongly strengthen technical resumes.`,
    });
  }

  if (resume.technicalSkills.length >= 6) {
    structureScore += 10;
    atsScore += 10;
    strengths.push(`${resume.technicalSkills.length} technical skills improve keyword discoverability.`);
  } else {
    weaknesses.push("Fewer than 6 technical skills listed.");
    recommendations.push({
      id: "rec-skills",
      title: "Expand Technical Skills section to 6–14 core skills",
      impact: "medium",
      description:
        "Group relevant languages, frameworks, databases, and tools clearly without stuffing unrelated keywords.",
      rationale: `Only ${resume.technicalSkills.length} technical skills listed so far.`,
    });
  }

  if (resume.softSkills.length >= 2) {
    structureScore += 4;
  } else {
    missingSections.push("Soft Skills");
  }

  // Analyze bullets for measurable outcomes & action verbs
  const allBullets = [
    ...resume.experience.flatMap((e) => e.bullets),
    ...resume.internships.flatMap((i) => i.highlights),
    ...resume.projects.flatMap((pr) => pr.highlights),
  ]
    .map((b) => b.trim())
    .filter(Boolean);

  const quantifiedBullets = allBullets.filter((b) => /\d+%|\$\d+|\d+\+|\b\d+\s?(ms|s|x|users|clients|hrs|hours|days)\b/i.test(b));
  const actionVerbBullets = allBullets.filter((b) =>
    ACTION_VERBS.some((v) => b.toLowerCase().startsWith(v))
  );

  if (allBullets.length > 0) {
    const quantRatio = quantifiedBullets.length / allBullets.length;
    const verbRatio = actionVerbBullets.length / allBullets.length;
    impactScore += Math.round(quantRatio * 18 + verbRatio * 10);

    if (quantifiedBullets.length >= 2) {
      strengths.push("Bullet points include quantified metrics (percentages, counts, or latency gains).");
    } else {
      weaknesses.push("Most experience/project bullets lack measurable numbers or outcomes.");
      recommendations.push({
        id: "rec-metrics",
        title: "Quantify your achievements with numbers",
        impact: "high",
        description:
          "Rewrite bullets to follow Action Verb + What You Built + Measurable Result (e.g., 'Reduced API latency by 35%').",
        rationale: `${quantifiedBullets.length} of ${allBullets.length} bullet points currently include measurable metrics.`,
      });
    }
  } else {
    weaknesses.push("No achievement bullet points written yet.");
  }

  if (style?.showPhoto) {
    atsScore -= 4;
    recommendations.push({
      id: "rec-photo-ats",
      title: "Consider hiding profile photo for North America / strict ATS roles",
      impact: "low",
      description:
        "For roles in regions where photo-free resumes are standard, toggle Profile Photo off in Layout settings.",
      rationale: "Some older ATS parsers flag embedded portraits, though visual regions in Europe/Asia often welcome them.",
    });
  }

  let keywordMatches: ResumeQualityReport["keywordMatches"];
  if (jobDescription && jobDescription.trim().length > 20) {
    const jdKeywords = extractKeywords(jobDescription);
    const resumeCorpus = JSON.stringify(resume).toLowerCase();
    const matched = jdKeywords.filter((k) => resumeCorpus.includes(k));
    const missing = jdKeywords.filter((k) => !resumeCorpus.includes(k)).slice(0, 12);
    const matchPercentage =
      jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 0;
    keywordMatches = { matched: matched.slice(0, 15), missing, matchPercentage };
    atsScore = Math.min(100, Math.round(atsScore * 0.7 + matchPercentage * 0.3));
    if (missing.length > 0) {
      recommendations.push({
        id: "rec-jd-keywords",
        title: "Align terminology with target job description",
        impact: "high",
        description: `Review missing target keywords (${missing.slice(0, 5).join(", ")}) and include ones you genuinely know.`,
        rationale: `Current keyword overlap with your pasted job description is ${matchPercentage}%.`,
      });
    }
  }

  const overallScore = Math.max(12, Math.min(100, structureScore + impactScore));
  const boundedAts = Math.max(15, Math.min(100, atsScore));
  const atsLevel: ResumeQualityReport["atsLevel"] =
    boundedAts >= 78 ? "Strong" : boundedAts >= 55 ? "Moderate" : "Needs Work";

  return {
    overallScore,
    atsReadiness: boundedAts,
    atsLevel,
    strengths,
    weaknesses,
    missingSections,
    recommendations,
    keywordMatches,
    disclaimer:
      "Transparency note: Quality and ATS-readiness scores evaluate structure, completeness, and keyword alignment. No ATS score guarantees interview selection.",
  };
}

export function analyzeCareerRecommendations(resume: ResumeData, targetRole?: string): CareerRecommendationReport {
  const skillsLower = resume.technicalSkills.map((s) => s.toLowerCase());
  const degreeText = resume.education.map((e) => `${e.degree} ${e.field}`).join(" ").toLowerCase();
  const roleHint = (targetRole || resume.personalInfo.headline || "").toLowerCase();

  const isMl =
    skillsLower.some((s) => ["python", "pytorch", "tensorflow", "scikit-learn", "pandas", "ml"].includes(s)) ||
    /ai|ml|machine learning|data/.test(roleHint + " " + degreeText);
  const isFrontend =
    skillsLower.some((s) => ["react", "next.js", "typescript", "css", "tailwind", "vue"].includes(s)) ||
    /frontend|ui|web/.test(roleHint);
  const isBackend =
    skillsLower.some((s) => ["node.js", "postgresql", "sql", "docker", "go", "java", "python"].includes(s)) ||
    /backend|systems|api|cloud/.test(roleHint);

  const careerPaths: CareerRecommendationReport["careerPaths"] = [];
  const missingTechnicalSkills: string[] = [];
  const projectIdeas: CareerRecommendationReport["projectIdeas"] = [];
  const interviewTopics: string[] = [];

  if (isMl) {
    careerPaths.push({
      role: "Applied Machine Learning / AI Engineer",
      fitReason: "Suggested because your skills/background include Python, data tooling, or AI-related education.",
      nextSteps: [
        "Build one end-to-end model evaluation pipeline with reproducible benchmarks.",
        "Document inference latency and dataset validation in your project bullets.",
      ],
    });
    for (const s of ["PyTorch", "SQL", "FastAPI", "Evaluation Metrics", "Docker"]) {
      if (!skillsLower.includes(s.toLowerCase())) missingTechnicalSkills.push(s);
    }
    projectIdeas.push({
      title: "Domain Document Q&A Evaluator with Citation Accuracy",
      description: "Build a retrieval pipeline that scores groundedness and latency instead of unverified answers.",
      skillsPracticed: ["Python", "Embeddings", "FastAPI", "Evaluation"],
    });
    interviewTopics.push("Bias-variance tradeoff & overfitting diagnostics", "Precision/recall vs ROC-AUC", "Model serving & latency budgets");
  }

  if (isFrontend || (!isMl && !isBackend)) {
    careerPaths.push({
      role: "Full-Stack / Frontend Product Engineer",
      fitReason:
        isFrontend
          ? "Suggested based on your modern web UI skills (React / TypeScript / Next.js)."
          : "Strong high-demand baseline track matching general software engineering foundations.",
      nextSteps: [
        "Highlight accessible UI engineering (WCAG keyboard navigation, responsive layout).",
        "Include real performance metrics (Core Web Vitals or bundle optimizations).",
      ],
    });
    for (const s of ["TypeScript", "Next.js", "PostgreSQL", "Playwright Testing", "REST / GraphQL APIs"]) {
      if (!skillsLower.includes(s.toLowerCase())) missingTechnicalSkills.push(s);
    }
    projectIdeas.push({
      title: "Accessible Collaborative Document Workspace",
      description: "Create a role-gated editor with offline drafts, keyboard shortcuts, and PDF export.",
      skillsPracticed: ["TypeScript", "Next.js", "PostgreSQL", "Testing"],
    });
    interviewTopics.push("React rendering & state synchronization", "Web security (XSS, CSRF, auth sessions)", "Accessible component architecture");
  }

  if (isBackend) {
    careerPaths.push({
      role: "Backend & Distributed Systems Engineer",
      fitReason: "Suggested because your profile includes SQL, backend runtimes, or systems experience.",
      nextSteps: [
        "Showcase database indexing, row-level security, and transaction design.",
        "Benchmark throughput and error handling under concurrency.",
      ],
    });
    for (const s of ["PostgreSQL Indexing", "Redis", "Docker", "Automated API Testing"]) {
      if (!skillsLower.includes(s.toLowerCase())) missingTechnicalSkills.push(s);
    }
    projectIdeas.push({
      title: "Multi-Tenant Audit & Rate-Limiting Gateway",
      description: "Implement sliding-window rate limits, structured logging, and role-based policy enforcement.",
      skillsPracticed: ["Node.js / Go", "PostgreSQL", "Security"],
    });
    interviewTopics.push("Database indexing & query plans", "Idempotency & retries", "Authentication & authorization boundaries");
  }

  return {
    careerPaths,
    missingTechnicalSkills: Array.from(new Set(missingTechnicalSkills)).slice(0, 8),
    learningRoadmap: [
      {
        phase: "Weeks 1–2",
        focus: "Core Fundamentals & Resume Alignment",
        outcome: "Polish 2 portfolio projects and verify every resume bullet highlights concrete outcomes.",
      },
      {
        phase: "Weeks 3–4",
        focus: "Testing, Reliability & Production Deployment",
        outcome: "Add automated tests, CI checks, and clean README documentation to public repositories.",
      },
      {
        phase: "Weeks 5–6",
        focus: "Mock Interviews & Role-Specific Case Studies",
        outcome: "Practice articulating trade-offs clearly across system design and coding rounds.",
      },
    ],
    projectIdeas,
    interviewTopics: Array.from(new Set(interviewTopics)),
    internshipGuidance: [
      "Target open-source contributions and verifiable project demos alongside formal internship applications.",
      "Tailor your Career Objective and top 3 skills to each role description rather than sending a generic copy.",
    ],
    disclaimer:
      "Career suggestions are derived strictly from the skills, education, and target role you provided. Live job vacancies are never fabricated.",
  };
}

export function analyzeCertificateDesign(params: {
  title: string;
  recipientName: string;
  courseName: string;
  organizationName: string;
  signatoryName?: string;
  elements: CertificateCanvasElement[];
  style: CertificateStyleConfig;
}): CertificateDesignReview {
  const alignmentNotes: string[] = [];
  const fontRecommendations: string[] = [];
  const colorRecommendations: string[] = [];
  const wordingSuggestions: string[] = [];
  const sealPlacementNotes: string[] = [];
  let score = 92;

  if (!params.recipientName.trim() || params.recipientName === "Recipient Name") {
    score -= 10;
    wordingSuggestions.push("Enter the actual recipient full name before exporting.");
  }
  if (!params.signatoryName?.trim()) {
    score -= 8;
    wordingSuggestions.push("Add an authorized signatory name and designation for institutional clarity.");
  }
  if (params.courseName.length > 90) {
    score -= 6;
    alignmentNotes.push("Course or achievement title is quite long; keep under 90 characters to avoid line wrapping.");
  } else {
    alignmentNotes.push("Primary recipient and achievement text lengths fit cleanly inside standard A4 margins.");
  }

  const seals = params.elements.filter((e) => e.type === "seal" || e.type === "stamp" || e.type === "decorative_badge");
  if (seals.length === 0) {
    sealPlacementNotes.push("Consider placing an authorized seal or decorative preview badge in the lower-right corner (x: 74–86%, y: 64–78%).");
  } else {
    for (const s of seals) {
      if (s.x > 25 && s.x < 65 && s.y > 25 && s.y < 65) {
        score -= 8;
        sealPlacementNotes.push(`Element "${s.label}" overlaps the central recipient text zone; move toward bottom corners.`);
      }
      if (s.isSampleDecorative) {
        sealPlacementNotes.push(`"${s.label}" is marked as a decorative preview stamp — replace with your organization's genuine seal if issuing officially.`);
      }
    }
  }

  if (params.style.fontDisplay === params.style.fontBody) {
    fontRecommendations.push("Pair a classic serif display font (e.g., Cormorant Garamond or Cinzel) with a clean sans-serif body font (Inter / Plus Jakarta Sans) for sharper hierarchy.");
  } else {
    fontRecommendations.push(`Display (${params.style.fontDisplay}) + Body (${params.style.fontBody}) provides crisp typographic contrast.`);
  }

  if (params.style.backgroundColor.toLowerCase() === params.style.primaryColor.toLowerCase()) {
    score -= 25;
    colorRecommendations.push("Background and primary text colors match — change primary text color for high contrast.");
  } else {
    colorRecommendations.push("Foreground ink maintains strong contrast against your selected certificate paper tone.");
  }

  return {
    readabilityScore: Math.max(40, Math.min(100, score)),
    alignmentNotes,
    fontRecommendations,
    colorRecommendations,
    wordingSuggestions,
    sealPlacementNotes,
  };
}

export function generateSmartDashboardRecommendations(input: {
  hasHeadline: boolean;
  resumes: Array<{ id: string; title: string; template_slug: string; data: ResumeData }>;
  certificates: Array<{ id: string; title: string; style_config?: Partial<CertificateStyleConfig>; canvas_elements?: CertificateCanvasElement[]; signatory_name?: string | null }>;
}): Array<{
  category: "resume" | "career" | "certificate" | "dashboard";
  target_document_id: string | null;
  title: string;
  description: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  action_payload: Record<string, string>;
}> {
  const recs: Array<{
    category: "resume" | "career" | "certificate" | "dashboard";
    target_document_id: string | null;
    title: string;
    description: string;
    rationale: string;
    priority: "high" | "medium" | "low";
    action_payload: Record<string, string>;
  }> = [];

  if (!input.hasHeadline) {
    recs.push({
      category: "dashboard",
      target_document_id: null,
      title: "Add a professional headline to your profile",
      description: "Your account profile does not include a professional headline yet.",
      rationale: "Generated because your fcs_profiles.headline field is empty; adding it personalizes resume and career suggestions.",
      priority: "medium",
      action_payload: { href: "/settings" },
    });
  }

  if (input.resumes.length === 0) {
    recs.push({
      category: "resume",
      target_document_id: null,
      title: "Create your first ATS-ready resume",
      description: "Start with the ATS Precision Standard template to generate a clean, recruiter-readable baseline.",
      rationale: "Generated because you have 0 saved resumes in your workspace.",
      priority: "high",
      action_payload: { href: "/resume-builder?template=ats-clean" },
    });
  } else {
    const latest = input.resumes[0];
    const data = latest.data;
    if (!data?.summary?.trim()) {
      recs.push({
        category: "resume",
        target_document_id: latest.id,
        title: `Add a professional summary to "${latest.title}"`,
        description: "Your resume does not include a professional summary yet.",
        rationale: `Generated after inspecting resume "${latest.title}": the summary field is currently blank.`,
        priority: "high",
        action_payload: { href: `/resume-builder/${latest.id}` },
      });
    }
    if ((data?.projects?.length ?? 0) < 2) {
      recs.push({
        category: "resume",
        target_document_id: latest.id,
        title: `Add ${2 - (data?.projects?.length ?? 0)} technical project(s) to "${latest.title}"`,
        description: `Your resume "${latest.title}" could be strengthened by adding concrete projects with measurable outcomes.`,
        rationale: `Generated because "${latest.title}" currently has ${data?.projects?.length ?? 0} project entry(ies).`,
        priority: "high",
        action_payload: { href: `/resume-builder/${latest.id}` },
      });
    }
    if (latest.template_slug === "creative-folio") {
      recs.push({
        category: "resume",
        target_document_id: latest.id,
        title: "Try an ATS-friendly template for formal engineering applications",
        description: "Switch or duplicate into ATS Precision Standard or Systems & Engineering Spec for maximum parser compatibility.",
        rationale: `"${latest.title}" currently uses a two-column creative layout.`,
        priority: "low",
        action_payload: { href: `/resume-builder/${latest.id}` },
      });
    }
  }

  if (input.certificates.length > 0) {
    const cert = input.certificates[0];
    if (!cert.signatory_name?.trim()) {
      recs.push({
        category: "certificate",
        target_document_id: cert.id,
        title: `Add signatory details to "${cert.title}"`,
        description: "Include an authorized signatory name & designation to improve credential clarity.",
        rationale: `Certificate "${cert.title}" currently has no signatory name set.`,
        priority: "medium",
        action_payload: { href: `/certificate-builder/${cert.id}` },
      });
    }
  }

  return recs;
}
