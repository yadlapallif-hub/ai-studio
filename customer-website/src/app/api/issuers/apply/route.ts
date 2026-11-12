import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccessibleIssuersForUser } from "@/lib/issuers";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters.")
    .max(120),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid organization email address.")
    .max(160),
  website: z.string().trim().max(240).optional().nullable(),
  domain: z.string().trim().max(120).optional().nullable(),
});

function normalizeWebsite(raw?: string | null): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminDb = createServiceSupabase();
    const [{ data, error }, myAccess] = await Promise.all([
      adminDb
        .from("fcs_authorized_issuers")
        .select(
          "id, organization_name, organization_slug, website, verification_status, approved_at, created_at"
        )
        .eq("verification_status", "approved")
        .order("approved_at", { ascending: false, nullsFirst: false })
        .limit(50),
      user
        ? getAccessibleIssuersForUser(user)
        : Promise.resolve({ applications: [], approvedIssuers: [] }),
    ]);

    if (error) {
      return NextResponse.json(
        { issuers: [], myApplications: [], warning: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({
      issuers: data ?? [],
      myApplications: myAccess.applications,
    });
  } catch (err) {
    return NextResponse.json(
      {
        issuers: [],
        myApplications: [],
        warning: err instanceof Error ? err.message : "Failed loading issuers",
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid organization name or email." },
      { status: 400 }
    );
  }

  const { organizationName, contactEmail, website, domain } = parsed.data;
  const normalizedEmail = contactEmail.toLowerCase();

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminDb = createServiceSupabase();

  const { data: existingList } = await adminDb
    .from("fcs_authorized_issuers")
    .select("id, organization_name, contact_email, verification_status")
    .ilike("organization_name", organizationName)
    .eq("contact_email", normalizedEmail)
    .in("verification_status", ["pending", "approved"])
    .limit(1);

  const existing = existingList?.[0];
  if (existing) {
    return NextResponse.json(
      {
        error:
          existing.verification_status === "approved"
            ? `"${existing.organization_name}" is already approved as an Authorized Organization.`
            : `An application for "${existing.organization_name}" is already pending Administrator approval.`,
      },
      { status: 409 }
    );
  }

  const baseSlug =
    organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "issuer";
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`;

  const { data: inserted, error } = await adminDb
    .from("fcs_authorized_issuers")
    .insert({
      user_id: user?.id ?? null,
      organization_name: organizationName,
      organization_slug: uniqueSlug,
      contact_email: normalizedEmail,
      website: normalizeWebsite(website),
      notes: domain?.trim()
        ? `Primary domain: ${domain.trim()} — Awaiting Admin approval`
        : "Submitted for Admin approval",
      verification_status: "pending",
      approved_by: null,
      approved_at: null,
    })
    .select(
      "id, organization_name, organization_slug, contact_email, website, verification_status, notes, approved_at, created_at"
    )
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message || "Failed creating application." }, { status: 500 });
  }

  // Notify admins of new Authorized Organization approval request
  const { data: admins } = await adminDb
    .from("fcs_user_roles")
    .select("user_id")
    .in("role", ["super_admin", "admin", "content_manager"]);

  if (admins && admins.length > 0) {
    const uniqueAdminIds = Array.from(new Set(admins.map((a: { user_id: string }) => a.user_id)));
    await adminDb.from("fcs_notifications").insert(
      uniqueAdminIds.map((adminId) => ({
        user_id: adminId,
        audience: "admin",
        type: "certificate_verification",
        title: `New Issuer Application: ${organizationName}`,
        message: `${organizationName} (${normalizedEmail}) requested Authorized Organization approval.`,
        link: "/verifications",
        metadata: {
          issuer_id: inserted.id,
          organization_name: organizationName,
          contact_email: normalizedEmail,
        },
      }))
    );
  }

  await adminDb.from("fcs_activity_logs").insert({
    actor_id: user?.id ?? null,
    actor_role: user ? "customer" : "guest",
    action: "issuer_applied",
    entity_type: "authorized_issuer",
    entity_id: inserted.id,
    details: {
      organization_name: organizationName,
      contact_email: normalizedEmail,
      verification_status: "pending",
      requires_admin_approval: true,
    },
  });

  return NextResponse.json({ ok: true, pendingApproval: true, issuer: inserted });
}
