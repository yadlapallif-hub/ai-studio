import {
  CoverLetterTone,
  PortfolioData,
  PortfolioTemplateId,
  ResumeAiPatchProposal,
  ResumeData,
  ResumeHealthAxisScore,
  ResumeHealthCheckReport,
  ResumeStyleConfig,
} from "../types/index";
import { analyzeResumeQuality } from "./analyzer";

export const PORTFOLIO_TEMPLATES: Array<{
  id: PortfolioTemplateId;
  name: string;
  description: string;
  defaultTheme: "light" | "dark";
  defaultAccent: string;
}> = [
  {
    id: "linear-atelier",
    name: "Linear Precision Dark",
    description: "Hairline architectural grid with focused hero, bento projects, and dark precision surface.",
    defaultTheme: "dark",
    defaultAccent: "#14B8A6",
  },
  {
    id: "notion-editorial",
    name: "Notion Clean Editorial",
    description: "Warm paper editorial layout with serif display headings and structured document flow.",
    defaultTheme: "light",
    defaultAccent: "#0F766E",
  },
  {
    id: "stripe-mesh",
    name: "Stripe Product Showcase",
    description: "High-contrast product cards, tech stack pills, and executive impact highlights.",
    defaultTheme: "light",
    defaultAccent: "#2563EB",
  },
  {
    id: "apple-minimal",
    name: "Apple Studio Minimal",
    description: "Generous negative space, centered typographic cadence, and ultra-clean project gallery.",
    defaultTheme: "light",
    defaultAccent: "#111827",
  },
  {
    id: "framer-obsidian",
    name: "Framer Obsidian Showcase",
    description: "High-craft nocturnal showcase with crisp monochrome surfaces and amber highlights.",
    defaultTheme: "dark",
    defaultAccent: "#F59E0B",
  },
  {
    id: "academic-folio",
    name: "Research & Academic Folio",
    description: "Publication-ready CV flow tailored for scholars, researchers, and fellows.",
    defaultTheme: "light",
    defaultAccent: "#7C2D12",
  },
];

const WEAK_PHRASES = [
  { pattern: /\bresponsible for\b/i, tip: 'Replace passive "responsible for" with an action verb (e.g., "Led", "Architected", "Built").' },
  { pattern: /\bhelped with\b/i, tip: 'Replace vague "helped with" with your specific contribution and outcome.' },
  { pattern: /\bworked on\b/i, tip: 'Replace generic "worked on" with "Engineered", "Delivered", or "Optimized".' },
  { pattern: /\bvarious\b/i, tip: 'Replace "various" with exact tools, counts, or systems you handled.' },
  { pattern: /\bhardworking\b|\bteam player\b/i, tip: 'Show evidence through shipped results instead of subjective buzzwords like "hardworking".' },
];

function polishBulletLine(line: string): string {
  let cleaned = line.trim().replace(/^[-•*]\s*/, "");
  if (!cleaned) return "";
  cleaned = cleaned
    .replace(/^responsible for\s+/i, "Led ")
    .replace(/^worked on\s+/i, "Engineered ")
    .replace(/^helped with\s+/i, "Collaborated on ");
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?]$/.test(cleaned)) cleaned = `${cleaned}.`;
  return cleaned;
}

