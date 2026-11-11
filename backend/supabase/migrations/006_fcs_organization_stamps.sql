-- FRANCIS CREATOR STUDIO - 006 Authorized Organization Access & Official Stamp Studio

-- 1. Unified access check: grants access to BOTH the requesting user (user_id)
--    AND the requested organization email account (contact_email with confirmed auth email)
--    once the organization request has been approved by an Administrator.
CREATE OR REPLACE FUNCTION public.fcs_can_access_issuer(
  p_issuer_id uuid,
  p_require_approved boolean DEFAULT true
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fcs_authorized_issuers ai
    LEFT JOIN auth.users u ON u.id = auth.uid()
    WHERE ai.id = p_issuer_id
      AND (NOT p_require_approved OR ai.verification_status = 'approved')
      AND (
        public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
        OR ai.user_id = auth.uid()
        OR (
          ai.user_id IS NULL
          AND lower(ai.contact_email) = lower(coalesce(u.email, auth.jwt()->>'email', ''))
        )
        OR (
          ai.verification_status = 'approved'
          AND u.email IS NOT NULL
          AND u.email_confirmed_at IS NOT NULL
          AND lower(ai.contact_email) = lower(u.email)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.fcs_can_access_issuer(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fcs_can_access_issuer(uuid, boolean) TO authenticated;

-- 2. Update fcs_authorized_issuers SELECT policy using fcs_can_access_issuer
DROP POLICY IF EXISTS fcs_issuers_select ON public.fcs_authorized_issuers;
CREATE POLICY fcs_issuers_select ON public.fcs_authorized_issuers
  FOR SELECT USING (
    verification_status = 'approved'
    OR public.fcs_can_access_issuer(id, false)
  );

-- 3. Update certificate & verification guards to use fcs_can_access_issuer
CREATE OR REPLACE FUNCTION public.fcs_guard_certificate_issuer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']);
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_is_admin OR NEW.issuer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.fcs_can_access_issuer(NEW.issuer_id, true) THEN
    NEW.issuer_id := NULL;
    IF NEW.authorization_type = 'authorized_issuer' THEN
      NEW.authorization_type := 'self_issued_draft';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fcs_guard_certificate_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']);
  v_is_approved_issuer boolean := false;
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.issuer_id IS NOT NULL THEN
    v_is_approved_issuer := public.fcs_can_access_issuer(NEW.issuer_id, true);
  END IF;

  IF NOT v_is_approved_issuer THEN
    IF NEW.verification_status IN ('verified', 'revoked') THEN
      NEW.verification_status := CASE
        WHEN TG_OP = 'UPDATE' THEN OLD.verification_status
        ELSE 'unverified_draft'
      END;
    END IF;
    NEW.approved_by := CASE WHEN TG_OP = 'UPDATE' THEN OLD.approved_by ELSE NULL END;
    NEW.approved_at := CASE WHEN TG_OP = 'UPDATE' THEN OLD.approved_at ELSE NULL END;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Organization Stamps & Seals table for Admin-Approved Authorized Organizations
CREATE TABLE IF NOT EXISTS public.fcs_organization_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL REFERENCES public.fcs_authorized_issuers(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  stamp_kind text NOT NULL DEFAULT 'stamp' CHECK (stamp_kind IN ('stamp', 'seal', 'signature', 'emblem_stamp')),
  shape text NOT NULL DEFAULT 'circle' CHECK (shape IN ('circle', 'rectangle', 'square', 'scalloped')),
  ink_style text NOT NULL DEFAULT 'blue_ink' CHECK (ink_style IN ('blue_ink', 'red_ink', 'teal_ink', 'black_ink', 'gold_embossed', 'custom', 'default')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  svg_markup text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_org_stamps_issuer ON public.fcs_organization_stamps(issuer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_fcs_org_stamps_created ON public.fcs_organization_stamps(created_at DESC);

DROP TRIGGER IF EXISTS trg_fcs_organization_stamps_updated_at ON public.fcs_organization_stamps;
CREATE TRIGGER trg_fcs_organization_stamps_updated_at
  BEFORE UPDATE ON public.fcs_organization_stamps
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_set_updated_at();

-- Ensure only Admin-approved issuers can hold stamps, and keep single default per issuer
CREATE OR REPLACE FUNCTION public.fcs_guard_organization_stamp_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT verification_status INTO v_status
  FROM public.fcs_authorized_issuers
  WHERE id = NEW.issuer_id;

  IF v_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Organization must be Admin-approved before creating or managing stamps.';
  END IF;

  IF NEW.is_default = true AND NEW.is_active = true THEN
    UPDATE public.fcs_organization_stamps
    SET is_default = false
    WHERE issuer_id = NEW.issuer_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_guard_organization_stamp_write ON public.fcs_organization_stamps;
CREATE TRIGGER trg_fcs_guard_organization_stamp_write
  BEFORE INSERT OR UPDATE ON public.fcs_organization_stamps
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_guard_organization_stamp_write();

-- RLS on fcs_organization_stamps
ALTER TABLE public.fcs_organization_stamps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_org_stamps_select ON public.fcs_organization_stamps;
CREATE POLICY fcs_org_stamps_select ON public.fcs_organization_stamps
  FOR SELECT USING (
    public.fcs_can_access_issuer(issuer_id, true)
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

DROP POLICY IF EXISTS fcs_org_stamps_insert ON public.fcs_organization_stamps;
CREATE POLICY fcs_org_stamps_insert ON public.fcs_organization_stamps
  FOR INSERT WITH CHECK (
    public.fcs_can_access_issuer(issuer_id, true)
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

DROP POLICY IF EXISTS fcs_org_stamps_update ON public.fcs_organization_stamps;
CREATE POLICY fcs_org_stamps_update ON public.fcs_organization_stamps
  FOR UPDATE USING (
    public.fcs_can_access_issuer(issuer_id, true)
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  )
  WITH CHECK (
    public.fcs_can_access_issuer(issuer_id, true)
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

DROP POLICY IF EXISTS fcs_org_stamps_delete ON public.fcs_organization_stamps;
CREATE POLICY fcs_org_stamps_delete ON public.fcs_organization_stamps
  FOR DELETE USING (
    public.fcs_can_access_issuer(issuer_id, true)
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

-- 5. Notify currently approved issuer accounts that Stamp Studio is unlocked
INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
SELECT DISTINCT
  target_uid,
  'customer',
  'certificate_verification',
  format('Stamp Studio Unlocked: %s', ai.organization_name),
  format('"%s" is approved! Open Stamp Studio to create official stamps, gold seals, signatures, and verified QR credentials.', ai.organization_name),
  '/stamps',
  jsonb_build_object('issuer_id', ai.id, 'stamp_studio_unlocked', true)
FROM public.fcs_authorized_issuers ai
CROSS JOIN LATERAL (
  SELECT ai.user_id AS target_uid
  WHERE ai.user_id IS NOT NULL
  UNION
  SELECT u.id AS target_uid
  FROM auth.users u
  WHERE u.email IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
    AND lower(u.email) = lower(ai.contact_email)
) targets
WHERE ai.verification_status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.fcs_notifications n
    WHERE n.user_id = targets.target_uid
      AND n.audience = 'customer'
      AND n.link = '/stamps'
      AND n.metadata->>'issuer_id' = ai.id::text
  );
