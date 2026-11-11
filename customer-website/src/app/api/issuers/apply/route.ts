import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name must be at least 2 characters.").max(120),
  contactEmail: z.string().trim().email("Enter a valid organization email address.").max(160),
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
    const adminDb = createServiceSupabase();
    const { data, error } = await adminDb
      .from("fcs_authorized_issuers")
      .select("id, organization_name, organization_slug, website, verification_status, approved_at, created_at")
      .eq("verification_status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ issuers: [], error: error.message }, { status: 500 });
    }
    return NextResponse.json({ issuers: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { issuers: [], error: err instanceof Error ? err.message : "Failed loading issuers" },
      { status: 500 }
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

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminDb = createServiceSupabase();
  const baseSlug =
    organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "issuer";
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`;
  const nowIso = new Date().toISOString();

  const { data: inserted, error } = await adminDb
    .from("fcs_authorized_issuers")
    .insert({
      user_id: user?.id ?? null,
      organization_name: organizationName,
      organization_slug: uniqueSlug,
      contact_email: contactEmail.toLowerCase(),
      website: normalizeWebsite(website),
      notes: domain?.trim()
        ? `Primary domain: ${domain.trim()} (Open registration)`
        : "Open organization registration (auto-approved)",
      verification_status: "approved",
      approved_by: user?.id ?? null,
      approved_at: nowIso,
    })
    .select("id, organization_name, organization_slug, contact_email, website, verification_status, approved_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await adminDb.from("fcs_activity_logs").insert({
    actor_id: user?.id ?? null,
    actor_role: user ? "customer" : "guest",
    action: "issuer_registered",
    entity_type: "authorized_issuer",
    entity_id: inserted.id,
    details: {
      organization_name: organizationName,
      contact_email: contactEmail.toLowerCase(),
      auto_approved: true,
    },
  });

  return NextResponse.json({ ok: true, issuer: inserted });
}
