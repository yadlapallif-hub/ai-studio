import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SignupSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("email").default("email"),
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
  }),
  z.object({
    mode: z.literal("phone"),
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(120),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid mobile number with country code."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .max(128),
  }),
]);

async function findAuthUserByPhone(
  service: ReturnType<typeof createServiceSupabase>,
  e164Phone: string,
  digitsPhone: string
) {
  const { data: prof } = await service
    .from("fcs_profiles")
    .select("id")
    .in("phone", [e164Phone, digitsPhone])
    .maybeSingle();

  if (prof?.id) {
    const { data: found } = await service.auth.admin.getUserById(prof.id);
    if (found?.user) return found.user;
  }

  for (let page = 1; page <= 5; page++) {
    const { data: listRes } = await service.auth.admin.listUsers({ page, perPage: 200 });
    const users = listRes?.users || [];
    const match = users.find((u) => u.phone === digitsPhone || u.phone === e164Phone);
    if (match) return match;
    if (users.length < 200) break;
  }
  return null;
}

async function findAuthUserByEmail(
  service: ReturnType<typeof createServiceSupabase>,
  normalizedEmail: string
) {
  const { data: prof } = await service
    .from("fcs_profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (prof?.id) {
    const { data: found } = await service.auth.admin.getUserById(prof.id);
    if (found?.user) return found.user;
  }

  for (let page = 1; page <= 5; page++) {
    const { data: listRes } = await service.auth.admin.listUsers({ page, perPage: 200 });
    const users = listRes?.users || [];
    const match = users.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
    if (match) return match;
    if (users.length < 200) break;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const normalizedInput = {
    ...raw,
    mode: raw?.mode === "phone" ? "phone" : "email",
  };

  const parsed = SignupSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid signup details." },
      { status: 400 }
    );
  }

  const fullName = parsed.data.fullName.trim();
  const password = parsed.data.password;

  try {
    const service = createServiceSupabase();

    if (parsed.data.mode === "phone") {
      const e164Phone = parsed.data.phone.trim();
      const digitsPhone = e164Phone.replace(/^\+/, "");

      const { data: created, error: createErr } = await service.auth.admin.createUser({
        phone: e164Phone,
        password,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      let userId = created.user?.id;

      if (createErr) {
        const lower = createErr.message.toLowerCase();
        if (
          lower.includes("already") ||
          lower.includes("exists") ||
          lower.includes("registered")
        ) {
          const existing = await findAuthUserByPhone(service, e164Phone, digitsPhone);
          if (existing && !existing.phone_confirmed_at) {
            await service.auth.admin.updateUserById(existing.id, {
              password,
              phone_confirm: true,
              user_metadata: { full_name: fullName },
            });
            userId = existing.id;
          } else {
            return NextResponse.json(
              {
                code: "already_exists",
                error:
                  "An account with this mobile number already exists. Please sign in on the Sign In page.",
              },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json({ error: createErr.message }, { status: 400 });
        }
      }

      if (userId) {
        await service.from("fcs_profiles").upsert(
          {
            id: userId,
            phone: e164Phone,
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
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    let userId = created.user?.id;

    if (createErr) {
      const lower = createErr.message.toLowerCase();
      if (lower.includes("already") || lower.includes("exists") || lower.includes("registered")) {
        const existing = await findAuthUserByEmail(service, normalizedEmail);
        if (existing && !existing.email_confirmed_at) {
          await service.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });
          userId = existing.id;
        } else {
          return NextResponse.json(
            {
              code: "already_exists",
              error:
                "An account with this email already exists. Please sign in or reset your password.",
            },
            { status: 409 }
          );
        }
      } else {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
    }

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
