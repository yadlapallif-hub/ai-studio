export const SUPABASE_TUTORIALS_CDN_BASE = (() => {
  const base = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ojzcgeckdrvxvkfphtma.supabase.co"
  ).replace(/\/$/, "");
  return `${base}/storage/v1/object/public/fcs-tutorials`;
})();

/**
 * Verified MP4 tutorial objects currently synced to Supabase Storage public bucket `fcs-tutorials`.
 * Directly serving these via Supabase Smart CDN in production gives native 206 byte-range streaming
 * with `Access-Control-Allow-Origin: *` across Chrome, Safari, iOS, Firefox, and Edge.
 */
export const READY_SUPABASE_CDN_FILES = new Set<string>([
  "01-website-introduction-en.mp4",
  "02-ai-resume-studio-en.mp4",
  "03-certificate-design-studio-en.mp4",
  "04-qr-certificate-verification-en.mp4",
  "05-creator-ai-assistant-en.mp4",
  "06-career-roadmap-interview-prep-en.mp4",
  "07-ai-recommendations-en.mp4",
  "08-conversations-chat-sessions-en.mp4",
  "09-live-support-tickets-en.mp4",
  "10-authorized-organizations-en.mp4",
  "11-document-vault-en.mp4",
  "12-admin-dashboard-en.mp4",
  "01-website-introduction-te.mp4",
  "02-ai-resume-studio-te.mp4",
  "03-certificate-design-studio-te.mp4",
  "04-qr-certificate-verification-te.mp4",
  "05-creator-ai-assistant-te.mp4",
  "06-career-roadmap-interview-prep-te.mp4",
  "07-ai-recommendations-te.mp4",
  "08-conversations-chat-sessions-te.mp4",
]);

export const DRIVE_TUTORIAL_IDS: Record<string, string> = {
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
  "11-document-vault-en.mp4": "18nAlyW5SJWPXkLJ2lNAuiXcyj8FoH1AD",
  "12-admin-dashboard-en.mp4": "1i6-nqj3Mb1G6vaIw8dUQrNERwuGmgglf",
  "01-website-introduction-te.mp4": "1JvqibQxrOvSJA2PwwFluF9_MJZJuCLro",
  "02-ai-resume-studio-te.mp4": "13PI9diUhshy74yJjec5Xi3mmI61q4TDO",
  "03-certificate-design-studio-te.mp4": "1W_QUA4BlIza4u2QFXodZ719hz8NrLQd1",
  "04-qr-certificate-verification-te.mp4": "1X4tHiRGV9mV6xpqOk3r1_eSWlEcT5Men",
  "05-creator-ai-assistant-te.mp4": "1j3koxzwPpjMW30v-eK0JBg7DsedB00jw",
  "06-career-roadmap-interview-prep-te.mp4": "14mobgQOUhg5pEvPApMgE0BxIyoYxQdcR",
  "07-ai-recommendations-te.mp4": "1BwN7lK0Qxaj7Iu7nLjv6hBFzCcYHT13Q",
  "08-conversations-chat-sessions-te.mp4": "11iM8kvAkQwiOAD7LSJkOpar0gLTn0g37",
};

export function extractStreamFilename(urlOrNull: string | null | undefined, fallbackFilename: string): string {
  if (!urlOrNull) return fallbackFilename;
  const match = /[?&]file=([^&]+)/.exec(urlOrNull);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return fallbackFilename;
}

export function resolveTutorialVideoUrl(
  storedUrl: string | null | undefined,
  fallbackFilename: string
): string {
  if (storedUrl && /^https?:\/\//i.test(storedUrl)) {
    return storedUrl;
  }
  const file = extractStreamFilename(storedUrl, fallbackFilename);
  const isBrowserRemote =
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";
  const isVercelServer =
    typeof window === "undefined" && process.env.VERCEL === "1";

  if ((isVercelServer || isBrowserRemote) && READY_SUPABASE_CDN_FILES.has(file)) {
    return `${SUPABASE_TUTORIALS_CDN_BASE}/${encodeURIComponent(file)}`;
  }
  return `/api/tutorials/stream?file=${encodeURIComponent(file)}`;
}
