-- FRANCIS CREATOR STUDIO - 005 Admin Approval Required for Authorized Issuers

-- 1. Expand verification_status check constraint to support 'rejected' alongside 'pending', 'approved', 'suspended', 'revoked'
ALTER TABLE public.fcs_authorized_issuers
  DROP CONSTRAINT IF EXISTS fcs_authorized_issuers_verification_status_check;

ALTER TABLE public.fcs_authorized_issuers
  ADD CONSTRAINT fcs_authorized_issuers_verification_status_check
  CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended', 'revoked'));

-- 2. Enforce that non-admin callers can never self-approve or bypass Admin review on fcs_authorized_issuers
CREATE OR REPLACE FUNCTION public.fcs_guard_authorized_issuer_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']);
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.verification_status := OLD.verification_status;
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_guard_authorized_issuer_write ON public.fcs_authorized_issuers;
CREATE TRIGGER trg_fcs_guard_authorized_issuer_write
  BEFORE INSERT OR UPDATE ON public.fcs_authorized_issuers
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_guard_authorized_issuer_write();

-- 3. Enforce that certificates can only reference an Admin-approved Authorized Issuer accessible to the user
CREATE OR REPLACE FUNCTION public.fcs_guard_certificate_issuer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']);
  v_has_access boolean := false;
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_is_admin OR NEW.issuer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.fcs_authorized_issuers ai
    WHERE ai.id = NEW.issuer_id
      AND ai.verification_status = 'approved'
      AND (
        ai.user_id = auth.uid()
        OR (
          ai.user_id IS NULL
          AND lower(ai.contact_email) = lower(coalesce(auth.jwt()->>'email', ''))
        )
      )
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    NEW.issuer_id := NULL;
    IF NEW.authorization_type = 'authorized_issuer' THEN
      NEW.authorization_type := 'self_issued_draft';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_guard_certificate_issuer ON public.fcs_certificates;
CREATE TRIGGER trg_fcs_guard_certificate_issuer
  BEFORE INSERT OR UPDATE ON public.fcs_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_guard_certificate_issuer();

-- 4. Update certificate verification guard to enforce Admin-approved issuer ownership
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
    SELECT EXISTS (
      SELECT 1 FROM public.fcs_authorized_issuers ai
      WHERE ai.id = NEW.issuer_id
        AND ai.verification_status = 'approved'
        AND (
          ai.user_id = auth.uid()
          OR (
            ai.user_id IS NULL
            AND lower(ai.contact_email) = lower(coalesce(auth.jwt()->>'email', ''))
          )
        )
    ) INTO v_is_approved_issuer;
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

-- 5. Update fcs_authorized_issuers RLS policies
DROP POLICY IF EXISTS fcs_issuers_select ON public.fcs_authorized_issuers;
CREATE POLICY fcs_issuers_select ON public.fcs_authorized_issuers
  FOR SELECT USING (
    verification_status = 'approved'
    OR auth.uid() = user_id
    OR (user_id IS NULL AND lower(contact_email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

DROP POLICY IF EXISTS fcs_issuers_manage ON public.fcs_authorized_issuers;
CREATE POLICY fcs_issuers_manage ON public.fcs_authorized_issuers
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

DROP POLICY IF EXISTS fcs_issuers_auth_insert ON public.fcs_authorized_issuers;
CREATE POLICY fcs_issuers_auth_insert ON public.fcs_authorized_issuers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND verification_status = 'pending'
    AND approved_by IS NULL
    AND approved_at IS NULL
  );

-- 6. Ensure public lookup reflects revoked/unapproved issuer state accurately
CREATE OR REPLACE FUNCTION public.fcs_lookup_certificate_verification(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.fcs_certificate_verifications%ROWTYPE;
  v_issuer public.fcs_authorized_issuers%ROWTYPE;
  v_clean_code text := upper(trim(coalesce(p_code, '')));
  v_effective_status text;
BEGIN
  IF length(v_clean_code) < 4 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_row
  FROM public.fcs_certificate_verifications
  WHERE upper(certificate_code) = v_clean_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF v_row.issuer_id IS NOT NULL THEN
    SELECT * INTO v_issuer FROM public.fcs_authorized_issuers WHERE id = v_row.issuer_id;
  END IF;

  v_effective_status := v_row.verification_status;
  IF v_row.verification_status = 'verified' THEN
    IF v_row.expiry_date IS NOT NULL AND v_row.expiry_date < CURRENT_DATE THEN
      v_effective_status := 'expired';
    ELSIF v_row.issuer_id IS NULL OR v_issuer.id IS NULL THEN
      v_effective_status := 'unverified_draft';
    ELSIF v_issuer.verification_status IN ('revoked', 'suspended') THEN
      v_effective_status := 'revoked';
    ELSIF v_issuer.verification_status <> 'approved' THEN
      v_effective_status := 'pending_approval';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'certificate_code', v_row.certificate_code,
    'recipient_name', v_row.recipient_name,
    'certificate_title', v_row.certificate_title,
    'course_or_achievement', v_row.course_or_achievement,
    'issuing_organization', v_row.issuing_organization,
    'issue_date', v_row.issue_date,
    'expiry_date', v_row.expiry_date,
    'verification_status', v_effective_status,
    'approved_at', v_row.approved_at,
    'revoked_at', v_row.revoked_at,
    'revocation_reason', v_row.revocation_reason,
    'public_notes', v_row.public_notes,
    'issuer_approved', COALESCE(v_issuer.verification_status = 'approved', false),
    'issuer_website', v_issuer.website
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fcs_lookup_certificate_verification(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fcs_lookup_certificate_verification(text) TO anon, authenticated;

-- 7. Move any customer auto-approved issuer records back into pending Admin review
UPDATE public.fcs_authorized_issuers ai
SET
  verification_status = 'pending',
  approved_by = NULL,
  approved_at = NULL,
  notes = CASE
    WHEN ai.notes ILIKE '%auto-approved%' THEN 'Submitted for Admin approval'
    ELSE COALESCE(NULLIF(trim(ai.notes), ''), 'Submitted for Admin approval')
  END
WHERE ai.verification_status = 'approved'
  AND (
    ai.approved_by IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.fcs_user_roles r
      WHERE r.user_id = ai.approved_by
        AND r.role IN ('super_admin', 'admin', 'content_manager')
    )
  );

-- 8. Ensure admins receive notifications for pending issuer applications
INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
SELECT DISTINCT
  r.user_id,
  'admin',
  'certificate_verification',
  format('Pending Issuer Approval: %s', ai.organization_name),
  format('%s (%s) is awaiting Administrator approval.', ai.organization_name, ai.contact_email),
  '/verifications',
  jsonb_build_object('issuer_id', ai.id, 'organization_name', ai.organization_name)
FROM public.fcs_authorized_issuers ai
CROSS JOIN public.fcs_user_roles r
WHERE ai.verification_status = 'pending'
  AND r.role IN ('super_admin', 'admin', 'content_manager')
  AND NOT EXISTS (
    SELECT 1 FROM public.fcs_notifications n
    WHERE n.user_id = r.user_id
      AND n.audience = 'admin'
      AND n.metadata->>'issuer_id' = ai.id::text
  );
