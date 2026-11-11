export type AppRole =
  | "customer"
  | "super_admin"
  | "admin"
  | "support_agent"
  | "content_manager";

export const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "support_agent",
  "content_manager",
];

export type ResumeSectionKey =
  | "summary"
  | "careerObjective"
  | "experience"
  | "internships"
  | "education"
  | "projects"
  | "technicalSkills"
  | "softSkills"
  | "certifications"
  | "achievements"
  | "languages"
  | "references";

export const DEFAULT_RESUME_SECTION_ORDER: ResumeSectionKey[] = [
  "summary",
  "careerObjective",
  "experience",
  "internships",
  "projects",
  "education",
  "technicalSkills",
  "softSkills",
  "certifications",
  "achievements",
  "languages",
  "references",
];

export interface ResumeProfilePhoto {
  url: string;
  assetPath?: string;
  shape: "circle" | "square";
  position: "left" | "right" | "top";
  brightness: number;
  contrast: number;
  rotation: number;
  zoom: number;
  bgRemoved: boolean;
}

export interface ResumeEducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  highlights?: string;
}

export interface ResumeExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  role: string;
  url?: string;
  techStack: string[];
  startDate?: string;
  endDate?: string;
  description: string;
  highlights: string[];
}

export interface ResumeInternshipItem {
  id: string;
  organization: string;
  role: string;
  duration: string;
  location: string;
  highlights: string[];
}

export interface ResumeCertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
}

export interface ResumeLanguageItem {
  id: string;
  language: string;
  proficiency: string;
}

export interface ResumeAchievementItem {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface ResumeReferenceItem {
  id: string;
  name: string;
  title: string;
  organization: string;
  email?: string;
  phone?: string;
  note?: string;
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  profilePhoto: ResumeProfilePhoto;
  summary: string;
  careerObjective: string;
  education: ResumeEducationItem[];
  experience: ResumeExperienceItem[];
  technicalSkills: string[];
  softSkills: string[];
  projects: ResumeProjectItem[];
  internships: ResumeInternshipItem[];
  certifications: ResumeCertificationItem[];
  languages: ResumeLanguageItem[];
  achievements: ResumeAchievementItem[];
  references: ResumeReferenceItem[];
}

export interface ResumeStyleConfig {
  fontFamily: string;
  accentColor: string;
  fontSize: "compact" | "standard" | "comfortable";
  lineSpacing: "tight" | "normal" | "relaxed";
  sectionOrder: ResumeSectionKey[];
  hiddenSections: ResumeSectionKey[];
  showPhoto: boolean;
}

export interface CertificateCanvasElement {
  id: string;
  type:
    | "logo"
    | "recipient_photo"
    | "stamp"
    | "seal"
    | "signature"
    | "custom_image"
    | "text_block"
    | "decorative_badge";
  label: string;
  src?: string;
  assetPath?: string;
  text?: string;
  x: number; // percentage 0-100 on canvas
  y: number; // percentage 0-100 on canvas
  width: number; // px relative to base 1123x794 (landscape) or 794x1123 (portrait)
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  shape?: "circle" | "square" | "rectangle";
  inkStyle?: "default" | "blue_ink" | "red_ink" | "gold_embossed";
  isSampleDecorative?: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
}

export interface CertificateStyleConfig {
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  borderStyle:
    | "double-gold"
    | "architectural"
    | "filigree"
    | "modern-frame"
    | "prestige-navy"
    | "editorial-warm"
    | "clean-grid"
    | "board-crest"
    | "academic-crest"
    | "none";
  fontDisplay: string;
  fontBody: string;
  showQrCode: boolean;
  showBorder: boolean;
}

export interface ResumeQualityReport {
  overallScore: number;
  atsReadiness: number;
  atsLevel: "Strong" | "Moderate" | "Needs Work";
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  recommendations: Array<{
    id: string;
    title: string;
    impact: "high" | "medium" | "low";
    description: string;
    rationale: string;
  }>;
  keywordMatches?: {
    matched: string[];
    missing: string[];
    matchPercentage: number;
  };
  disclaimer: string;
}

export interface CertificateDesignReview {
  readabilityScore: number;
  alignmentNotes: string[];
  fontRecommendations: string[];
  colorRecommendations: string[];
  wordingSuggestions: string[];
  sealPlacementNotes: string[];
}

export interface CareerRecommendationReport {
  careerPaths: Array<{
    role: string;
    fitReason: string;
    nextSteps: string[];
  }>;
  missingTechnicalSkills: string[];
  learningRoadmap: Array<{
    phase: string;
    focus: string;
    outcome: string;
  }>;
  projectIdeas: Array<{
    title: string;
    description: string;
    skillsPracticed: string[];
  }>;
  interviewTopics: string[];
  internshipGuidance: string[];
  disclaimer: string;
}

export interface PublicBranding {
  platformName: string;
  tagline: string;
  developerCredit: string;
  accentHex: string;
  githubUrl: string;
  supportEmail: string;
  license: string;
  logoUrl?: string;
}

export interface WebsiteContent {
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCta: string;
  secondaryCta: string;
  openSourceNote: string;
}
