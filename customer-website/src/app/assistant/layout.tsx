import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Creator AI Assistant, Career Roadmap & Conversations",
  description:
    "Ask Creator AI about resumes, certificates, platform workflows, generate Career Roadmap & Interview Prep plans, and organize topic-specific chat sessions.",
  path: "/assistant",
});

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
