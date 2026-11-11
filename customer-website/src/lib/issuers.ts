import type { User } from "@supabase/supabase-js";
import { stampSvgToDataUrl, type OrganizationStampRecord } from "@francis/shared";
import { createServiceSupabase } from "@/lib/supabase/server";

export interface AccessibleIssuerRow {
  id: string;
  user_id: string | null;
  organization_name: string;
  organization_slug: string;
  contact_email: string;
  website: string | null;
  verification_status: string;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
}

export async function getAccessibleIssuersForUser(user: User): Promise<{
  applications: AccessibleIssuerRow[];
  approvedIssuers: AccessibleIssuerRow[];
}> {
  const service = createServiceSupabase();
  const userEmail = user.email?.trim().toLowerCase() || "";
  const emailConfirmed = Boolean(
    user.email_confirmed_at ||
      user.confirmed_at ||
      user.app_metadata?.provider === "google"
  );

  const query = service
    .from("fcs_authorized_issuers")
    .select(
      "id, user_id, organization_name, organization_slug, contact_email, website, verification_status, notes, approved_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(40);

  const { data } = userEmail
    ? await query.or(`user_id.eq.${user.id},contact_email.ilike.${userEmail}`)
    : await query.eq("user_id", user.id);

  const rows = ((data ?? []) as AccessibleIssuerRow[]).filter((row) => {
    if (row.user_id === user.id) return true;
    const rowEmail = (row.contact_email || "").trim().toLowerCase();
    if (!userEmail || rowEmail !== userEmail) return false;
    if (row.user_id === null) return true;
    return row.verification_status === "approved" && emailConfirmed;
  });

  return {
    applications: rows,
    approvedIssuers: rows.filter((row) => row.verification_status === "approved"),
  };
}

interface RawOrgStampRow {
  id: string;
  issuer_id: string;
  name: string;
  stamp_kind: "stamp" | "seal" | "signature" | "emblem_stamp";
  shape: "circle" | "rectangle" | "square" | "scalloped";
  ink_style:
    | "blue_ink"
    | "red_ink"
    | "teal_ink"
    | "black_ink"
    | "gold_embossed"
    | "custom"
    | "default";
  config: Record<string, unknown>;
  svg_markup: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  is_default: boolean;
  created_at: string;
}

export async function resolveOrganizationStampRow(
  row: RawOrgStampRow,
  issuerNameMap?: Map<string, string>
): Promise<OrganizationStampRecord> {
  let previewUrl = "";

  if (row.svg_markup) {
    previewUrl = stampSvgToDataUrl(row.svg_markup);
  } else if (row.storage_bucket && row.storage_path) {
    try {
      const service = createServiceSupabase();
      const { data: blob } = await service.storage
        .from(row.storage_bucket)
        .download(row.storage_path);
      if (blob) {
        const buffer = Buffer.from(await blob.arrayBuffer());
        if (buffer.byteLength <= 2 * 1024 * 1024) {
          const mime = row.mime_type || blob.type || "image/png";
          previewUrl = `data:${mime};base64,${buffer.toString("base64")}`;
        } else {
          const { data: signed } = await service.storage
            .from(row.storage_bucket)
            .createSignedUrl(row.storage_path, 3600);
          previewUrl = signed?.signedUrl || "";
        }
      }
    } catch {
      previewUrl = "";
    }
  }

  return {
    id: row.id,
    issuer_id: row.issuer_id,
    organization_name: issuerNameMap?.get(row.issuer_id),
    name: row.name,
    stamp_kind: row.stamp_kind,
    shape: row.shape,
    ink_style: row.ink_style,
    config: row.config ?? {},
    svg_markup: row.svg_markup,
    preview_url: previewUrl,
    is_default: row.is_default,
    created_at: row.created_at,
  };
}

export async function getStampsForApprovedIssuers(
  approvedIssuers: Array<{ id: string; organization_name: string }>
): Promise<OrganizationStampRecord[]> {
  if (approvedIssuers.length === 0) return [];
  const service = createServiceSupabase();
  const issuerIds = approvedIssuers.map((i) => i.id);
  const nameMap = new Map(approvedIssuers.map((i) => [i.id, i.organization_name]));

  const { data } = await service
    .from("fcs_organization_stamps")
    .select(
      "id, issuer_id, name, stamp_kind, shape, ink_style, config, svg_markup, storage_bucket, storage_path, mime_type, is_default, created_at"
    )
    .in("issuer_id", issuerIds)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as RawOrgStampRow[];
  return Promise.all(rows.map((r) => resolveOrganizationStampRow(r, nameMap)));
}
