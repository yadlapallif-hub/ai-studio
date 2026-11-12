import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Live Support & Support Tickets",
  description:
    "Submit support tickets, attach screenshots, and chat directly with Francis Creator Studio support agents.",
  path: "/support",
});

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
