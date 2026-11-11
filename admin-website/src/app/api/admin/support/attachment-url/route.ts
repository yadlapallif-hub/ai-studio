import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "support_agent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { storagePath?: string } | null;
  if (!body?.storagePath) {
    return NextResponse.json({ error: "Missing storagePath" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { data, error } = await service.storage
    .from("fcs-support-attachments")
    .createSignedUrl(body.storagePath, 180);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed signing URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