export function buildDeterministicResumePatch(
  resume: ResumeData,
  goalText?: string
): ResumeAiPatchProposal {
  const goal = (goalText || "").trim();
  const lowerGoal = goal.toLowerCase();
  const isInternGoal = /intern|fresher|entry|graduate|junior/.test(lowerGoal);
  const isSweGoal = /software|developer|engineer|full[- ]?stack|backend|frontend|web|ai|ml/.test(lowerGoal);

  const p = resume.personalInfo;
  const topSkills = resume.technicalSkills.slice(0, 6);
  const experienceYearsHint =
    resume.experience.length > 0
      ? `${resume.experience.length}+ role${resume.experience.length > 1 ? "s" : ""}`
      : resume.projects.length > 0
        ? `${resume.projects.length} hands-on technical project${resume.projects.length > 1 ? "s" : ""}`
        : "structured academic & practical foundations";

  const targetRole =
    p.headline?.trim() ||
    (isInternGoal && isSweGoal
      ? "Software Developer Intern"
      : isSweGoal
        ? "Software Engineer"
        : "Candidate");

  const skillPhrase =
    topSkills.length > 0 ? ` using ${topSkills.slice(0, 4).join(", ")}` : "";

  const proposedSummary =
    resume.summary.trim().length >= 90 && !goal
      ? resume.summary.trim()
      : `${
          isInternGoal ? "Motivated " : "Results-oriented "
        }${targetRole} with ${experienceYearsHint}${skillPhrase}. Focused on building reliable, maintainable software with clear documentation, measurable quality, and user-centered execution.`;

  const suggestedTechnicalSkills: string[] = [];
  if (isSweGoal) {
    for (const candidate of ["TypeScript", "Git", "REST APIs", "PostgreSQL", "Unit Testing"]) {
      if (
        !resume.technicalSkills.some((s) => s.toLowerCase() === candidate.toLowerCase()) &&
        suggestedTechnicalSkills.length < 4
      ) {
        suggestedTechnicalSkills.push(candidate);
      }
    }
  }

  const suggestedSoftSkills: string[] = [];
  for (const candidate of ["Technical Communication", "Collaborative Code Review", "Problem Solving"]) {
    if (
      !resume.softSkills.some((s) => s.toLowerCase() === candidate.toLowerCase()) &&
      suggestedSoftSkills.length < 3
    ) {
      suggestedSoftSkills.push(candidate);
    }
  }

  const experienceBulletUpgrades = resume.experience
    .map((exp, index) => {
      const before = exp.bullets.filter(Boolean);
      const after = before.map(polishBulletLine).filter(Boolean);
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      return changed
        ? {
            index,
            company: exp.company,
            role: exp.role,
            before,
            after,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    rationale: goal
      ? `Tailored structure, summary clarity, and active bullet phrasing for "${goal}" without inventing unverified employers or metrics.`
      : "Strengthened top summary precision, active verb phrasing, and ATS keyword coverage while preserving your factual background.",
    targetRole,
    summary: proposedSummary !== resume.summary.trim() ? proposedSummary : undefined,
    suggestedTechnicalSkills: suggestedTechnicalSkills.length > 0 ? suggestedTechnicalSkills : undefined,
    suggestedSoftSkills: suggestedSoftSkills.length > 0 ? suggestedSoftSkills : undefined,
    experienceBulletUpgrades:
      experienceBulletUpgrades.length > 0 ? experienceBulletUpgrades : undefined,
  };
}

export function analyzeResumeHealthCheck(
  resume: ResumeData,
  style?: Partial<ResumeStyleConfig>,
  jobDescription?: string
): ResumeHealthCheckReport {
  const base = analyzeResumeQuality(resume, style, jobDescription);
  const p = resume.personalInfo;

  const allText = [
    resume.summary,
    resume.careerObjective,
    ...resume.experience.flatMap((e) => [e.role, e.company, ...e.bullets]),
    ...resume.internships.flatMap((i) => [i.role, i.organization, ...i.highlights]),
    ...resume.projects.flatMap((pr) => [pr.name, pr.description, ...pr.highlights]),
  ]
    .filter(Boolean)
    .join(" \n ");

  const grammarIssues: string[] = [];
  for (const rule of WEAK_PHRASES) {
    if (rule.pattern.test(allText)) grammarIssues.push(rule.tip);
  }
  if (/\s{2,}/.test(allText)) {
    grammarIssues.push("Remove consecutive extra spaces inside bullet points or summary paragraphs.");
  }
  const lowercaseBullets = [
    ...resume.experience.flatMap((e) => e.bullets),
    ...resume.internships.flatMap((i) => i.highlights),
  ].filter((b) => b.trim().length > 0 && /^[a-z]/.test(b.trim()));
  if (lowercaseBullets.length > 0) {
    grammarIssues.push(
      `Capitalize the first letter of ${lowercaseBullets.length} bullet point(s) for consistent editorial polish.`
    );
  }

  const structureScore = Math.min(
    100,
    (p.fullName.trim() ? 22 : 0) +
      (p.email.trim() && p.phone.trim() ? 22 : 8) +
      (resume.summary.trim() || resume.careerObjective.trim() ? 18 : 0) +
      (resume.education.length > 0 ? 18 : 0) +
      (resume.experience.length + resume.internships.length + resume.projects.length > 0 ? 20 : 0)
  );

  const summaryLen = resume.summary.trim().length;
  const summaryScore = summaryLen >= 130 ? 94 : summaryLen >= 70 ? 78 : summaryLen > 0 ? 52 : 20;

  const skillTotal = resume.technicalSkills.length + resume.softSkills.length;
  const skillsScore = skillTotal >= 10 ? 94 : skillTotal >= 6 ? 80 : skillTotal >= 3 ? 60 : 30;

  const expEntries = resume.experience.length + resume.internships.length;
  const totalBullets = [
    ...resume.experience.flatMap((e) => e.bullets),
    ...resume.internships.flatMap((i) => i.highlights),
    ...resume.projects.flatMap((pr) => pr.highlights),
  ].filter((b) => b.trim().length > 12).length;
  const experienceScore =
    expEntries > 0 && totalBullets >= 4
      ? 92
      : expEntries > 0 || resume.projects.length >= 2
        ? 76
        : 38;

  const educationScore =
    resume.education.length > 0
      ? resume.education.every((e) => e.institution.trim() && e.degree.trim())
        ? 95
        : 74
      : 35;

  const grammarScore = Math.max(45, 96 - grammarIssues.length * 12);
  const atsScore = base.atsReadiness;
  const jobRelevanceScore = base.keywordMatches
    ? Math.max(35, Math.min(98, base.keywordMatches.matchPercentage))
    : resume.personalInfo.headline?.trim() || resume.technicalSkills.length >= 5
      ? 75
      : 55;

  const toStatus = (n: number): ResumeHealthAxisScore["status"] =>
    n >= 82 ? "strong" : n >= 64 ? "good" : "needs_attention";

  const axes: ResumeHealthAxisScore[] = [
    {
      key: "structure",
      label: "Resume Structure",
      score: structureScore,
      status: toStatus(structureScore),
      finding: `Core identity, contact, and section sequence score ${structureScore}/100.`,
      action:
        structureScore >= 82
          ? "Hierarchy is scannable for both ATS parsers and hiring managers."
          : "Ensure contact info, summary, education, and at least one experience or project block are visible.",
    },
    {
      key: "summary",
      label: "Professional Summary",
      score: summaryScore,
      status: toStatus(summaryScore),
      finding:
        summaryLen === 0
          ? "No professional summary added yet."
          : `Current summary length is ${summaryLen} characters.`,
      action:
        summaryScore >= 82
          ? "Summary clearly introduces domain and core capabilities."
          : "Write 2–3 crisp sentences naming your target role, key stack, and measurable focus.",
    },
    {
      key: "skills",
      label: "Skills Coverage",
      score: skillsScore,
      status: toStatus(skillsScore),
      finding: `${resume.technicalSkills.length} technical + ${resume.softSkills.length} soft skills listed.`,
      action:
        skillsScore >= 82
          ? "Balanced hard and soft skill coverage."
          : "List 6–12 exact technical tools and 2–4 soft skills relevant to your role.",
    },
    {
      key: "experience",
      label: "Experience & Projects",
      score: experienceScore,
      status: toStatus(experienceScore),
      finding: `${expEntries} experience/internship role(s) and ${resume.projects.length} project(s) with ${totalBullets} detail bullets.`,
      action:
        experienceScore >= 82
          ? "Strong action-oriented proof of work."
          : "Add 2–3 impact bullets per role starting with strong verbs and measurable outcomes.",
    },
    {
      key: "education",
      label: "Education",
      score: educationScore,
      status: toStatus(educationScore),
      finding:
        resume.education.length > 0
          ? `${resume.education.length} education entry/entries complete.`
          : "Education section has 0 entries.",
      action:
        educationScore >= 82
          ? "Degree, institution, and dates are formatted cleanly."
          : "Include your degree title, institution name, and graduation year.",
    },
    {
      key: "grammar",
      label: "Grammar & Tone",
      score: grammarScore,
      status: toStatus(grammarScore),
      finding:
        grammarIssues.length === 0
          ? "Clean active voice and consistent punctuation detected."
          : `${grammarIssues.length} phrasing or formatting improvement(s) flagged.`,
      action: grammarIssues[0] || "Maintain consistent past tense for past roles and present tense for current work.",
    },
    {
      key: "atsCompatibility",
      label: "ATS Compatibility",
      score: atsScore,
      status: toStatus(atsScore),
      finding: `ATS readiness is ${atsScore}/100 (${base.atsLevel}).`,
      action:
        atsScore >= 80
          ? "Standard section labels and clean layout export safely to PDF & DOCX."
          : "Complete missing sections and avoid empty headings.",
    },
    {
      key: "jobRelevance",
      label: "Job Relevance",
      score: jobRelevanceScore,
      status: toStatus(jobRelevanceScore),
      finding: base.keywordMatches
        ? `${base.keywordMatches.matchPercentage}% keyword overlap with pasted job description.`
        : "Paste a target job description to unlock exact keyword overlap scoring.",
      action: base.keywordMatches?.missing.length
        ? `Reflect honest matches for: ${base.keywordMatches.missing.slice(0, 5).join(", ")}.`
        : "Include a target role headline and paste a job description when applying.",
    },
  ];

  const overallScore = Math.round(axes.reduce((sum, a) => sum + a.score, 0) / axes.length);
  const readinessLabel: ResumeHealthCheckReport["readinessLabel"] =
    overallScore >= 86
      ? "Executive Ready"
      : overallScore >= 72
        ? "Competitive"
        : overallScore >= 55
          ? "Developing"
          : "Needs Foundation";

  return {
    overallScore,
    readinessLabel,
    axes,
    grammarIssues,
    proposedPatch: buildDeterministicResumePatch(resume, jobDescription),
    disclaimer: base.disclaimer,
  };
}

export function buildPortfolioFromResume(
  resume: ResumeData,
  fallbackName = "Creator"
): PortfolioData {
  const p = resume.personalInfo;
  const fullName = p.fullName.trim() || fallbackName;
  const headline =
    p.headline.trim() ||
    (resume.technicalSkills.length > 0
      ? `${resume.technicalSkills.slice(0, 3).join(" • ")} Engineer`
      : "Product Builder & Software Engineer");

  return {
    fullName,
    headline,
    bio:
      resume.summary.trim() ||
      resume.careerObjective.trim() ||
      "Crafting reliable software, thoughtful interfaces, and user-first products.",
    location: p.location.trim() || "Remote / Global",
    email: p.email.trim() || "hello@example.com",
    availability: "Open to Software Engineering & Product Opportunities",
    avatarUrl: resume.profilePhoto?.url,
    ctaLabel: "Get in Touch",
    ctaHref: p.email.trim() ? `mailto:${p.email.trim()}` : "#contact",
    projects:
      resume.projects.length > 0
        ? resume.projects.map((pr, idx) => ({
            id: pr.id || `proj-${idx}`,
            title: pr.name || `Project ${idx + 1}`,
            tagline: pr.role || "Featured Engineering Project",
            description:
              pr.description ||
              pr.highlights.filter(Boolean).join(" ") ||
              "Designed and shipped end-to-end production software.",
            techStack: pr.techStack.length > 0 ? pr.techStack : resume.technicalSkills.slice(0, 4),
            liveUrl: pr.url || undefined,
            githubUrl: pr.url && pr.url.includes("github.com") ? pr.url : undefined,
            featured: idx < 2,
          }))
        : [
            {
              id: "proj-starter-1",
              title: "Featured Workspace Project",
              tagline: "Full-Stack Web Platform",
              description:
                "Architected responsive user flows, clean API endpoints, and database schemas with zero-downtime deployment.",
              techStack:
                resume.technicalSkills.length > 0
                  ? resume.technicalSkills.slice(0, 4)
                  : ["TypeScript", "Next.js", "PostgreSQL"],
              featured: true,
            },
          ],
    experience: [
      ...resume.experience.map((e, idx) => ({
        id: e.id || `exp-${idx}`,
        role: e.role,
        organization: e.company,
        period: `${e.startDate} — ${e.current ? "Present" : e.endDate || "Present"}`,
        highlights: e.bullets.filter(Boolean).join(" • "),
      })),
      ...resume.internships.map((i, idx) => ({
        id: i.id || `int-${idx}`,
        role: i.role,
        organization: i.organization,
        period: i.duration || "Internship",
        highlights: i.highlights.filter(Boolean).join(" • "),
      })),
    ],
    skillGroups: [
      {
        id: "sg-tech",
        category: "Core Technical Stack",
        items:
          resume.technicalSkills.length > 0
            ? resume.technicalSkills
            : ["TypeScript", "React", "Next.js", "PostgreSQL"],
      },
      ...(resume.softSkills.length > 0
        ? [
            {
              id: "sg-soft",
              category: "Collaboration & Leadership",
              items: resume.softSkills,
            },
          ]
        : []),
    ],
    socialLinks: {
      github: p.github || undefined,
      linkedin: p.linkedin || undefined,
      website: p.website || undefined,
    },
  };
}

function escHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPortfolioStaticHtml(opts: {
  title: string;
  templateId: PortfolioTemplateId;
  themeMode: "light" | "dark" | "auto";
  accentColor: string;
  data: PortfolioData;
}): string {
  const { data, accentColor, themeMode } = opts;
  const dark = themeMode === "dark";
  const bg = dark ? "#0B0F14" : "#F8F7F4";
  const surface = dark ? "#111720" : "#FFFFFF";
  const border = dark ? "#232D3D" : "#E4E0D8";
  const ink = dark ? "#F3F4F6" : "#111827";
  const muted = dark ? "#9CA3AF" : "#525866";

  const projectsHtml = data.projects
    .map(
      (p) => `<article class="card">
        <div class="row"><h3>${escHtml(p.title)}</h3><span class="tag">${escHtml(p.tagline || "Project")}</span></div>
        <p>${escHtml(p.description)}</p>
        <div class="pills">${p.techStack.map((t) => `<span class="pill">${escHtml(t)}</span>`).join("")}</div>
        <div class="links">
          ${p.liveUrl ? `<a href="${escHtml(p.liveUrl)}" target="_blank" rel="noreferrer">Live Demo ↗</a>` : ""}
          ${p.githubUrl ? `<a href="${escHtml(p.githubUrl)}" target="_blank" rel="noreferrer">Source Code ↗</a>` : ""}
        </div>
      </article>`
    )
    .join("\n");

  const expHtml = data.experience
    .map(
      (e) => `<div class="exp-item">
        <div class="row"><strong>${escHtml(e.role)} — ${escHtml(e.organization)}</strong><span class="muted">${escHtml(e.period)}</span></div>
        ${e.highlights ? `<p class="muted">${escHtml(e.highlights)}</p>` : ""}
      </div>`
    )
    .join("\n");

  const skillsHtml = data.skillGroups
    .map(
      (g) => `<div class="card"><h4>${escHtml(g.category)}</h4><div class="pills">${g.items
        .map((i) => `<span class="pill">${escHtml(i)}</span>`)
        .join("")}</div></div>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(data.fullName)} — ${escHtml(data.headline)}</title>
  <style>
    :root { --bg:${bg}; --surface:${surface}; --border:${border}; --ink:${ink}; --muted:${muted}; --accent:${escHtml(accentColor)}; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background:var(--bg); color:var(--ink); line-height:1.6; }
    .wrap { max-width: 1020px; margin: 0 auto; padding: 32px 20px 64px; }
    nav { display:flex; justify-content:space-between; align-items:center; padding-bottom:24px; border-bottom:1px solid var(--border); gap:16px; flex-wrap:wrap; }
    nav a { color:var(--muted); text-decoration:none; font-size:14px; font-weight:600; margin-left:16px; }
    nav a:hover { color:var(--accent); }
    .hero { padding: 56px 0 40px; }
    .badge { display:inline-block; font-size:12px; font-weight:600; padding:4px 12px; border-radius:999px; border:1px solid var(--border); color:var(--accent); background:var(--surface); }
    h1 { font-size: clamp(32px, 5vw, 52px); line-height:1.1; margin:16px 0 12px; letter-spacing:-0.02em; }
    h2 { font-size: 20px; margin: 44px 0 16px; letter-spacing:-0.01em; }
    .lead { max-width: 680px; color: var(--muted); font-size: 17px; }
    .cta { display:inline-block; margin-top:24px; background:var(--accent); color:#fff; padding:11px 22px; border-radius:10px; font-weight:600; font-size:14px; text-decoration:none; }
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px; }
    .card h3, .card h4 { margin:0 0 8px; }
    .row { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap; }
    .tag { font-size:11px; font-weight:700; color:var(--accent); }
    .muted { color: var(--muted); font-size:14px; }
    .pills { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
    .pill { font-size:12px; padding:3px 10px; border-radius:8px; border:1px solid var(--border); color:var(--muted); }
    .links { display:flex; gap:14px; margin-top:14px; font-size:13px; }
    .links a { color:var(--accent); font-weight:600; text-decoration:none; }
    .exp-item { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px 20px; margin-bottom:12px; }
    footer { margin-top:64px; padding-top:24px; border-top:1px solid var(--border); display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; font-size:13px; color:var(--muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <nav>
      <strong>${escHtml(data.fullName)}</strong>
      <div>
        <a href="#projects">Projects</a>
        <a href="#experience">Experience</a>
        <a href="#skills">Skills</a>
        <a href="#contact">Contact</a>
      </div>
    </nav>
    <section class="hero">
      <span class="badge">${escHtml(data.availability || "Available")}</span>
      <h1>${escHtml(data.headline)}</h1>
      <p class="lead">${escHtml(data.bio)}</p>
      <a class="cta" href="${escHtml(data.ctaHref || `mailto:${data.email}`)}">${escHtml(data.ctaLabel || "Contact Me")}</a>
    </section>
    <section id="projects">
      <h2>Selected Projects</h2>
      <div class="grid">${projectsHtml}</div>
    </section>
    ${
      data.experience.length > 0
        ? `<section id="experience"><h2>Experience</h2>${expHtml}</section>`
        : ""
    }
    <section id="skills">
      <h2>Skills &amp; Craft</h2>
      <div class="grid">${skillsHtml}</div>
    </section>
    <section id="contact" class="card" style="margin-top:44px">
      <h2 style="margin-top:0">Get in Touch</h2>
      <p class="muted">${escHtml(data.location)} • <a style="color:var(--accent)" href="mailto:${escHtml(data.email)}">${escHtml(data.email)}</a></p>
      <div class="links">
        ${data.socialLinks.github ? `<a href="${escHtml(data.socialLinks.github)}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
        ${data.socialLinks.linkedin ? `<a href="${escHtml(data.socialLinks.linkedin)}" target="_blank" rel="noreferrer">LinkedIn</a>` : ""}
        ${data.socialLinks.website ? `<a href="${escHtml(data.socialLinks.website)}" target="_blank" rel="noreferrer">Website</a>` : ""}
      </div>
    </section>
    <footer>
      <span>&copy; ${new Date().getFullYear()} ${escHtml(data.fullName)}</span>
      <span>Built with Francis Creator Studio</span>
    </footer>
  </div>
</body>
</html>`;
}

export function buildDeterministicCoverLetter(opts: {
  candidateName: string;
  candidateEmail?: string;
  candidateLocation?: string;
  companyName: string;
  targetRole: string;
  hiringManager?: string;
  writingStyle: CoverLetterTone;
  resume?: ResumeData | null;
  jobDescription?: string;
}): { content: string; recommendations: string[] } {
  const {
    candidateName,
    companyName,
    targetRole,
    hiringManager,
    writingStyle,
    resume,
    jobDescription,
  } = opts;
  const greeting = hiringManager?.trim()
    ? `Dear ${hiringManager.trim()},`
    : `Dear ${companyName || "Hiring"} Team,`;

  const topSkills = resume?.technicalSkills.slice(0, 5) ?? [];
  const leadProject = resume?.projects[0];
  const leadExp = resume?.experience[0]
    ? {
        role: resume.experience[0].role,
        org: resume.experience[0].company,
        firstLine: resume.experience[0].bullets[0] || "",
      }
    : resume?.internships[0]
      ? {
          role: resume.internships[0].role,
          org: resume.internships[0].organization,
          firstLine: resume.internships[0].highlights[0] || "",
        }
      : null;

  const introByTone: Record<CoverLetterTone, string> = {
    executive: `I am writing to express strong interest in the ${targetRole} position at ${companyName}. With proven ownership across ${
      leadExp ? `${leadExp.role} work at ${leadExp.org}` : "end-to-end delivery"
    }, I bring strategic discipline and measurable technical execution to your engineering organization.`,
    modern_tech: `I'm excited to apply for the ${targetRole} role at ${companyName}. Having built production systems${
      topSkills.length > 0 ? ` with ${topSkills.slice(0, 4).join(", ")}` : ""
    }, I thrive in high-ownership environments focused on shipping clean, reliable software.`,
    warm_story: `Every impactful product starts with people who care deeply about craft and clarity—which is why ${companyName}'s mission resonates so strongly with me as I apply for the ${targetRole} opportunity.`,
    academic: `Please accept my application for the ${targetRole} appointment at ${companyName}. My academic background and applied project work center on rigorous methodology, collaborative inquiry, and clear technical communication.`,
    internship: `I am eager to apply for the ${targetRole} internship at ${companyName}. Through hands-on projects${
      topSkills.length > 0 ? ` in ${topSkills.slice(0, 4).join(", ")}` : ""
    }, I am ready to learn quickly, write well-tested code, and contribute value from week one.`,
  };

  const proofParagraph = leadExp
    ? `Most recently as ${leadExp.role} at ${leadExp.org}, I contributed directly to core deliverables${
        leadExp.firstLine ? `: ${leadExp.firstLine}` : "."
      }${
        leadProject
          ? ` Alongside that role, I built ${leadProject.name}${
              leadProject.description ? ` — ${leadProject.description}` : ""
            }`
          : ""
      }`
    : leadProject
      ? `In my recent project ${leadProject.name}, I focused on turning real requirements into dependable software${
          leadProject.description ? ` — ${leadProject.description}` : "."
        }`
      : `Across my recent work, I have focused on structured problem-solving, clean architecture, and dependable execution${
          topSkills.length > 0 ? ` leveraging ${topSkills.join(", ")}` : ""
        }.`;

  const jdTokens = (jobDescription || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length >= 4);
  const matchedJdSkills = topSkills.filter((s) =>
    jdTokens.some((tok) => s.toLowerCase().includes(tok) || tok.includes(s.toLowerCase()))
  );

  const closingParagraph = `Thank you for your time and consideration. I would welcome the opportunity to discuss how my background${
    matchedJdSkills.length > 0 ? ` in ${matchedJdSkills.join(", ")}` : ""
  } aligns with ${companyName}'s roadmap for the ${targetRole} role.`;

  const content = [
    greeting,
    "",
    introByTone[writingStyle],
    "",
    proofParagraph,
    "",
    closingParagraph,
    "",
    "Sincerely,",
    candidateName || "Your Name",
  ].join("\n");

  const recommendations = [
    matchedJdSkills.length > 0
      ? `Highlighted overlapping JD terms: ${matchedJdSkills.join(", ")}.`
      : "Paste key skills from the job posting to align your middle paragraph even more tightly.",
    leadProject
      ? `Consider linking ${leadProject.name} directly in your portfolio or email signature.`
      : "Mention 1 specific project outcome or measurable result you are proud of.",
    "Export as PDF for direct job portals, or DOCX if a recruiter requests editable Word format.",
  ];

  return { content, recommendations };
}
