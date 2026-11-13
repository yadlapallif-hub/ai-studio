import { z } from "zod";

export const resumeSaveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Resume title is required").max(160),
  template_slug: z.string().min(1).max(80),
  target_role: z.string().max(160).nullable().optional(),
  data: z.record(z.unknown()),
  style_config: z.record(z.unknown()),
  ats_score: z.number().int().min(0).max(100).nullable().optional(),
  quality_report: z.record(z.unknown()).nullable().optional(),
});

export const certificateSaveSchema = z.object({
  id: z.string().uuid().optional(),
  template_slug: z.string().min(1).max(80),
  certificate_code: z.string().min(4).max(64),
  title: z.string().min(1, "Certificate title is required").max(200),
  recipient_name: z.string().min(1, "Recipient name is required").max(160),
  course_or_achievement: z.string().min(1, "Course or achievement name is required").max(220),
  organization_name: z.string().min(1, "Organization name is required").max(180),
  description: z.string().max(1000).nullable().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be YYYY-MM-DD"),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  signatory_name: z.string().max(140).nullable().optional(),
  signatory_designation: z.string().max(140).nullable().optional(),
  orientation: z.enum(["landscape", "portrait"]),
  canvas_width: z.number().int().min(400).max(2400).optional(),
  canvas_height: z.number().int().min(400).max(2400).optional(),
  is_sample: z.boolean().optional(),
  category: z.string().max(80).nullable().optional(),
  bulk_batch_id: z.string().uuid().nullable().optional(),
  revision_note: z.string().max(240).optional(),
  canvas_elements: z.array(z.record(z.unknown())),
  style_config: z.record(z.unknown()),
  authorization_type: z
    .enum(["self_issued_draft", "sample_preview", "authorized_issuer"])
    .optional(),
  issuer_id: z.string().uuid().nullable().optional(),
});

export const designProjectSchema = z.object({
  id: z.string().uuid().optional(),
  certificate_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Project title is required").max(180),
  template_slug: z.string().min(1).max(80),
  orientation: z.enum(["landscape", "portrait"]),
  canvas_width: z.number().int().min(400).max(2400).default(1123),
  canvas_height: z.number().int().min(400).max(2400).default(794),
  fields_json: z.record(z.unknown()),
  canvas_elements: z.array(z.record(z.unknown())),
  style_config: z.record(z.unknown()),
  status: z.enum(["in_progress", "ready", "archived"]).optional().default("in_progress"),
});

export const certificateReportSchema = z.object({
  certificate_code: z.string().min(4).max(64),
  reason: z.enum([
    "counterfeit_claim",
    "unauthorized_institution",
    "altered_details",
    "spam_or_abuse",
    "other",
  ]),
  details: z.string().min(5, "Please include brief details about the report").max(1500),
  reporter_email: z.string().email().optional().or(z.literal("")),
});

export const supportTicketCreateSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  description: z.string().min(5, "Description must be at least 5 characters").max(4000),
  category: z.enum([
    "resume_builder",
    "certificate_builder",
    "account_auth",
    "ai_assistant",
    "bug_report",
    "verification",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  channel: z.enum(["ticket", "live_chat"]).optional().default("ticket"),
});

export const supportMessageCreateSchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().min(1, "Message cannot be empty").max(4000),
  is_internal_note: z.boolean().optional().default(false),
});

export const aiChatRequestSchema = z.object({
  mode: z
    .enum([
      "chat",
      "resume_summary",
      "resume_improve",
      "resume_grammar",
      "resume_skills",
      "resume_objective",
      "resume_ats_optimize",
      "resume_jd_match",
      "resume_health_check",
      "resume_action_patch",
      "certificate_assist",
      "recommendations",
      "support_triage",
    ])
    .optional()
    .default("chat"),
  conversationId: z.string().uuid().optional(),
  contextPage: z.string().max(120).optional().default("general"),
  contextDocumentId: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(16000),
      })
    )
    .min(1)
    .max(30),
  contextData: z.record(z.unknown()).optional(),
  jobDescription: z.string().max(10000).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().max(180),
        mimeType: z.string().max(120),
        textContent: z.string().max(24000).optional(),
        imageDataUrl: z.string().max(2_000_000).optional(),
      })
    )
    .max(3)
    .optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  headline: z.string().max(180).nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  website: z.string().max(240).nullable().optional(),
  github_url: z.string().max(240).nullable().optional(),
  linkedin_url: z.string().max(240).nullable().optional(),
  theme_preference: z.enum(["light", "dark", "system"]).optional(),
  ai_recommendations_enabled: z.boolean().optional(),
  email_notifications_enabled: z.boolean().optional(),
});

export const vaultFolderSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Folder name required").max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#0F766E"),
});

export const notificationPreferencesSchema = z.object({
  project_saved: z.boolean().optional(),
  document_exported: z.boolean().optional(),
  certificate_generated: z.boolean().optional(),
  ai_task_completed: z.boolean().optional(),
  support_ticket_updated: z.boolean().optional(),
  organization_approved: z.boolean().optional(),
  in_app_enabled: z.boolean().optional(),
  email_digest: z.boolean().optional(),
});

export const testimonialSubmitSchema = z.object({
  author_name: z.string().trim().min(2).max(100),
  author_role: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(120).optional().or(z.literal("")),
  quote: z.string().trim().min(15).max(600),
  rating: z.number().int().min(1).max(5).default(5),
});

export const userAiConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["ollama", "gemini", "groq", "openai", "openrouter", "custom"]),
  model: z.string().trim().min(1).max(120),
  base_url: z.string().trim().max(300).optional().or(z.literal("")),
  api_key: z.string().trim().max(300).optional(),
  clear_api_key: z.boolean().optional(),
});

