import { NextRequest, NextResponse } from "next/server";
import { testimonialSubmitSchema } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("fcs_testimonials")
    .select("id, author_name, author_role, organization, quote, rating, is_approved, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ testimonials: [] });
  }
  return NextResponse.json({ testimonials: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`testimonials:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to submit verified feedback." },
      { status: 401 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = testimonialSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("fcs_testimonials")
    .insert({
      user_id: user.id,
      author_name: parsed.data.author_name,
      author_role: parsed.data.author_role,
      organization: parsed.data.organization || null,
      quote: parsed.data.quote,
      rating: parsed.data.rating,
      is_approved: false,
    })
    .select("id, author_name, author_role, organization, quote, rating, is_approved, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    testimonial: data,
    message: "Thank you! Your review has been submitted for public verification.",
  });
}
