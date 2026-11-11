import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchAdminMagicLink } from "@/lib/email-delivery";

export const dynamic = "force-dynamic";

const AdminEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid staff email address.").max(160),
  next: z.string().trim().max(240).optional(),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = AdminEmailSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid email address." },
      { status: 400 }
    );
  }

  const requestOrigin = new URL(request.url).origin;
  const result = await dispatchAdminMagicLink({
    email: parsed.data.email,
    next: parsed.data.next,
    requestOrigin,
  });

  return NextResponse.json(
    {
      ok: result.ok,
      code: result.code,
      message: result.message,
      error: result.ok ? undefined : result.message,
    },
    { status: result.status }
  );
}
