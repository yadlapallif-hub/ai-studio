import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bucket?: string; path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bucket = body.bucket || "fcs-vault";
  const path = (body.path || "").trim();

  if (bucket !== "fcs-vault" && bucket !== "fcs-support-attachments") {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  // Enforce strict user ownership prefix check before signing
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
