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
  canvas_elements: z.array(z.record(z.unknown())),
  style_config: z.record(z.unknown()),
  authorization_type: z
    .enum(["self_issued_draft", "sample_preview", "authorized_issuer"])
    .optional(),
  issuer_id: z.string().uuid().nullable().optional(),
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
      "certificate_assist",
      "recommendations",
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
        content: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(30),
  contextData: z.record(z.unknown()).optional(),
  jobDescription: z.string().max(8000).optional(),
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
