-- FRANCIS CREATOR STUDIO - 002 RLS, Functions, Triggers, Realtime, Storage
-- Strictly scoped to fcs_* tables and fcs-* storage buckets.

-- Helper role functions
CREATE OR REPLACE FUNCTION public.fcs_has_role(uid uuid, target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fcs_user_roles
    WHERE user_id = uid AND role = target_role
  );
$$;

CREATE OR REPLACE FUNCTION public.fcs_has_any_role(uid uuid, target_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fcs_user_roles
    WHERE user_id = uid AND role = ANY(target_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.fcs_is_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.fcs_has_any_role(uid, ARRAY['super_admin', 'admin', 'support_agent', 'content_manager']);
$$;

-- Safe profile bootstrap RPC (avoids adding auth.users triggers shared with other apps)
CREATE OR REPLACE FUNCTION public.fcs_ensure_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_profile public.fcs_profiles%ROWTYPE;
  v_roles text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
  INTO v_email, v_name
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  INSERT INTO public.fcs_profiles (id, email, full_name, last_active_at)
  VALUES (v_uid, lower(v_email), v_name, now())
  ON CONFLICT (id) DO UPDATE
    SET last_active_at = now(),
        email = EXCLUDED.email;

  INSERT INTO public.fcs_user_roles (user_id, role)
  VALUES (v_uid, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT * INTO v_profile FROM public.fcs_profiles WHERE id = v_uid;
  SELECT COALESCE(array_agg(role), ARRAY['customer']) INTO v_roles FROM public.fcs_user_roles WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'roles', to_jsonb(v_roles)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fcs_ensure_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fcs_ensure_profile() TO authenticated;

-- Hourly rate limiting RPC
CREATE OR REPLACE FUNCTION public.fcs_consume_rate_limit(p_endpoint text, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_window timestamptz := date_trunc('hour', now());
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.fcs_rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (v_uid, p_endpoint, v_window, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = public.fcs_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.fcs_consume_rate_limit(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fcs_consume_rate_limit(text, integer) TO authenticated;

-- Prevent customers from self-promoting verification_status or profile suspension status
CREATE OR REPLACE FUNCTION public.fcs_guard_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin'])
     AND current_setting('role', true) <> 'service_role' THEN
    NEW.status := OLD.status;
    NEW.suspended_reason := OLD.suspended_reason;
    NEW.suspended_at := OLD.suspended_at;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_guard_profile_update ON public.fcs_profiles;
CREATE TRIGGER trg_fcs_guard_profile_update
  BEFORE UPDATE ON public.fcs_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_guard_profile_update();

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
        AND ai.user_id = auth.uid()
        AND ai.verification_status = 'approved'
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

DROP TRIGGER IF EXISTS trg_fcs_guard_cert_verification ON public.fcs_certificate_verifications;
CREATE TRIGGER trg_fcs_guard_cert_verification
  BEFORE INSERT OR UPDATE ON public.fcs_certificate_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_guard_certificate_verification();

-- Support & Verification Realtime Notification Triggers
CREATE OR REPLACE FUNCTION public.fcs_notify_on_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR v_staff IN
      SELECT DISTINCT user_id FROM public.fcs_user_roles
      WHERE role IN ('super_admin', 'admin', 'support_agent')
    LOOP
      INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
      VALUES (
        v_staff.user_id,
        'admin',
        'support_message',
        CASE WHEN NEW.channel = 'live_chat' THEN 'New Live Support Chat' ELSE 'New Support Ticket' END,
        format('[%s] %s', NEW.ticket_number, NEW.subject),
        CASE WHEN NEW.channel = 'live_chat' THEN '/messages' ELSE '/support' END,
        jsonb_build_object('ticket_id', NEW.id, 'ticket_number', NEW.ticket_number, 'channel', NEW.channel)
      );
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
    VALUES (
      NEW.user_id,
      'customer',
      'ticket_status',
      format('Ticket %s updated', NEW.ticket_number),
      format('Your support request "%s" is now %s.', NEW.subject, replace(NEW.status, '_', ' ')),
      '/support',
      jsonb_build_object('ticket_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_notify_ticket_event ON public.fcs_support_tickets;
CREATE TRIGGER trg_fcs_notify_ticket_event
  AFTER INSERT OR UPDATE ON public.fcs_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_notify_on_ticket_event();

CREATE OR REPLACE FUNCTION public.fcs_notify_on_support_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.fcs_support_tickets%ROWTYPE;
  v_staff record;
BEGIN
  SELECT * INTO v_ticket FROM public.fcs_support_tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_role = 'customer' THEN
    IF v_ticket.assigned_to IS NOT NULL THEN
      INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
      VALUES (
        v_ticket.assigned_to,
        'admin',
        'support_message',
        format('Customer reply on %s', v_ticket.ticket_number),
        left(NEW.body, 140),
        CASE WHEN v_ticket.channel = 'live_chat' THEN '/messages' ELSE '/support' END,
        jsonb_build_object('ticket_id', v_ticket.id)
      );
    ELSE
      FOR v_staff IN
        SELECT DISTINCT user_id FROM public.fcs_user_roles
        WHERE role IN ('super_admin', 'admin', 'support_agent')
      LOOP
        INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
        VALUES (
          v_staff.user_id,
          'admin',
          'support_message',
          format('New message on %s', v_ticket.ticket_number),
          left(NEW.body, 140),
          CASE WHEN v_ticket.channel = 'live_chat' THEN '/messages' ELSE '/support' END,
          jsonb_build_object('ticket_id', v_ticket.id)
        );
      END LOOP;
    END IF;
  ELSIF NEW.sender_role = 'agent' AND NEW.is_internal_note = false THEN
    INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
    VALUES (
      v_ticket.user_id,
      'customer',
      'support_reply',
      format('Support reply on %s', v_ticket.ticket_number),
      left(NEW.body, 140),
      '/support',
      jsonb_build_object('ticket_id', v_ticket.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_notify_support_message ON public.fcs_support_messages;
CREATE TRIGGER trg_fcs_notify_support_message
  AFTER INSERT ON public.fcs_support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_notify_on_support_message();

CREATE OR REPLACE FUNCTION public.fcs_notify_on_cert_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status
     AND NEW.verification_status IN ('verified', 'revoked') THEN
    SELECT user_id INTO v_owner FROM public.fcs_certificates WHERE id = NEW.certificate_id;
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.fcs_notifications (user_id, audience, type, title, message, link, metadata)
      VALUES (
        v_owner,
        'customer',
        'certificate_verification',
        format('Certificate %s %s', NEW.certificate_code, NEW.verification_status),
        format('Verification status for "%s" is now %s.', NEW.certificate_title, NEW.verification_status),
        format('/verify/%s', NEW.certificate_code),
        jsonb_build_object('certificate_code', NEW.certificate_code, 'status', NEW.verification_status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_notify_cert_verification ON public.fcs_certificate_verifications;
CREATE TRIGGER trg_fcs_notify_cert_verification
  AFTER UPDATE ON public.fcs_certificate_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fcs_notify_on_cert_verification();

-- Enable RLS on all fcs_ tables
ALTER TABLE public.fcs_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_resume_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_authorized_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_certificate_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_uploaded_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_support_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcs_export_events ENABLE ROW LEVEL SECURITY;

-- Policies: fcs_profiles
DROP POLICY IF EXISTS fcs_profiles_select_own_or_staff ON public.fcs_profiles;
CREATE POLICY fcs_profiles_select_own_or_staff ON public.fcs_profiles
  FOR SELECT USING (auth.uid() = id OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent']));

DROP POLICY IF EXISTS fcs_profiles_insert_own ON public.fcs_profiles;
CREATE POLICY fcs_profiles_insert_own ON public.fcs_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS fcs_profiles_update_own_or_admin ON public.fcs_profiles;
CREATE POLICY fcs_profiles_update_own_or_admin ON public.fcs_profiles
  FOR UPDATE USING (auth.uid() = id OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']))
  WITH CHECK (auth.uid() = id OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- Policies: fcs_user_roles
DROP POLICY IF EXISTS fcs_user_roles_select ON public.fcs_user_roles;
CREATE POLICY fcs_user_roles_select ON public.fcs_user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS fcs_user_roles_super_admin_manage ON public.fcs_user_roles;
CREATE POLICY fcs_user_roles_super_admin_manage ON public.fcs_user_roles
  FOR ALL USING (public.fcs_has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.fcs_has_role(auth.uid(), 'super_admin'));

-- Policies: fcs_resume_templates
DROP POLICY IF EXISTS fcs_resume_templates_select ON public.fcs_resume_templates;
CREATE POLICY fcs_resume_templates_select ON public.fcs_resume_templates
  FOR SELECT USING (is_active = true OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

DROP POLICY IF EXISTS fcs_resume_templates_manage ON public.fcs_resume_templates;
CREATE POLICY fcs_resume_templates_manage ON public.fcs_resume_templates
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

-- Policies: fcs_resumes
DROP POLICY IF EXISTS fcs_resumes_own ON public.fcs_resumes;
CREATE POLICY fcs_resumes_own ON public.fcs_resumes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_resumes_admin_select ON public.fcs_resumes;
CREATE POLICY fcs_resumes_admin_select ON public.fcs_resumes
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- Policies: fcs_certificate_templates
DROP POLICY IF EXISTS fcs_cert_templates_select ON public.fcs_certificate_templates;
CREATE POLICY fcs_cert_templates_select ON public.fcs_certificate_templates
  FOR SELECT USING (is_active = true OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

DROP POLICY IF EXISTS fcs_cert_templates_manage ON public.fcs_certificate_templates;
CREATE POLICY fcs_cert_templates_manage ON public.fcs_certificate_templates
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

-- Policies: fcs_authorized_issuers
DROP POLICY IF EXISTS fcs_issuers_select ON public.fcs_authorized_issuers;
CREATE POLICY fcs_issuers_select ON public.fcs_authorized_issuers
  FOR SELECT USING (
    verification_status = 'approved'
    OR auth.uid() = user_id
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin'])
  );

DROP POLICY IF EXISTS fcs_issuers_manage ON public.fcs_authorized_issuers;
CREATE POLICY fcs_issuers_manage ON public.fcs_authorized_issuers
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- Policies: fcs_certificates
DROP POLICY IF EXISTS fcs_certificates_own ON public.fcs_certificates;
CREATE POLICY fcs_certificates_own ON public.fcs_certificates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_certificates_admin_select ON public.fcs_certificates;
CREATE POLICY fcs_certificates_admin_select ON public.fcs_certificates
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- Policies: fcs_certificate_verifications (no bulk anon table dump; public verification uses exact-code RPC)
DROP POLICY IF EXISTS fcs_cert_verifications_public_read ON public.fcs_certificate_verifications;
CREATE POLICY fcs_cert_verifications_owner_or_admin_read ON public.fcs_certificate_verifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.fcs_certificates c WHERE c.id = certificate_id AND c.user_id = auth.uid())
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin'])
  );

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

  RETURN jsonb_build_object(
    'found', true,
    'certificate_code', v_row.certificate_code,
    'recipient_name', v_row.recipient_name,
    'certificate_title', v_row.certificate_title,
    'course_or_achievement', v_row.course_or_achievement,
    'issuing_organization', v_row.issuing_organization,
    'issue_date', v_row.issue_date,
    'expiry_date', v_row.expiry_date,
    'verification_status',
      CASE
        WHEN v_row.verification_status = 'verified' AND v_row.expiry_date IS NOT NULL AND v_row.expiry_date < CURRENT_DATE
          THEN 'expired'
        ELSE v_row.verification_status
      END,
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

DROP POLICY IF EXISTS fcs_cert_verifications_owner_upsert ON public.fcs_certificate_verifications;
CREATE POLICY fcs_cert_verifications_owner_upsert ON public.fcs_certificate_verifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.fcs_certificates c WHERE c.id = certificate_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS fcs_cert_verifications_owner_update ON public.fcs_certificate_verifications;
CREATE POLICY fcs_cert_verifications_owner_update ON public.fcs_certificate_verifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.fcs_certificates c WHERE c.id = certificate_id AND c.user_id = auth.uid())
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin'])
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.fcs_certificates c WHERE c.id = certificate_id AND c.user_id = auth.uid())
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin'])
  );

-- Policies: fcs_uploaded_assets
DROP POLICY IF EXISTS fcs_uploaded_assets_own ON public.fcs_uploaded_assets;
CREATE POLICY fcs_uploaded_assets_own ON public.fcs_uploaded_assets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies: fcs_ai_conversations, fcs_ai_messages, fcs_ai_recommendations
DROP POLICY IF EXISTS fcs_ai_conversations_own ON public.fcs_ai_conversations;
CREATE POLICY fcs_ai_conversations_own ON public.fcs_ai_conversations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_ai_conversations_admin_read ON public.fcs_ai_conversations;
CREATE POLICY fcs_ai_conversations_admin_read ON public.fcs_ai_conversations
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS fcs_ai_messages_own ON public.fcs_ai_messages;
CREATE POLICY fcs_ai_messages_own ON public.fcs_ai_messages
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_ai_messages_admin_read ON public.fcs_ai_messages;
CREATE POLICY fcs_ai_messages_admin_read ON public.fcs_ai_messages
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS fcs_ai_recommendations_own ON public.fcs_ai_recommendations;
CREATE POLICY fcs_ai_recommendations_own ON public.fcs_ai_recommendations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies: fcs_support_tickets, fcs_support_messages, fcs_support_attachments
DROP POLICY IF EXISTS fcs_support_tickets_own ON public.fcs_support_tickets;
CREATE POLICY fcs_support_tickets_own ON public.fcs_support_tickets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_support_tickets_staff ON public.fcs_support_tickets;
CREATE POLICY fcs_support_tickets_staff ON public.fcs_support_tickets
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent']));

DROP POLICY IF EXISTS fcs_support_messages_customer_read ON public.fcs_support_messages;
CREATE POLICY fcs_support_messages_customer_read ON public.fcs_support_messages
  FOR SELECT USING (
    is_internal_note = false
    AND EXISTS (SELECT 1 FROM public.fcs_support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS fcs_support_messages_customer_insert ON public.fcs_support_messages;
CREATE POLICY fcs_support_messages_customer_insert ON public.fcs_support_messages
  FOR INSERT WITH CHECK (
    is_internal_note = false
    AND sender_role = 'customer'
    AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.fcs_support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS fcs_support_messages_staff ON public.fcs_support_messages;
CREATE POLICY fcs_support_messages_staff ON public.fcs_support_messages
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent']));

DROP POLICY IF EXISTS fcs_support_attachments_read ON public.fcs_support_attachments;
CREATE POLICY fcs_support_attachments_read ON public.fcs_support_attachments
  FOR SELECT USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.fcs_support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent'])
  );

DROP POLICY IF EXISTS fcs_support_attachments_insert ON public.fcs_support_attachments;
CREATE POLICY fcs_support_attachments_insert ON public.fcs_support_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.fcs_support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
      OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent'])
    )
  );

-- Policies: fcs_notifications
DROP POLICY IF EXISTS fcs_notifications_own ON public.fcs_notifications;
CREATE POLICY fcs_notifications_own ON public.fcs_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_notifications_update_own ON public.fcs_notifications;
CREATE POLICY fcs_notifications_update_own ON public.fcs_notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_notifications_delete_own ON public.fcs_notifications;
CREATE POLICY fcs_notifications_delete_own ON public.fcs_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Policies: fcs_announcements, fcs_faqs
DROP POLICY IF EXISTS fcs_announcements_read ON public.fcs_announcements;
CREATE POLICY fcs_announcements_read ON public.fcs_announcements
  FOR SELECT USING (is_active = true OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

DROP POLICY IF EXISTS fcs_announcements_manage ON public.fcs_announcements;
CREATE POLICY fcs_announcements_manage ON public.fcs_announcements
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

DROP POLICY IF EXISTS fcs_faqs_read ON public.fcs_faqs;
CREATE POLICY fcs_faqs_read ON public.fcs_faqs
  FOR SELECT USING (is_published = true OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

DROP POLICY IF EXISTS fcs_faqs_manage ON public.fcs_faqs;
CREATE POLICY fcs_faqs_manage ON public.fcs_faqs
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

-- Policies: fcs_platform_settings
DROP POLICY IF EXISTS fcs_settings_public_read ON public.fcs_platform_settings;
CREATE POLICY fcs_settings_public_read ON public.fcs_platform_settings
  FOR SELECT USING (is_public = true OR public.fcs_is_staff(auth.uid()));

DROP POLICY IF EXISTS fcs_settings_manage_website ON public.fcs_platform_settings;
CREATE POLICY fcs_settings_manage_website ON public.fcs_platform_settings
  FOR ALL USING (
    public.fcs_has_role(auth.uid(), 'super_admin')
    OR (public.fcs_has_role(auth.uid(), 'admin') AND key <> 'security_config')
    OR (public.fcs_has_role(auth.uid(), 'content_manager') AND is_public = true)
  )
  WITH CHECK (
    public.fcs_has_role(auth.uid(), 'super_admin')
    OR (public.fcs_has_role(auth.uid(), 'admin') AND key <> 'security_config')
    OR (public.fcs_has_role(auth.uid(), 'content_manager') AND is_public = true)
  );

-- Policies: fcs_activity_logs, fcs_rate_limits, fcs_export_events
DROP POLICY IF EXISTS fcs_activity_logs_admin_read ON public.fcs_activity_logs;
CREATE POLICY fcs_activity_logs_admin_read ON public.fcs_activity_logs
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS fcs_activity_logs_auth_insert ON public.fcs_activity_logs;
CREATE POLICY fcs_activity_logs_auth_insert ON public.fcs_activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (actor_id IS NULL OR actor_id = auth.uid()));

DROP POLICY IF EXISTS fcs_rate_limits_own ON public.fcs_rate_limits;
CREATE POLICY fcs_rate_limits_own ON public.fcs_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_export_events_insert ON public.fcs_export_events;
CREATE POLICY fcs_export_events_insert ON public.fcs_export_events
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS fcs_export_events_admin_read ON public.fcs_export_events;
CREATE POLICY fcs_export_events_admin_read ON public.fcs_export_events
  FOR SELECT USING (auth.uid() = user_id OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- Realtime publication for live support & notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fcs_support_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fcs_support_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fcs_support_tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fcs_support_tickets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fcs_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fcs_notifications;
  END IF;
END;
$$;

-- Storage Buckets (strictly fcs-* prefixed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('fcs-vault', 'fcs-vault', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']),
  ('fcs-support-attachments', 'fcs-support-attachments', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain']),
  ('fcs-public-assets', 'fcs-public-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Object Policies (scoped strictly to fcs-* buckets)
DROP POLICY IF EXISTS fcs_vault_own_read ON storage.objects;
CREATE POLICY fcs_vault_own_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fcs-vault'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS fcs_vault_own_insert ON storage.objects;
CREATE POLICY fcs_vault_own_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fcs-vault'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS fcs_vault_own_update ON storage.objects;
CREATE POLICY fcs_vault_own_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fcs-vault'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS fcs_vault_own_delete ON storage.objects;
CREATE POLICY fcs_vault_own_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'fcs-vault'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS fcs_support_att_read ON storage.objects;
CREATE POLICY fcs_support_att_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fcs-support-attachments'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'support_agent'])
    )
  );

DROP POLICY IF EXISTS fcs_support_att_insert ON storage.objects;
CREATE POLICY fcs_support_att_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fcs-support-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS fcs_public_assets_read ON storage.objects;
CREATE POLICY fcs_public_assets_read ON storage.objects
  FOR SELECT USING (bucket_id = 'fcs-public-assets');

DROP POLICY IF EXISTS fcs_public_assets_manage ON storage.objects;
CREATE POLICY fcs_public_assets_manage ON storage.objects
  FOR ALL USING (
    bucket_id = 'fcs-public-assets'
    AND public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  )
  WITH CHECK (
    bucket_id = 'fcs-public-assets'
    AND public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );
