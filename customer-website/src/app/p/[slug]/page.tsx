import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { createServiceSupabase } from "@/lib/supabase/server";
import type { PortfolioData } from "@francis/shared";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const admin = createServiceSupabase();
  const { data } = await admin
    .from("fcs_portfolios")
    .select("title, data")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  const pfData = (data?.data as PortfolioData | undefined) ?? null;
  return {
    title: pfData ? `${pfData.fullName} — ${pfData.headline}` : "Published Portfolio",
    description: pfData?.bio || "Personal portfolio hosted on Francis Creator Studio.",
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createServiceSupabase();
  const { data: row } = await admin
    .from("fcs_portfolios")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!row) notFound();

  const data = row.data as PortfolioData;
  const dark = row.theme_mode === "dark";
  const accent = row.accent_color || "#0F766E";

  return (
    <div
      className={
        dark ? "min-h-screen bg-[#0B0F14] text-slate-100" : "min-h-screen bg-[#F8F7F4] text-slate-900"
      }
    >
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-current/10 pb-5 text-sm">
          <span className="font-bold">{data.fullName}</span>
          <nav className="flex gap-5 text-xs font-semibold opacity-80">
            <a href="#projects">Projects</a>
            <a href="#experience">Experience</a>
            <a href="#skills">Skills</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>

        <section className="py-4">
          {data.availability && (
            <span
              className="inline-block rounded-full border border-current/15 px-3 py-1 text-xs font-semibold"
              style={{ color: accent }}
            >
              {data.availability}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">{data.headline}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed opacity-75">{data.bio}</p>
          <a
            href={data.ctaHref || `mailto:${data.email}`}
            className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {data.ctaLabel || "Get in Touch"}
          </a>
        </section>

        <section id="projects">
          <h2 className="mb-4 text-xl font-bold">Selected Projects</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.projects.map((p) => (
              <article
                key={p.id}
                className={`rounded-2xl border p-5 ${
                  dark ? "border-slate-800 bg-[#111720]" : "border-slate-200 bg-white"
                }`}
              >
                <h3 className="text-base font-bold">{p.title}</h3>
                <p className="mt-1.5 text-sm opacity-75">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.techStack.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-current/15 px-2 py-0.5 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {(p.liveUrl || p.githubUrl) && (
                  <div className="mt-4 flex gap-4 text-xs font-semibold" style={{ color: accent }}>
                    {p.liveUrl && (
                      <a href={p.liveUrl} target="_blank" rel="noreferrer">
                        Live Demo ↗
                      </a>
                    )}
                    {p.githubUrl && (
                      <a href={p.githubUrl} target="_blank" rel="noreferrer">
                        Source ↗
                      </a>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {data.experience.length > 0 && (
          <section id="experience">
            <h2 className="mb-4 text-xl font-bold">Experience</h2>
            <div className="space-y-3">
              {data.experience.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-2xl border p-5 ${
                    dark ? "border-slate-800 bg-[#111720]" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <strong>
                      {e.role} — {e.organization}
                    </strong>
                    <span className="opacity-65">{e.period}</span>
                  </div>
                  <p className="mt-1.5 text-sm opacity-75">{e.highlights}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="skills">
          <h2 className="mb-4 text-xl font-bold">Skills</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.skillGroups.map((g) => (
              <div
                key={g.id}
                className={`rounded-2xl border p-5 ${
                  dark ? "border-slate-800 bg-[#111720]" : "border-slate-200 bg-white"
                }`}
              >
                <h3 className="text-sm font-bold">{g.category}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-current/15 px-2 py-0.5 text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className={`rounded-2xl border p-6 ${
            dark ? "border-slate-800 bg-[#111720]" : "border-slate-200 bg-white"
          }`}
        >
          <h2 className="text-lg font-bold">Contact</h2>
          <p className="mt-1 text-sm opacity-75">
            {data.location} •{" "}
            <a href={`mailto:${data.email}`} style={{ color: accent }}>
              {data.email}
            </a>
          </p>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-5 text-xs opacity-70">
          <span>&copy; {new Date().getFullYear()} {data.fullName}</span>
          <SafeNavLink href="/portfolio-builder" className="hover:underline">
            Built with Francis Creator Studio
          </SafeNavLink>
        </footer>
      </div>
    </div>
  );
}
