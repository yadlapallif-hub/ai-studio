-- CREATOR STUDIO - 009 Rebrand to CREATOR STUDIO, Built by Francis intro/credit, Creator AI & Verification copy

UPDATE public.fcs_platform_settings
SET value = jsonb_set(
  jsonb_set(value, '{platformName}', to_jsonb('CREATOR STUDIO'::text), true),
  '{developerCredit}',
  to_jsonb('Built by Francis'::text),
  true
)
WHERE key = 'branding';

UPDATE public.fcs_platform_settings
SET value = jsonb_set(
  jsonb_set(
    value,
    '{heroSubheadline}',
    to_jsonb('Craft ATS-ready resumes and—for Admin-approved Authorized Organizations—design verifiable official certificates with custom stamps and QR verification, guided by Creator AI with zero paywalls.'::text),
    true
  ),
  '{openSourceNote}',
  to_jsonb('Creator Studio is free software with zero subscriptions, zero paid downloads, and zero hidden locks. Self-host with your own Supabase instance and AI provider.'::text),
  true
)
WHERE key = 'website_content';

UPDATE public.fcs_platform_settings
SET value = jsonb_set(value, '{credit}', to_jsonb('Built by Francis'::text), true)
WHERE key = 'footer_content';

UPDATE public.fcs_platform_settings
SET value = jsonb_set(
  value,
  '{system_instructions}',
  to_jsonb('You are Creator AI inside CREATOR STUDIO (Built by Francis). Explain information about the Creator Studio website, guide users on how to build a modern website or build and publish verified certificates and ATS resumes, and help resolve technical issues honestly without fabricating credentials.'::text),
  true
)
WHERE key = 'ai_config';

UPDATE public.fcs_faqs
SET
  question = 'Is Creator Studio completely free to use?',
  answer = 'Yes. Every resume template, certificate template, photo editor tool, Creator AI guide, and high-resolution PDF/PNG export is 100% free with no paywalls, watermarks, or subscriptions.'
WHERE id = 'be764e22-f8f1-433e-8178-9c65987fa7b0';

UPDATE public.fcs_faqs
SET
  answer = 'No. Creator AI evaluates formatting clarity, section completeness, measurable impact statements, and keyword alignment to help you improve readability, but no score guarantees hiring selection.'
WHERE id = '33799e1c-c73a-4e64-84a1-52a69785d085';

UPDATE public.fcs_faqs
SET
  question = 'How do I configure AI if I self-host Creator Studio?'
WHERE id = 'a936c843-962e-4b31-a48b-3a91fb0f8553';

UPDATE public.fcs_faqs
SET
  answer = 'Every certificate published by an Admin-approved Authorized Organization receives a unique verification ID and scannable QR code linked to our live public verification portal (/verify). Click Publish Verified Certificate in Certificate Studio so /verify shows Officially Verified.'
WHERE id = 'b3a62340-c2ff-42fc-b849-5742d2809268';

UPDATE public.fcs_certificate_templates
SET name = 'Creator Studio Flagship Open-Source Award'
WHERE slug = 'francis-flagship-fellow-100';
