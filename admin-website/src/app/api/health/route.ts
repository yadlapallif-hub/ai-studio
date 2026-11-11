import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const service = createServiceSupabase();
    const { error } = await service.from("fcs_platform_settings").select("key").limit(1);
    return NextResponse.json({
      status: error ? "degraded" : "ok",
      app: "admin-website",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Health check error",
      },
      { status: 500 }
    );
  }
}
