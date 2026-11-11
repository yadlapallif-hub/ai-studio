-- FRANCIS CREATOR STUDIO - 001 Core Schema
-- Strictly isolated with fcs_ prefixes so existing non-FCS tables remain untouched.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.fcs_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  headline text,
  bio text,
  phone text,
  location text,
  website text,
  github_url text,
  linkedin_url text,
  theme_preference text NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  ai_recommendations_enabled boolean NOT NULL DEFAULT true,
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  suspended_reason text,
  suspended_at timestamptz,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_profiles_email ON public.fcs_profiles(email);
CREATE INDEX IF NOT EXISTS idx_fcs_profiles_status ON public.fcs_profiles(status);

-- 2. User Roles
CREATE TABLE IF NOT EXISTS public.fcs_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer', 'super_admin', 'admin', 'support_agent', 'content_manager')),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_fcs_user_roles_user_id ON public.fcs_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_fcs_user_roles_role ON public.fcs_user_roles(role);

-- 3. Resume Templates
CREATE TABLE IF NOT EXISTS public.fcs_resume_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('ats', 'modern', 'executive', 'creative', 'academic', 'minimal', 'technical')),
  is_ats_friendly boolean NOT NULL DEFAULT true,
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Resumes
CREATE TABLE IF NOT EXISTS public.fcs_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.fcs_resume_templates(id) ON DELETE SET NULL,
  template_slug text NOT NULL DEFAULT 'ats-clean',
  title text NOT NULL DEFAULT 'Untitled Resume',
  target_role text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ats_score integer CHECK (ats_score IS NULL OR (ats_score >= 0 AND ats_score <= 100)),
  quality_report jsonb,
  is_archived boolean NOT NULL DEFAULT false,
  is_reported boolean NOT NULL DEFAULT false,
  report_reason text,
  download_count integer NOT NULL DEFAULT 0,
  last_exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_resumes_user_id ON public.fcs_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_fcs_resumes_updated_at ON public.fcs_resumes(updated_at DESC);

-- 5. Certificate Templates
CREATE TABLE IF NOT EXISTS public.fcs_certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'course_completion', 'internship', 'achievement', 'participation',
    'excellence', 'appreciation', 'training', 'professional', 'educational'
  )),
  orientation text NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_official_approved boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Authorized Issuers
CREATE TABLE IF NOT EXISTS public.fcs_authorized_issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_name text NOT NULL,
  organization_slug text UNIQUE NOT NULL,
  contact_email text NOT NULL,
  website text,
  logo_url text,
  default_signatory_name text,
  default_signatory_title text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'suspended', 'revoked')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_authorized_issuers_user_id ON public.fcs_authorized_issuers(user_id);
CREATE INDEX IF NOT EXISTS idx_fcs_authorized_issuers_status ON public.fcs_authorized_issuers(verification_status);

-- 7. Certificates
CREATE TABLE IF NOT EXISTS public.fcs_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.fcs_certificate_templates(id) ON DELETE SET NULL,
  template_slug text NOT NULL DEFAULT 'course-completion',
  issuer_id uuid REFERENCES public.fcs_authorized_issuers(id) ON DELETE SET NULL,
  certificate_code text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT 'Certificate of Completion',
  recipient_name text NOT NULL DEFAULT 'Recipient Name',
  course_or_achievement text NOT NULL DEFAULT 'Program or Achievement',
  organization_name text NOT NULL DEFAULT 'Organization Name',
  description text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  signatory_name text,
  signatory_designation text,
  orientation text NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
  canvas_elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  style_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  authorization_type text NOT NULL DEFAULT 'self_issued_draft' CHECK (authorization_type IN ('self_issued_draft', 'sample_preview', 'authorized_issuer')),
  is_reported boolean NOT NULL DEFAULT false,
  report_reason text,
  download_count integer NOT NULL DEFAULT 0,
  last_exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_certificates_user_id ON public.fcs_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_fcs_certificates_code ON public.fcs_certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_fcs_certificates_updated_at ON public.fcs_certificates(updated_at DESC);

