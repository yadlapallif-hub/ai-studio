-- FRANCIS CREATOR STUDIO - 003 Seed Templates, Settings, FAQs, Super Admin

-- 1. Resume Templates
INSERT INTO public.fcs_resume_templates (slug, name, description, category, is_ats_friendly, layout_config, is_active, sort_order)
VALUES
  (
    'ats-clean',
    'ATS Precision Standard',
    'Single-column, recruiter-tested ATS layout with clear typographic hierarchy and zero parsing traps.',
    'ats',
    true,
    '{"columns":1,"fontFamily":"Inter","headingStyle":"uppercase-rule","accent":"#0F766E","photoSupported":false,"headerAlign":"left"}'::jsonb,
    true, 1
  ),
  (
    'modern-studio',
    'Studio Slate Editorial',
    'Refined two-zone editorial resume featuring a crisp left metadata rail, profile photo slot, and structured timeline.',
    'modern',
    true,
    '{"columns":2,"sidebarWidth":"32%","fontFamily":"Plus Jakarta Sans","headingStyle":"accent-bar","accent":"#0F766E","photoSupported":true,"photoShape":"circle"}'::jsonb,
    true, 2
  ),
  (
    'executive-serif',
    'Executive Serif Monograph',
    'Authoritative leadership resume pairing classic serif headings with balanced spacing and executive summary callout.',
    'executive',
    true,
    '{"columns":1,"fontFamily":"Merriweather","headingStyle":"serif-underline","accent":"#1E293B","photoSupported":true,"photoShape":"square"}'::jsonb,
    true, 3
  ),
  (
    'technical-spec',
    'Systems & Engineering Spec',
    'Dense, scannable layout tailored for software engineers, ML researchers, and product builders highlighting stack & projects.',
    'technical',
    true,
    '{"columns":1,"fontFamily":"IBM Plex Sans","headingStyle":"mono-tag","accent":"#0369A1","photoSupported":false,"headerAlign":"split"}'::jsonb,
    true, 4
  ),
  (
    'academic-cv',
    'Academic & Research Dossier',
    'Structured multi-section CV built for fellowships, publications, teaching experience, certifications, and references.',
    'academic',
    true,
    '{"columns":1,"fontFamily":"Source Serif 4","headingStyle":"classic-centered","accent":"#1D4ED8","photoSupported":false,"headerAlign":"center"}'::jsonb,
    true, 5
  ),
  (
    'minimal-swiss',
    'Swiss Grid Minimal',
    'Clean asymmetrical grid inspired by Swiss editorial typography with generous whitespace and razor-sharp alignment.',
    'minimal',
    true,
    '{"columns":2,"sidebarWidth":"28%","fontFamily":"DM Sans","headingStyle":"minimal-label","accent":"#111827","photoSupported":true,"photoShape":"square"}'::jsonb,
    true, 6
  ),
  (
    'creative-folio',
    'Creator Folio Showcase',
    'Expressive studio header with balanced two-column skill and project cards while keeping text selectable in PDF exports.',
    'creative',
    false,
    '{"columns":2,"sidebarWidth":"34%","fontFamily":"Space Grotesk","headingStyle":"pill-badge","accent":"#B45309","photoSupported":true,"photoShape":"circle"}'::jsonb,
    true, 7
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_ats_friendly = EXCLUDED.is_ats_friendly,
  layout_config = EXCLUDED.layout_config,
  sort_order = EXCLUDED.sort_order;

-- 2. Certificate Templates (All 9 requested categories)
INSERT INTO public.fcs_certificate_templates (slug, name, description, category, orientation, layout_config, is_official_approved, is_active, sort_order)
VALUES
  (
    'course-completion',
    'Course Completion Classic',
    'Balanced double-bordered credential layout ideal for bootcamps, online courses, and workshops.',
    'course_completion',
    'landscape',
    '{"borderStyle":"double-gold","background":"#FFFDF7","primaryColor":"#0F4C5C","accentColor":"#C59B27","fontDisplay":"Cormorant Garamond","fontBody":"Plus Jakarta Sans","titleDefault":"Certificate of Completion"}'::jsonb,
    true, true, 1
  ),
  (
    'internship-credential',
    'Internship Experience Credential',
    'Modern corporate credential highlighting role, tenure, signatory, and verification QR code.',
    'internship',
    'landscape',
    '{"borderStyle":"architectural","background":"#FFFFFF","primaryColor":"#0F172A","accentColor":"#0F766E","fontDisplay":"Playfair Display","fontBody":"Inter","titleDefault":"Certificate of Internship"}'::jsonb,
    true, true, 2
  ),
  (
    'achievement-honor',
    'Achievement Honor Plaque',
    'Distinguished award layout with corner filigree accents and embossed seal placement.',
    'achievement',
    'landscape',
    '{"borderStyle":"filigree","background":"#FCFBF7","primaryColor":"#1E293B","accentColor":"#B45309","fontDisplay":"Cinzel","fontBody":"Inter","titleDefault":"Certificate of Achievement"}'::jsonb,
    true, true, 3
  ),
  (
    'participation-summit',
    'Event & Summit Participation',
    'Clean contemporary design for conferences, hackathons, seminars, and community cohorts.',
    'participation',
    'landscape',
    '{"borderStyle":"modern-frame","background":"#F8FAFC","primaryColor":"#0369A1","accentColor":"#0F766E","fontDisplay":"Space Grotesk","fontBody":"Inter","titleDefault":"Certificate of Participation"}'::jsonb,
    true, true, 4
  ),
  (
    'excellence-distinction',
    'Distinction & Excellence Award',
    'Formal high-contrast prestige design with navy and antique gold ribbon framing.',
    'excellence',
    'landscape',
    '{"borderStyle":"prestige-navy","background":"#FFFEFA","primaryColor":"#1E3A8A","accentColor":"#D97706","fontDisplay":"Cormorant Garamond","fontBody":"Plus Jakarta Sans","titleDefault":"Certificate of Excellence"}'::jsonb,
    true, true, 5
  ),
  (
    'appreciation-gratitude',
    'Appreciation & Recognition',
    'Warm editorial framing recognizing mentors, speakers, volunteers, and contributors.',
    'appreciation',
    'landscape',
    '{"borderStyle":"editorial-warm","background":"#FFFBF5","primaryColor":"#7C2D12","accentColor":"#C2410C","fontDisplay":"Playfair Display","fontBody":"DM Sans","titleDefault":"Certificate of Appreciation"}'::jsonb,
    true, true, 6
  ),
  (
    'training-technical',
    'Technical Training & Compliance',
    'Crisp institutional layout built for corporate training, lab safety, and technical skill tracks.',
    'training',
    'landscape',
    '{"borderStyle":"clean-grid","background":"#FFFFFF","primaryColor":"#0F766E","accentColor":"#334155","fontDisplay":"IBM Plex Sans","fontBody":"IBM Plex Sans","titleDefault":"Certificate of Training"}'::jsonb,
    true, true, 7
  ),
  (
    'professional-board',
    'Professional Board Credential',
    'Portrait A4 credential format suited for professional certifications, licensing, and memberships.',
    'professional',
    'portrait',
    '{"borderStyle":"board-crest","background":"#FCFCFA","primaryColor":"#111827","accentColor":"#B45309","fontDisplay":"Cinzel","fontBody":"Inter","titleDefault":"Professional Certification"}'::jsonb,
    true, true, 8
  ),
  (
    'educational-diploma',
    'Academic & Educational Award',
    'Formal academic portrait layout with institutional header space, recipient photo option, and seal zone.',
    'educational',
    'portrait',
    '{"borderStyle":"academic-crest","background":"#FFFDF9","primaryColor":"#1E293B","accentColor":"#0F766E","fontDisplay":"Cormorant Garamond","fontBody":"Source Serif 4","titleDefault":"Educational Certificate"}'::jsonb,
    true, true, 9
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  orientation = EXCLUDED.orientation,
  layout_config = EXCLUDED.layout_config,
  sort_order = EXCLUDED.sort_order;

-- 3. Platform Settings
INSERT INTO public.fcs_platform_settings (key, value, is_public)
VALUES
  (
    'branding',
    '{
      "platformName": "FRANCIS CREATOR STUDIO",
      "tagline": "Create Your Future. Design Your Identity.",
      "developerCredit": "Created & Developed by FRANCIS",
      "accentHex": "#0F766E",
      "githubUrl": "https://github.com/yadlapallif-hub/ai-studio",
      "supportEmail": "support@franciscreatorstudio.org",
      "license": "MIT"
    }'::jsonb,
    true
  ),
  (
    'website_content',
    '{
      "heroBadge": "100% Free & Open-Source • MIT Licensed",
      "heroHeadline": "Precision Resume & Certificate Engineering, Built for Everyone.",
      "heroSubheadline": "Craft ATS-ready resumes, design verifiable institutional or personal certificates with custom seals and QR verification, and get transparent guidance from FRANCIS Intelligence — with zero paywalls.",
      "primaryCta": "Launch Resume Studio",
      "secondaryCta": "Launch Certificate Studio",
      "openSourceNote": "FRANCIS Creator Studio is free software with zero subscriptions, zero paid downloads, and zero hidden locks. Self-host with your own Supabase instance and AI provider."
    }'::jsonb,
    true
  ),
  (
    'footer_content',
    '{
      "credit": "Created & Developed by FRANCIS",
      "license": "Released under the MIT Open-Source License",
      "githubUrl": "https://github.com/yadlapallif-hub/ai-studio",
      "contactEmail": "support@franciscreatorstudio.org",
      "disclaimer": "Decorative preview stamps are clearly distinguished from genuine organizational authorization."
    }'::jsonb,
    true
  ),
  (
    'ai_config',
    '{
      "enabled": true,
      "provider": "ollama",
      "model": "llama3.2",
      "system_instructions": "You are FRANCIS AI ASSISTANT and FRANCIS INTELLIGENCE inside FRANCIS CREATOR STUDIO (Created & Developed by FRANCIS). Help users craft honest, clear, ATS-friendly resumes, design well-proportioned certificates, understand platform tools, and resolve technical issues. Never fabricate employment history, credentials, or institutional authority. Never guarantee ATS selection. If a user has an unresolved account or bug issue, offer clear escalation to human support.",
      "hourly_limit_per_user": 40,
      "privacy_retain_conversations": true,
      "recommendations_enabled": true
    }'::jsonb,
    false
  ),
  (
    'security_config',
    '{
      "require_mfa_for_super_admin": false,
      "max_upload_bytes": 10485760,
      "allowed_export_formats": ["pdf", "png"]
    }'::jsonb,
    false
  )
