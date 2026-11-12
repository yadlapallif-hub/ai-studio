"use client";

import React, { useMemo, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  buildPortfolioFromResume,
  buildPortfolioStaticHtml,
  PORTFOLIO_TEMPLATES,
  type PortfolioData,
  type PortfolioTemplateId,
  type ResumeData,
} from "@francis/shared";
import {
  Check,
  Code2,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Monitor,
  Plus,
  Rocket,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";

interface SavedPortfolioRow {
  id: string;
  title: string;
  slug: string;
  template_slug: PortfolioTemplateId;
  theme_mode: "light" | "dark" | "auto";
  accent_color: string;
  is_published: boolean;
  data: PortfolioData;
  updated_at: string;
}

interface SavedResumeRow {
  id: string;
  title: string;
  data: ResumeData;
}

const DEFAULT_PORTFOLIO_DATA: PortfolioData = {
  fullName: "Francis Creator",
  headline: "Full-Stack Engineer & Product Designer",
  bio: "Designing calm, reliable web platforms, interactive tools, and open-source software.",
  location: "Hyderabad, India",
  email: "creator@example.com",
  availability: "Open to Software Engineering & Product Opportunities",
  ctaLabel: "Get in Touch",
  ctaHref: "mailto:creator@example.com",
  projects: [
    {
      id: "p1",
      title: "Creator Studio SaaS",
      tagline: "Open-Source Creative Platform",
      description:
        "Built a unified workspace for ATS resumes, verified certificates, portfolios, and AI tooling.",
      techStack: ["Next.js", "TypeScript", "Supabase", "Tailwind CSS"],
      liveUrl: "https://francis-creator-studio.vercel.app",
      githubUrl: "https://github.com/yadlapallif-hub/ai-studio",
      featured: true,
    },
  ],
  experience: [
    {
      id: "e1",
      role: "Software Engineer",
      organization: "Open Studio Collective",
      period: "2024 — Present",
      highlights: "Shipped full-stack Next.js APIs, real-time notifications, and PDF/DOCX pipelines.",
    },
  ],
  skillGroups: [
    {
      id: "sg1",
      category: "Engineering Stack",
      items: ["TypeScript", "React", "Next.js", "PostgreSQL", "Node.js", "Docker"],
    },
  ],
  socialLinks: {
    github: "https://github.com/yadlapallif-hub",
    linkedin: "",
    website: "",
  },
};

export function PortfolioBuilderClient({
  isAuthenticated,
  initialPortfolios,
  userResumes,
  initialActiveId,
}: {
  isAuthenticated: boolean;
  initialPortfolios: SavedPortfolioRow[];
  userResumes: SavedResumeRow[];
  initialActiveId?: string;
}) {
  const starter =
    (initialActiveId && initialPortfolios.find((p) => p.id === initialActiveId)) ||
    initialPortfolios[0] ||
    null;

  const [portfolios, setPortfolios] = useState<SavedPortfolioRow[]>(initialPortfolios);
  const [activeId, setActiveId] = useState<string | null>(starter?.id ?? null);
  const [title, setTitle] = useState(starter?.title ?? "My Portfolio Website");
  const [slug, setSlug] = useState(starter?.slug ?? `creator-${Math.random().toString(36).slice(2, 7)}`);
  const [templateId, setTemplateId] = useState<PortfolioTemplateId>(
    starter?.template_slug ?? "linear-atelier"
  );
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">(
    starter?.theme_mode ?? "dark"
  );
  const [accentColor, setAccentColor] = useState(starter?.accent_color ?? "#0F766E");
  const [isPublished, setIsPublished] = useState(starter?.is_published ?? false);
  const [data, setData] = useState<PortfolioData>(starter?.data ?? DEFAULT_PORTFOLIO_DATA);

  const [activeTab, setActiveTab] = useState<"profile" | "projects" | "experience" | "design">("profile");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [selectedResumeId, setSelectedResumeId] = useState<string>(userResumes[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGoal, setAiGoal] = useState("");
  const [deployOpen, setDeployOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generatedHtml = useMemo(
    () =>
      buildPortfolioStaticHtml({
        title,
        templateId,
        themeMode,
        accentColor,
        data,
      }),
    [title, templateId, themeMode, accentColor, data]
  );

  const loadPortfolio = (row: SavedPortfolioRow) => {
    setActiveId(row.id);
    setTitle(row.title);
    setSlug(row.slug);
    setTemplateId(row.template_slug);
    setThemeMode(row.theme_mode);
    setAccentColor(row.accent_color);
    setIsPublished(row.is_published);
    setData(row.data);
  };

  const handleSave = async (nextPublish?: boolean) => {
    if (!isAuthenticated) {
      setErrorMsg("Sign in to save and publish live portfolio URLs.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);
    const publishFlag = typeof nextPublish === "boolean" ? nextPublish : isPublished;

    try {
      const cleanSlug = slug
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || `creator-${Date.now()}`;
      setSlug(cleanSlug);

      const res = await fetch("/api/portfolios", {
        method: activeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(activeId ? { id: activeId } : {}),
          title,
          slug: cleanSlug,
          template_slug: templateId,
          theme_mode: themeMode,
          accent_color: accentColor,
          is_published: publishFlag,
          data,
        }),
      });
      const json = (await res.json()) as {
        portfolio?: SavedPortfolioRow;
        error?: string;
      };
      if (!res.ok || !json.portfolio) {
        setErrorMsg(json.error || "Could not save portfolio.");
        return;
      }
      setActiveId(json.portfolio.id);
      setIsPublished(json.portfolio.is_published);
      setPortfolios((prev) => {
        const idx = prev.findIndex((x) => x.id === json.portfolio!.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = json.portfolio!;
          return next;
        }
        return [json.portfolio!, ...prev];
      });
      setStatusMsg(
        json.portfolio.is_published
          ? `Portfolio published live at /p/${json.portfolio.slug}!`
          : "Portfolio saved to your workspace."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleImportResume = () => {
    const found = userResumes.find((r) => r.id === selectedResumeId);
    if (!found) return;
    const mapped = buildPortfolioFromResume(found.data, found.title);
    setData(mapped);
    setTitle(`${mapped.fullName} — Portfolio`);
    setStatusMsg(`Imported projects, skills, and bio from "${found.title}".`);
  };

  const handleAiGenerate = async () => {
    setAiLoading(true);
    setErrorMsg(null);
    try {
      const selectedResume = userResumes.find((r) => r.id === selectedResumeId);
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "portfolio_generate",
          contextPage: "Portfolio Builder",
          contextData: selectedResume ? { data: selectedResume.data } : { data },
          messages: [
            {
              role: "user",
              content:
                aiGoal.trim() ||
                "Generate clean portfolio copy, headline, and structured projects based on my background.",
            },
          ],
        }),
      });
      const json = (await res.json()) as {
        generatedPortfolio?: PortfolioData;
        reply?: string;
        message?: string;
      };
      if (!res.ok) {
        setErrorMsg(json.message || "Sign in to use AI portfolio generation.");
        return;
      }
      if (json.generatedPortfolio) {
        setData(json.generatedPortfolio);
        setStatusMsg("Creator AI generated a full portfolio structure for you to refine!");
      } else if (json.reply) {
        setData((prev) => ({ ...prev, bio: json.reply!.slice(0, 320) }));
        setStatusMsg("AI portfolio bio suggestion applied.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "portfolio"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadNextComponent = () => {
    const tsx = `import React from "react";

export default function PortfolioPage() {
  const portfolio = ${JSON.stringify(data, null, 2)};
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 font-sans">
      <h1 className="text-4xl font-bold">{portfolio.fullName}</h1>
      <p className="mt-2 text-lg text-teal-600">{portfolio.headline}</p>
      <p className="mt-4 text-slate-600">{portfolio.bio}</p>
      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {portfolio.projects.map((p) => (
          <article key={p.id} className="rounded-xl border p-5">
            <h2 className="font-bold">{p.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{p.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
`;
    const blob = new Blob([tsx], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "portfolio"}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDarkPreview = themeMode === "dark";

  return (
    <div className="min-h-screen bg-[var(--fcs-bg)]">
      {/* Top Toolbar */}
      <div className="border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SafeNavLink
              href="/dashboard"
              className="rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
            >
              ← Dashboard
            </SafeNavLink>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-sm font-semibold outline-none focus:border-teal-600"
            />
            {portfolios.length > 0 && (
              <select
                value={activeId ?? ""}
                onChange={(e) => {
                  const found = portfolios.find((p) => p.id === e.target.value);
                  if (found) loadPortfolio(found);
                }}
                className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => void handleSave(!isPublished)}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                isPublished
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              {isPublished ? "Published Live" : "Publish Live"}
            </button>
            {isPublished && activeId && (
              <SafeNavLink
                href={`/p/${slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View
              </SafeNavLink>
            )}
            <button
              type="button"
              onClick={downloadHtml}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <Download className="h-3.5 w-3.5" /> HTML
            </button>
            <button
              type="button"
              onClick={downloadNextComponent}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <Code2 className="h-3.5 w-3.5" /> Next.js TSX
            </button>
            <button
              type="button"
              onClick={() => setDeployOpen((p) => !p)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <Rocket className="h-3.5 w-3.5 text-teal-600" /> Deploy Guide
            </button>
          </div>
        </div>
      </div>

      {deployOpen && (
        <div className="mx-auto mt-3 max-w-[1500px] px-4 sm:px-6">
          <div className="rounded-2xl border border-teal-600/30 bg-teal-50/70 p-4 text-xs dark:bg-teal-950/30">
            <p className="font-bold">3 Free Ways to Host Your Portfolio</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--fcs-ink-muted)]">
              <li>
                <strong>Instant Live Hosting:</strong> Click <em>Publish Live</em> above to serve
                immediately at <code className="font-mono">/p/{slug}</code>.
              </li>
              <li>
                <strong>Static HTML (GitHub Pages / Cloudflare / Netlify):</strong> Click{" "}
                <em>HTML</em> to download <code className="font-mono">{slug}.html</code> and drop it
                into any static host.
              </li>
              <li>
                <strong>Next.js / Vercel:</strong> Click <em>Next.js TSX</em> to export a clean
                Tailwind React component ready for your own repository.
              </li>
            </ul>
          </div>
        </div>
      )}

      {(statusMsg || errorMsg) && (
        <div className="mx-auto mt-3 max-w-[1500px] px-4 sm:px-6">
          {statusMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              <Check className="h-4 w-4" /> {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* LEFT INSPECTOR */}
        <div className="space-y-4 lg:col-span-5">
          {/* AI & Resume Importer */}
          <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" /> AI &amp; Resume Import
              </span>
              {userResumes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="max-w-36 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1 text-[11px]"
                  >
                    {userResumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleImportResume}
                    className="rounded-lg border border-teal-600/40 px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300"
                  >
                    Import
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                placeholder="e.g. Full-stack React & AI systems portfolio..."
                className="flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate"}
              </button>
            </div>
          </div>

          <div className="flex rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1 text-xs font-semibold">
            {(["profile", "projects", "experience", "design"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2 capitalize transition ${
                  activeTab === tab
                    ? "bg-teal-700 text-white"
                    : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
            {activeTab === "profile" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold">Full Name</label>
                    <input
                      value={data.fullName}
                      onChange={(e) => setData({ ...data, fullName: e.target.value })}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Contact Email</label>
                    <input
                      value={data.email}
                      onChange={(e) => setData({ ...data, email: e.target.value })}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Headline</label>
                  <input
                    value={data.headline}
                    onChange={(e) => setData({ ...data, headline: e.target.value })}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Bio</label>
                  <textarea
                    rows={3}
                    value={data.bio}
                    onChange={(e) => setData({ ...data, bio: e.target.value })}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold">Location</label>
                    <input
                      value={data.location}
                      onChange={(e) => setData({ ...data, location: e.target.value })}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Availability Badge</label>
                    <input
                      value={data.availability || ""}
                      onChange={(e) => setData({ ...data, availability: e.target.value })}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="GitHub URL"
                    value={data.socialLinks.github || ""}
                    onChange={(e) =>
                      setData({ ...data, socialLinks: { ...data.socialLinks, github: e.target.value } })
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                  />
                  <input
                    placeholder="LinkedIn URL"
                    value={data.socialLinks.linkedin || ""}
                    onChange={(e) =>
                      setData({ ...data, socialLinks: { ...data.socialLinks, linkedin: e.target.value } })
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                  />
                  <input
                    placeholder="Website URL"
                    value={data.socialLinks.website || ""}
                    onChange={(e) =>
                      setData({ ...data, socialLinks: { ...data.socialLinks, website: e.target.value } })
                    }
                    className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                  />
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-3">
                {data.projects.map((proj, idx) => (
                  <div
                    key={proj.id}
                    className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={proj.title}
                        onChange={(e) => {
                          const next = [...data.projects];
                          next[idx] = { ...proj, title: e.target.value };
                          setData({ ...data, projects: next });
                        }}
                        placeholder="Project Title"
                        className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            projects: data.projects.filter((x) => x.id !== proj.id),
                          })
                        }
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={proj.description}
                      onChange={(e) => {
                        const next = [...data.projects];
                        next[idx] = { ...proj, description: e.target.value };
                        setData({ ...data, projects: next });
                      }}
                      placeholder="Short impact summary..."
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={proj.liveUrl || ""}
                        onChange={(e) => {
                          const next = [...data.projects];
                          next[idx] = { ...proj, liveUrl: e.target.value };
                          setData({ ...data, projects: next });
                        }}
                        placeholder="Live Demo URL"
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <input
                        value={proj.techStack.join(", ")}
                        onChange={(e) => {
                          const next = [...data.projects];
                          next[idx] = {
                            ...proj,
                            techStack: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setData({ ...data, projects: next });
                        }}
                        placeholder="Tech stack (comma separated)"
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setData({
                      ...data,
                      projects: [
                        ...data.projects,
                        {
                          id: `proj-${Date.now()}`,
                          title: "New Project",
                          tagline: "Featured Build",
                          description: "Describe the problem solved, architecture, and impact.",
                          techStack: ["TypeScript", "Next.js"],
                          featured: false,
                        },
                      ],
                    })
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Project
                </button>
              </div>
            )}

            {activeTab === "experience" && (
              <div className="space-y-3">
                {data.experience.map((exp, idx) => (
                  <div
                    key={exp.id}
                    className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={exp.role}
                        onChange={(e) => {
                          const next = [...data.experience];
                          next[idx] = { ...exp, role: e.target.value };
                          setData({ ...data, experience: next });
                        }}
                        placeholder="Role"
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <input
                        value={exp.organization}
                        onChange={(e) => {
                          const next = [...data.experience];
                          next[idx] = { ...exp, organization: e.target.value };
                          setData({ ...data, experience: next });
                        }}
                        placeholder="Organization"
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                    </div>
                    <input
                      value={exp.period}
                      onChange={(e) => {
                        const next = [...data.experience];
                        next[idx] = { ...exp, period: e.target.value };
                        setData({ ...data, experience: next });
                      }}
                      placeholder="2024 — Present"
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                    />
                    <textarea
                      rows={2}
                      value={exp.highlights}
                      onChange={(e) => {
                        const next = [...data.experience];
                        next[idx] = { ...exp, highlights: e.target.value };
                        setData({ ...data, experience: next });
                      }}
                      placeholder="Key outcomes..."
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setData({
                      ...data,
                      experience: [
                        ...data.experience,
                        {
                          id: `exp-${Date.now()}`,
                          role: "Software Engineer",
                          organization: "Company / Lab",
                          period: "2025 — Present",
                          highlights: "Key deliverables and architecture.",
                        },
                      ],
                    })
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--fcs-border)] py-2 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Experience
                </button>
              </div>
            )}

            {activeTab === "design" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block font-semibold">Portfolio Template</label>
                  <div className="grid gap-2">
                    {PORTFOLIO_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setTemplateId(tpl.id);
                          setThemeMode(tpl.defaultTheme);
                          setAccentColor(tpl.defaultAccent);
                        }}
                        className={`rounded-xl border p-3 text-left transition ${
                          templateId === tpl.id
                            ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/30"
                            : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
                        }`}
                      >
                        <p className="font-bold">{tpl.name}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--fcs-ink-muted)]">
                          {tpl.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold">Public URL Slug</label>
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Theme &amp; Accent</label>
                    <div className="flex gap-2">
                      <select
                        value={themeMode}
                        onChange={(e) => setThemeMode(e.target.value as "light" | "dark" | "auto")}
                        className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                      </select>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-9 w-10 cursor-pointer rounded border border-[var(--fcs-border)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT LIVE PREVIEW */}
        <div className="lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--fcs-ink-muted)]">
              <Eye className="h-3.5 w-3.5" /> Live Portfolio Website Preview
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewViewport("desktop")}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  previewViewport === "desktop"
                    ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                    : "border-[var(--fcs-border)]"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport("mobile")}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  previewViewport === "mobile"
                    ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                    : "border-[var(--fcs-border)]"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
          </div>

          <div className="flex justify-center rounded-2xl border border-[var(--fcs-border)] bg-slate-200/60 p-4 dark:bg-slate-900/50">
            <div
              className={`w-full overflow-hidden rounded-2xl border transition-all ${
                previewViewport === "mobile" ? "max-w-[390px]" : "max-w-full"
              } ${
                isDarkPreview
                  ? "border-slate-800 bg-[#0B0F14] text-slate-100"
                  : "border-slate-200 bg-[#F8F7F4] text-slate-900"
              }`}
            >
              <div className="space-y-8 p-6 sm:p-8">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-4 text-xs">
                  <strong className="text-sm">{data.fullName}</strong>
                  <span className="opacity-70">Projects • Experience • Contact</span>
                </header>

                <section>
                  {data.availability && (
                    <span
                      className="inline-block rounded-full border border-current/15 px-3 py-1 text-[11px] font-semibold"
                      style={{ color: accentColor }}
                    >
                      {data.availability}
                    </span>
                  )}
                  <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                    {data.headline}
                  </h2>
                  <p className="mt-2.5 max-w-xl text-xs leading-relaxed opacity-75 sm:text-sm">
                    {data.bio}
                  </p>
                  <span
                    className="mt-4 inline-block rounded-lg px-4 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {data.ctaLabel || "Get in Touch"}
                  </span>
                </section>

                <section>
                  <p className="mb-3 text-xs font-bold tracking-wider uppercase opacity-60">
                    Selected Projects
                  </p>
                  <div
                    className={`grid gap-3 ${
                      previewViewport === "mobile" ? "grid-cols-1" : "sm:grid-cols-2"
                    }`}
                  >
                    {data.projects.map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-xl border p-4 ${
                          isDarkPreview
                            ? "border-slate-800 bg-[#111720]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <h3 className="text-sm font-bold">{p.title}</h3>
                        <p className="mt-1 text-xs opacity-75">{p.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {p.techStack.map((t) => (
                            <span
                              key={t}
                              className="rounded border border-current/15 px-1.5 py-0.5 text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {data.experience.length > 0 && (
                  <section>
                    <p className="mb-2 text-xs font-bold tracking-wider uppercase opacity-60">
                      Experience
                    </p>
                    <div className="space-y-2">
                      {data.experience.map((e) => (
                        <div
                          key={e.id}
                          className={`rounded-xl border p-3.5 text-xs ${
                            isDarkPreview
                              ? "border-slate-800 bg-[#111720]"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <strong>
                              {e.role} — {e.organization}
                            </strong>
                            <span className="opacity-60">{e.period}</span>
                          </div>
                          <p className="mt-1 opacity-75">{e.highlights}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-current/10 pt-4 text-[11px] opacity-65">
                  <span>
                    {data.location} • {data.email}
                  </span>
                  <span>Built with Francis Creator Studio</span>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
