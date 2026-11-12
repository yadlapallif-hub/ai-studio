import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const GITHUB_RELEASE_BASE =
  process.env.TUTORIAL_VIDEO_BASE_URL?.replace(/\/$/, "") ||
  "https://github.com/yadlapallif-hub/ai-studio/releases/download/tutorials-v1";

// Public CDN mirror for rendered MP4 episodes when running on serverless hosts without local .media-work/videos
const DRIVE_TUTORIAL_IDS: Record<string, string> = {
  "01-website-introduction-en.mp4": "1HxFXaoInXY7E4G3AK6RHf5KQ6uWSWr_L",
  "02-ai-resume-studio-en.mp4": "1q8GmY3OJTzbORTxmYa0SvX0dOxGI7OeD",
  "03-certificate-design-studio-en.mp4": "1wD7WayRo1bLDXKVNx_GfZ4KHOmjxIKOC",
  "04-qr-certificate-verification-en.mp4": "1LiuAlaQCGuoHGW--ws9sjMUDSYoy1EnG",
  "05-creator-ai-assistant-en.mp4": "1Asuql4GuuoYs92EWre5XZAqvjHmrxzsw",
  "06-career-roadmap-interview-prep-en.mp4": "1kHpjoGhR94qLj5EWr1cM0eFHYrdhgnnE",
  "07-ai-recommendations-en.mp4": "1S0LDepsr5wywE1dz5Dde5dxHVZF20juU",
  "08-conversations-chat-sessions-en.mp4": "1UFkjVXH6XbKfzPcZzPjZALRBhvrAF2JU",
  "09-live-support-tickets-en.mp4": "1_IXcAkgXRgfJSqNyBz27c1_QI42jMSIV",
  "10-authorized-organizations-en.mp4": "1_VtrZfFfrfz4-UWOQdC8kKvAE4_7d4Fe",
};

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

export async function GET(request: NextRequest) {
  const file = (request.nextUrl.searchParams.get("file") || "").trim();

  if (!/^[0-9a-zA-Z._-]+\.mp4$/.test(file) || file.includes("..")) {
    return NextResponse.json({ error: "Invalid tutorial video file name" }, { status: 400 });
  }

  const localPath = resolveLocalVideoPath(file);
  if (localPath) {
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

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": "video/mp4",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
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

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalSize),
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (process.env.TUTORIAL_VIDEO_BASE_URL) {
    return NextResponse.redirect(`${GITHUB_RELEASE_BASE}/${encodeURIComponent(file)}`, {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const driveId = DRIVE_TUTORIAL_IDS[file];
  if (driveId) {
    return NextResponse.redirect(
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`,
      {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  }

  return NextResponse.redirect(`${GITHUB_RELEASE_BASE}/${encodeURIComponent(file)}`, {
    status: 307,
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
