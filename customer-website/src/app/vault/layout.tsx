import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Private Document Vault",
  description:
    "Access your private saved resumes, certificates, uploaded photos, stamps, and exported PDFs securely.",
  path: "/vault",
  noIndex: true,
});

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
