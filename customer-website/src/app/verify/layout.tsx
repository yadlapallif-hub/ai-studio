import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Public Certificate Verification & Authorized Organizations",
  description:
    "Verify Francis Creator Studio certificate IDs and QR codes online against the live database registry, report suspicious certificates, or apply as an Authorized Organization.",
  path: "/verify",
});

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
