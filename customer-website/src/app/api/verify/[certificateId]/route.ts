import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ certificateId: string }> }
) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`verify-lookup:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ found: false, error: "Too many verification lookups" }, { status: 429 });
  }

  const { certificateId } = await context.params;
  const cleanCode = decodeURIComponent(certificateId || "").trim().slice(0, 64);

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
