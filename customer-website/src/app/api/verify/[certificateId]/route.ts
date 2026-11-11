import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ certificateId: string }> }
) {
  const { certificateId } = await context.params;
  const cleanCode = decodeURIComponent(certificateId || "").trim();

  if (!cleanCode) {
    return NextResponse.json({ found: false, error: "Certificate ID required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("fcs_lookup_certificate_verification", {
    p_code: cleanCode,
  });

  if (error) {
    return NextResponse.json({ found: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? { found: false });
}