ON CONFLICT (key) DO NOTHING;

-- 4. FAQs
INSERT INTO public.fcs_faqs (question, answer, category, include_in_ai_knowledge, is_published, sort_order)
SELECT v.question, v.answer, v.category, true, true, v.sort_order
FROM (
  VALUES
    ('Is FRANCIS Creator Studio completely free to use?', 'Yes. Every resume template, certificate template, photo editor tool, AI workflow (when configured), and high-resolution PDF/PNG export is 100% free with no paywalls, watermarks, or subscriptions.', 'general', 1),
    ('Can I explore the Resume and Certificate builders before creating an account?', 'Yes! Visitors can open both studios, test templates, edit documents, and export PDFs or PNGs immediately. Sign in with a free account whenever you want to save documents to your cloud vault, manage versions, or access support history.', 'account', 2),
    ('How does certificate QR verification work?', 'Every certificate generates a unique verification ID and scannable QR code linking to the public verification page. Importantly, self-created drafts show as Unverified / Self-Created Draft, while certificates submitted by an approved Authorized Issuer display as Officially Verified.', 'certificates', 3),
    ('What is the difference between decorative sample stamps and authorized seals?', 'Built-in sample stamps are watermarked or marked as decorative preview badges for layout testing. Genuine organizational seals and signatures should only be uploaded by authorized representatives of that organization.', 'certificates', 4),
    ('Does an ATS score guarantee an interview?', 'No. FRANCIS Intelligence evaluates formatting clarity, section completeness, measurable impact statements, and keyword alignment to help you improve readability, but no score guarantees hiring selection.', 'resumes', 5),
    ('How do I configure AI if I self-host FRANCIS Creator Studio?', 'Administrators can select OpenAI, Google Gemini, Groq, OpenRouter, or a self-hosted Ollama server in the Admin AI Management panel, and supply API keys securely via server environment variables or Supabase Edge Function secrets.', 'ai', 6)
) AS v(question, answer, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.fcs_faqs LIMIT 1);

-- 5. Initial Announcement
INSERT INTO public.fcs_announcements (title, message, variant, link_label, link_url, is_active)
SELECT
  'Welcome to FRANCIS Creator Studio',
  'Open-source AI Resume Builder, Certificate Studio with QR Verification, and Document Vault — 100% free forever.',
  'info',
  'Explore Studios',
  '/resume-builder',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.fcs_announcements LIMIT 1);

-- 6. Provision Initial Super Admin (yadlapallif@gmail.com) if present in auth.users
DO $$
DECLARE
  v_admin_uid uuid;
BEGIN
  SELECT id INTO v_admin_uid FROM auth.users WHERE lower(email) = 'yadlapallif@gmail.com' LIMIT 1;
  IF v_admin_uid IS NOT NULL THEN
    INSERT INTO public.fcs_profiles (id, email, full_name, headline)
    VALUES (v_admin_uid, 'yadlapallif@gmail.com', 'FRANCIS', 'Creator & Super Administrator')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.fcs_user_roles (user_id, role, assigned_by)
    VALUES
      (v_admin_uid, 'super_admin', v_admin_uid),
      (v_admin_uid, 'customer', v_admin_uid)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
