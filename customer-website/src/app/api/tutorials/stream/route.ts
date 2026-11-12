import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  DRIVE_TUTORIAL_IDS,
  READY_SUPABASE_CDN_FILES,
  SUPABASE_TUTORIALS_CDN_BASE,
} from "@/lib/tutorials";

export const dynamic = "force-dynamic";

const MAX_PROXY_CHUNK_BYTES = 1_572_864; // 1.5 MiB per same-origin 206 slice (well below Vercel 4.5 MiB cap)

function resolveLocalVideoPath(filename: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), ".media-work/videos", filename),
    path.resolve(process.cwd(), "../.media-work/videos", filename),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // ignore missing path
    }
  }
  return null;
}

function serveLocalVideo(request: NextRequest, localPath: string, isHead = false) {
  const stat = fs.statSync(localPath);
  const totalSize = stat.size;
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = Number(match[1]);
      const requestedEnd = match[2] ? Number(match[2]) : totalSize - 1;
      const end = Math.min(totalSize - 1, Math.max(start, requestedEnd));
      if (start >= totalSize || start < 0) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${totalSize}` },
        });
      }
      const chunkSize = end - start + 1;
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=3600",
        "Cross-Origin-Resource-Policy": "cross-origin",
      };
      if (isHead) {
        return new NextResponse(null, { status: 206, headers });
      }
      const stream = fs.createReadStream(localPath, { start, end });
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });

      return new NextResponse(webStream, { status: 206, headers });
    }
  }

  const headers = {
    "Accept-Ranges": "bytes",
    "Content-Length": String(totalSize),
    "Content-Type": "video/mp4",
    "Cache-Control": "public, max-age=3600",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  if (isHead) {
    return new NextResponse(null, { status: 200, headers });
  }

  const stream = fs.createReadStream(localPath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(webStream, { status: 200, headers });
}

async function handleStream(request: NextRequest, isHead = false) {
  const file = (request.nextUrl.searchParams.get("file") || "").trim();

  if (!/^[0-9a-zA-Z._-]+\.mp4$/.test(file) || file.includes("..")) {
    return NextResponse.json({ error: "Invalid tutorial video file name" }, { status: 400 });
  }

  // 1. Local disk playback in development / local verification
  const localPath = resolveLocalVideoPath(file);
  if (localPath) {
    return serveLocalVideo(request, localPath, isHead);
  }

  // 2. Primary production CDN: Supabase Storage `fcs-tutorials` (CORS + 206 byte-range native)
  const supaUrl = `${SUPABASE_TUTORIALS_CDN_BASE}/${encodeURIComponent(file)}`;
  if (READY_SUPABASE_CDN_FILES.has(file)) {
    return NextResponse.redirect(supaUrl, {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const headCheck = await fetch(supaUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(2500),
    });
    if (headCheck.ok) {
      return NextResponse.redirect(supaUrl, {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  } catch {
    // proceed to backup proxy check
  }

  // 3. Same-origin 206 chunked proxy from Drive backup (never 307 cross-origin to Drive CORP: same-site)
  const driveId = DRIVE_TUTORIAL_IDS[file];
  if (driveId) {
    const driveUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
      driveId
    )}&export=download&confirm=t`;
    const rangeHeader = request.headers.get("range");
    const match = rangeHeader ? /bytes=(\d+)-(\d*)/.exec(rangeHeader) : null;
    const start = match ? Number(match[1]) : 0;
    const requestedEnd = match && match[2] ? Number(match[2]) : start + MAX_PROXY_CHUNK_BYTES - 1;
    const end = Math.min(requestedEnd, start + MAX_PROXY_CHUNK_BYTES - 1);

    try {
      const upstream = await fetch(driveUrl, {
        method: isHead ? "HEAD" : "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Range: `bytes=${start}-${end}`,
        },
        signal: AbortSignal.timeout(12000),
      });

      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && (ct.includes("video") || ct.includes("octet-stream"))) {
        const contentRange = upstream.headers.get("content-range");
        const contentLength = upstream.headers.get("content-length");
        const outHeaders: Record<string, string> = {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
        };
        if (contentRange) outHeaders["Content-Range"] = contentRange;
        if (contentLength) outHeaders["Content-Length"] = contentLength;
        return new NextResponse(isHead ? null : upstream.body, {
          status: upstream.status === 206 || contentRange ? 206 : 200,
          headers: outHeaders,
        });
      }
    } catch {
      // fall through to 404
    }
  }

  return NextResponse.json(
    { error: "Tutorial clip is awaiting final studio audio render" },
    { status: 404 }
  );
}

export async function GET(request: NextRequest) {
  return handleStream(request, false);
}

export async function HEAD(request: NextRequest) {
  return handleStream(request, true);
}
