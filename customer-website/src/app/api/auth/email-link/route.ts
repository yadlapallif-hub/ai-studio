import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchCustomerAuthEmail } from "@/lib/email-delivery";

export const dynamic = "force-dynamic";

const EmailLinkSchema = z.object({
  mode: z.enum(["magiclink", "recovery", "signup_resend"]),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  fullName: z.string().trim().max(120).optional(),
  next: z.string().trim().max(240).optional(),
});

export async function POST(request: NextRequest) {
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
