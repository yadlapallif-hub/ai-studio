-- CREATOR STUDIO - 010 Announcements Rebrand & Missing Profile Backfill

UPDATE public.fcs_announcements
SET title = 'Welcome to CREATOR STUDIO'
WHERE title ILIKE '%FRANCIS Creator Studio%';

UPDATE public.fcs_announcements
SET message = replace(message, 'FRANCIS Creator Studio', 'CREATOR STUDIO')
WHERE message ILIKE '%FRANCIS Creator Studio%';

-- Backfill any auth.users that do not yet have fcs_profiles or fcs_user_roles rows
INSERT INTO public.fcs_profiles (id, email, phone, full_name, auth_provider, last_active_at)
SELECT
  u.id,
  CASE WHEN NULLIF(trim(u.email), '') IS NOT NULL THEN lower(trim(u.email)) ELSE NULL END,
  NULLIF(trim(u.phone), ''),
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(coalesce(u.email, ''), '@', 1), ''),
    NULLIF(trim(u.phone), ''),
    'Creator'
  ),
  COALESCE(NULLIF(trim(u.raw_app_meta_data->>'provider'), ''), 'email'),
  now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.fcs_profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fcs_user_roles (user_id, role)
SELECT u.id, 'customer'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.fcs_user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;
