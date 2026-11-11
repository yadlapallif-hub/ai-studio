-- FRANCIS CREATOR STUDIO - 008 Update Public Copy for Authorized-Only Certificates & No Sample Stamps

UPDATE public.fcs_platform_settings
SET value = jsonb_set(
  value,
  '{heroSubheadline}',
  to_jsonb('Craft ATS-ready resumes and—for Admin-approved Authorized Organizations—design verifiable official certificates with custom stamps and QR verification, guided by FRANCIS Intelligence with zero paywalls.'::text),
  true
)
WHERE key = 'website_content';

UPDATE public.fcs_platform_settings
SET value = jsonb_set(
  value,
  '{disclaimer}',
  to_jsonb('Certificate creation and official organizational stamps are restricted exclusively to Admin-approved Authorized Organizations.'::text),
  true
)
WHERE key = 'footer_content';

UPDATE public.fcs_faqs
SET
  question = 'Can I use the Resume Builder before creating an account, and how do Certificates work?',
  answer = 'Yes! Visitors can open the Resume Builder, test 100 resume templates, edit sections, and export PDFs or PNGs immediately. Sign in whenever you want to save resumes to your cloud vault. Certificate creation and Stamp Studio require signing in with an Admin-approved Authorized Organization account.'
WHERE id = 'cd19fdbb-3858-4871-9bd6-58b09ddd9147';
