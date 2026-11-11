import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({
      googleEnabled: false,
      phoneEnabled: false,
      supabaseCallbackUrl: "",
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({
        googleEnabled: false,
        phoneEnabled: true,
        supabaseCallbackUrl: `${supabaseUrl}/auth/v1/callback`,
      });
    }

    const data = (await res.json()) as {
      external?: { google?: boolean; phone?: boolean; email?: boolean };
      sms_autoconfirm?: boolean;
    };

    return NextResponse.json({
      googleEnabled: Boolean(data.external?.google),
      phoneEnabled: Boolean(data.external?.phone),
      emailEnabled: data.external?.email !== false,
      smsAutoconfirm: Boolean(data.sms_autoconfirm),
      supabaseCallbackUrl: `${supabaseUrl}/auth/v1/callback`,
    });
  } catch {
    return NextResponse.json({
      googleEnabled: false,
      phoneEnabled: true,
      supabaseCallbackUrl: `${supabaseUrl}/auth/v1/callback`,
    });
  }
}
