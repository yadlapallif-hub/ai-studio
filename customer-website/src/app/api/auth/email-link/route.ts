import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchCustomerAuthEmail } from "@/lib/email-delivery";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EmailLinkSchema = z.object({
  mode: z.enum(["magiclink", "recovery", "signup_resend"]),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  fullName: z.string().trim().max(120).optional(),
  next: z.string().trim().max(240).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`auth-email-link:${ip}`, 8, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many authentication link requests. Please wait a minute." },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = EmailLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Enter a valid email address." },
      { status: 400 }
    );
  }

  const requestOrigin = new URL(request.url).origin;
  const result = await dispatchCustomerAuthEmail({
    kind: parsed.data.mode,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    next: parsed.data.next,
    requestOrigin,
  });

  return NextResponse.json(
    {
      ok: result.ok,
      code: result.code,
      delivery: result.delivery,
      message: result.message,
      error: result.ok ? undefined : result.message,
    },
    { status: result.status }
  );
}
