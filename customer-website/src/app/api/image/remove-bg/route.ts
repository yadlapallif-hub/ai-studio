import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const removeBgApiKey = process.env.REMOVE_BG_API_KEY ?? "";
  const customBgEndpoint = process.env.BG_REMOVAL_ENDPOINT ?? "";

  if (!removeBgApiKey && !customBgEndpoint) {
    return NextResponse.json({
      mode: "client_onnx",
      configuredExternalService: false,
      message:
        "No external server background-removal API key configured; running on-device ML segmentation.",
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image_file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image_file is required" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
    }

    const outbound = new FormData();
    outbound.append("image_file", file);
    if (removeBgApiKey) outbound.append("size", "auto");

    const targetUrl = customBgEndpoint || "https://api.remove.bg/v1.0/removebg";
    const headers: Record<string, string> = {};
    if (removeBgApiKey) headers["X-Api-Key"] = removeBgApiKey;

    const resp = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: outbound,
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: "External background removal API returned an error" },
        { status: 502 }
      );
    }

    const bytes = await resp.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image processing failed" },
      { status: 500 }
    );
  }
}
