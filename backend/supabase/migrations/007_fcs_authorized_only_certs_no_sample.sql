-- FRANCIS CREATOR STUDIO - 007 Authorized-Only Certificate Creation & No Sample Stamps

-- 1. Helper: only users with an Admin-approved Authorized Organization can create or edit certificates
CREATE OR REPLACE FUNCTION public.fcs_can_create_certificates()
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
    WHERE ai.verification_status = 'approved'
      AND (
        ai.user_id = auth.uid()
        OR (
          u.email IS NOT NULL
          AND u.email_confirmed_at IS NOT NULL
          AND lower(ai.contact_email) = lower(u.email)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.fcs_can_create_certificates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fcs_can_create_certificates() TO authenticated;

-- 2. Restrict fcs_certificates INSERT/UPDATE to authorized users only
DROP POLICY IF EXISTS fcs_certificates_own ON public.fcs_certificates;
DROP POLICY IF EXISTS fcs_certificates_own_select ON public.fcs_certificates;
DROP POLICY IF EXISTS fcs_certificates_own_insert ON public.fcs_certificates;
DROP POLICY IF EXISTS fcs_certificates_own_update ON public.fcs_certificates;
DROP POLICY IF EXISTS fcs_certificates_own_delete ON public.fcs_certificates;

CREATE POLICY fcs_certificates_own_select ON public.fcs_certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY fcs_certificates_own_insert ON public.fcs_certificates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.fcs_can_create_certificates());

CREATE POLICY fcs_certificates_own_update ON public.fcs_certificates
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.fcs_can_create_certificates())
  WITH CHECK (auth.uid() = user_id AND public.fcs_can_create_certificates());

CREATE POLICY fcs_certificates_own_delete ON public.fcs_certificates
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Restrict fcs_certificate_verifications INSERT to authorized users
DROP POLICY IF EXISTS fcs_cert_verifications_owner_upsert ON public.fcs_certificate_verifications;
CREATE POLICY fcs_cert_verifications_owner_upsert ON public.fcs_certificate_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fcs_can_create_certificates()
    AND EXISTS (
      SELECT 1 FROM public.fcs_certificates c
      WHERE c.id = certificate_id AND c.user_id = auth.uid()
    )
  );

-- 4. Update certificate FAQ wording to reflect authorized-only creation and no sample stamps
UPDATE public.fcs_faqs
SET
  question = 'Who can create certificates and official organization stamps?',
  answer = 'Certificate creation and Stamp Studio are exclusively unlocked for Authorized Organizations approved by an Administrator. Once approved, you can design official stamps, seals, and signatures, apply them to certificates, delete or adjust stamps on any certificate, and issue QR-verifiable credentials.'
WHERE id = '0becd38f-8b7c-460e-a90c-34b4f92de051';

UPDATE public.fcs_faqs
SET
  answer = 'Every certificate created by an Admin-approved Authorized Organization receives a unique verification ID and scannable QR code linked to our live public verification portal (/verify), allowing recipients and employers to confirm authenticity.'
WHERE id = 'b3a62340-c2ff-42fc-b849-5742d2809268';
