import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { vaultFolderSchema } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";

const assetMetaPatchSchema = z.object({
  assetId: z.string().uuid(),
  folder_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(15).optional(),
  notes: z.string().max(400).nullable().optional(),
});

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("fcs_vault_folders")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ folders: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = vaultFolderSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }

  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("fcs_vault_folders")
      .update({ name: parsed.data.name, color: parsed.data.color })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ folder: data });
  }

  const { data, error } = await supabase
    .from("fcs_vault_folders")
    .insert({ user_id: user.id, name: parsed.data.name, color: parsed.data.color })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ folder: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = assetMetaPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid asset metadata update" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.folder_id !== undefined) patch.folder_id = parsed.data.folder_id;
  if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

  const { data, error } = await supabase
    .from("fcs_uploaded_assets")
    .update(patch)
    .eq("id", parsed.data.assetId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ asset: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing folder id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("fcs_vault_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
