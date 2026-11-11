import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SignupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(128),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid signup details." },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const fullName = parsed.data.fullName.trim();
  const { password } = parsed.data;

  try {
    const service = createServiceSupabase();

    // Create confirmed account directly server-side so signup does not depend on
    // Supabase's 2 emails/hour built-in rate limit.
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createErr) {
      const lower = createErr.message.toLowerCase();
      if (lower.includes("already") || lower.includes("exists") || lower.includes("registered")) {
        return NextResponse.json(
          {
            code: "already_exists",
            error:
              "An account with this email already exists. Please sign in or reset your password.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    const userId = created.user?.id;
    if (userId) {
      await service.from("fcs_profiles").upsert(
        {
          id: userId,
          email: normalizedEmail,
          full_name: fullName,
          status: "active",
        },
        { onConflict: "id" }
      );

      await service.from("fcs_user_roles").upsert(
        {
          user_id: userId,
          role: "customer",
        },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create account." },
      { status: 500 }
    );
  }
}