-- 8. Certificate Verifications (Public lookup surface stores only verification-safe fields)
CREATE TABLE IF NOT EXISTS public.fcs_certificate_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL UNIQUE REFERENCES public.fcs_certificates(id) ON DELETE CASCADE,
  certificate_code text NOT NULL UNIQUE,
  issuer_id uuid REFERENCES public.fcs_authorized_issuers(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  certificate_title text NOT NULL,
  course_or_achievement text NOT NULL,
  issuing_organization text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date,
  verification_status text NOT NULL DEFAULT 'unverified_draft' CHECK (
    verification_status IN ('unverified_draft', 'pending_approval', 'verified', 'revoked', 'expired')
  ),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revocation_reason text,
  public_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_cert_verifications_code ON public.fcs_certificate_verifications(certificate_code);
CREATE INDEX IF NOT EXISTS idx_fcs_cert_verifications_status ON public.fcs_certificate_verifications(verification_status);

-- 9. Uploaded Assets (Document Vault metadata)
CREATE TABLE IF NOT EXISTS public.fcs_uploaded_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (
    asset_type IN ('profile_photo', 'organization_logo', 'stamp', 'seal', 'signature', 'exported_pdf', 'exported_png', 'support_attachment', 'other')
  ),
  file_name text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  is_sample_decorative boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_uploaded_assets_user_id ON public.fcs_uploaded_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_fcs_uploaded_assets_type ON public.fcs_uploaded_assets(asset_type);

-- 10. AI Conversations
CREATE TABLE IF NOT EXISTS public.fcs_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  context_page text NOT NULL DEFAULT 'general',
  context_document_id uuid,
  provider text,
  model text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_ai_conversations_user_id ON public.fcs_ai_conversations(user_id);

-- 11. AI Messages
CREATE TABLE IF NOT EXISTS public.fcs_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.fcs_ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  suggested_actions jsonb,
  tokens_used integer NOT NULL DEFAULT 0,
  provider text,
  model text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_ai_messages_conv_id ON public.fcs_ai_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fcs_ai_messages_user_id ON public.fcs_ai_messages(user_id);

-- 12. AI Recommendations (FRANCIS INTELLIGENCE)
CREATE TABLE IF NOT EXISTS public.fcs_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('resume', 'career', 'certificate', 'dashboard')),
  target_document_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  rationale text NOT NULL,
  action_payload jsonb,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'saved', 'dismissed')),
  feedback text CHECK (feedback IS NULL OR feedback IN ('helpful', 'not_helpful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_ai_recs_user_id ON public.fcs_ai_recommendations(user_id, created_at DESC);

-- 13. Support Tickets & Live Chat Threads
CREATE TABLE IF NOT EXISTS public.fcs_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (
    category IN ('resume_builder', 'certificate_builder', 'account_auth', 'ai_assistant', 'bug_report', 'verification', 'other')
  ),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'ticket' CHECK (channel IN ('ticket', 'live_chat')),
  first_responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_support_tickets_user_id ON public.fcs_support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_fcs_support_tickets_status ON public.fcs_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_fcs_support_tickets_assigned ON public.fcs_support_tickets(assigned_to);

-- 14. Support Messages
CREATE TABLE IF NOT EXISTS public.fcs_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.fcs_support_tickets(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'agent', 'ai', 'system')),
  body text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_support_messages_ticket_id ON public.fcs_support_messages(ticket_id, created_at);

-- 15. Support Attachments
CREATE TABLE IF NOT EXISTS public.fcs_support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.fcs_support_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.fcs_support_messages(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_support_attachments_ticket_id ON public.fcs_support_attachments(ticket_id);

-- 16. Notifications
CREATE TABLE IF NOT EXISTS public.fcs_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'customer' CHECK (audience IN ('customer', 'admin')),
  type text NOT NULL CHECK (
    type IN ('support_message', 'ticket_status', 'support_reply', 'account', 'certificate_verification', 'system')
  ),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_notifications_user_unread ON public.fcs_notifications(user_id, audience, is_read, created_at DESC);

-- 17. Announcements
CREATE TABLE IF NOT EXISTS public.fcs_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  variant text NOT NULL DEFAULT 'info' CHECK (variant IN ('info', 'success', 'warning')),
  link_label text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 18. Activity Logs
CREATE TABLE IF NOT EXISTS public.fcs_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_activity_logs_created ON public.fcs_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcs_activity_logs_actor ON public.fcs_activity_logs(actor_id);

-- 19. Platform Settings (public flags vs sensitive config)
CREATE TABLE IF NOT EXISTS public.fcs_platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 20. FAQs (Public website + AI Knowledge base)
CREATE TABLE IF NOT EXISTS public.fcs_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  include_in_ai_knowledge boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 21. Rate Limits
CREATE TABLE IF NOT EXISTS public.fcs_rate_limits (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, endpoint, window_start)
);

-- 22. Export Events (Real download metrics)
CREATE TABLE IF NOT EXISTS public.fcs_export_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN ('resume', 'certificate')),
  document_id uuid NOT NULL,
  format text NOT NULL CHECK (format IN ('pdf', 'png')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_export_events_created ON public.fcs_export_events(created_at DESC);

-- Generic updated_at trigger function scoped to fcs_
CREATE OR REPLACE FUNCTION public.fcs_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'fcs_profiles', 'fcs_user_roles', 'fcs_resume_templates', 'fcs_resumes',
    'fcs_certificate_templates', 'fcs_authorized_issuers', 'fcs_certificates',
    'fcs_certificate_verifications', 'fcs_uploaded_assets', 'fcs_ai_conversations',
    'fcs_ai_recommendations', 'fcs_support_tickets', 'fcs_announcements',
    'fcs_platform_settings', 'fcs_faqs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fcs_set_updated_at()', tbl, tbl);
  END LOOP;
END;
$$;
