import {
  ResumeAiPatchProposal,
  ResumeData,
  ResumeHealthAxisScore,
  ResumeHealthCheckReport,
  ResumeStyleConfig,
} from "../types/index";
import { analyzeResumeQuality } from "./analyzer";

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
