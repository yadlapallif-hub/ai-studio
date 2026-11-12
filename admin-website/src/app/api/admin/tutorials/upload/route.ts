import { NextResponse } from "next/server";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["mp4", "webm", "png", "jpg", "jpeg", "webp", "vtt"]);

export async function POST(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Multipart form data expected" }, { status: 400 });
  }

  const file = formData.get("file");
  const slug = String(formData.get("slug") || "tutorial")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
  const kind = String(formData.get("kind") || "video").replace(/[^a-z0-9_-]/g, "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field is required" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Unsupported file format. Allowed: mp4, webm, png, jpg, jpeg, webp, vtt" },
      { status: 400 }
    );
  }

  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 100MB upload limit" }, { status: 413 });
  }

  const storagePath = `${slug}/${kind}-${Date.now()}.${ext}`;
  const service = createServiceSupabase();
  const bytes = await file.arrayBuffer();

  const { error } = await service.storage
    .from("fcs-tutorials")
    .upload(storagePath, bytes, {
      contentType: file.type || (ext === "vtt" ? "text/vtt" : "application/octet-stream"),
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = service.storage.from("fcs-tutorials").getPublicUrl(storagePath);

  await recordAdminAudit({
    actorId: admin.userId,
    action: "admin.tutorial.asset_uploaded",
    targetType: "fcs-tutorials",
    targetId: storagePath,
  });

  return NextResponse.json({ ok: true, publicUrl, storagePath });
}
