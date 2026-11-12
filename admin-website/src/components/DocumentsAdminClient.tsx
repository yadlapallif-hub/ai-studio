"use client";

import React, { useState } from "react";
import { Check, EyeOff, FileText, FolderLock, Globe, MessageSquareQuote, PenLine, Trash2 } from "lucide-react";

interface ResumeItem {
  id: string;
  title: string;
  template_slug: string;
  target_role: string | null;
  ats_score: number | null;
  download_count: number;
  updated_at: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  template_slug: string;
  is_published: boolean;
  updated_at: string;
}

interface CoverLetterItem {
  id: string;
  title: string;
  company_name: string;
  target_role: string;
  writing_style: string;
  updated_at: string;
}

interface AssetItem {
  id: string;
  file_name: string;
  asset_type: string;
  file_size: number;
  created_at: string;
}

interface TestimonialItem {
  id: string;
  author_name: string;
  author_role: string;
  organization: string | null;
  quote: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
}

export function DocumentsAdminClient({
  initialResumes,
  initialPortfolios,
  initialCoverLetters,
  initialAssets,
  initialTestimonials,
  customerSiteUrl,
}: {
  initialResumes: ResumeItem[];
  initialPortfolios: PortfolioItem[];
  initialCoverLetters: CoverLetterItem[];
  initialAssets: AssetItem[];
  initialTestimonials: TestimonialItem[];
  customerSiteUrl: string;
}) {
  const [tab, setTab] = useState<"resumes" | "portfolios" | "cover_letters" | "assets" | "testimonials">("resumes");
  const [resumes, setResumes] = useState(initialResumes);
  const [portfolios, setPortfolios] = useState(initialPortfolios);
  const [coverLetters, setCoverLetters] = useState(initialCoverLetters);
  const [assets, setAssets] = useState(initialAssets);
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const q = search.trim().toLowerCase();

  const deleteRecord = async (table: string, id: string) => {
    const res = await fetch(`/api/admin/documents?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    if (table === "fcs_resumes") setResumes((p) => p.filter((x) => x.id !== id));
    if (table === "fcs_portfolios") setPortfolios((p) => p.filter((x) => x.id !== id));
    if (table === "fcs_cover_letters") setCoverLetters((p) => p.filter((x) => x.id !== id));
    if (table === "fcs_uploaded_assets") setAssets((p) => p.filter((x) => x.id !== id));
    if (table === "fcs_testimonials") setTestimonials((p) => p.filter((x) => x.id !== id));
    setMsg("Record deleted and audited.");
  };

  const toggleTestimonial = async (item: TestimonialItem) => {
    const res = await fetch("/api/admin/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "testimonial", id: item.id, is_approved: !item.is_approved }),
    });
    if (res.ok) {
      setTestimonials((p) =>
        p.map((x) => (x.id === item.id ? { ...x, is_approved: !item.is_approved } : x))
      );
      setMsg(item.is_approved ? "Testimonial hidden from homepage." : "Testimonial approved for homepage.");
    }
  };

  const togglePortfolioPublish = async (item: PortfolioItem) => {
    const res = await fetch("/api/admin/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "portfolio", id: item.id, is_published: !item.is_published }),
    });
    if (res.ok) {
      setPortfolios((p) =>
        p.map((x) => (x.id === item.id ? { ...x, is_published: !item.is_published } : x))
      );
      setMsg(item.is_published ? "Portfolio unpublished." : "Portfolio published.");
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {msg && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2.5 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-1.5 font-semibold">
          {[
            { id: "resumes", label: `Resumes (${resumes.length})`, icon: FileText },
            { id: "portfolios", label: `Portfolios (${portfolios.length})`, icon: Globe },
            { id: "cover_letters", label: `Cover Letters (${coverLetters.length})`, icon: PenLine },
            { id: "assets", label: `Vault Assets (${assets.length})`, icon: FolderLock },
            { id: "testimonials", label: `Testimonials (${testimonials.length})`, icon: MessageSquareQuote },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                tab === t.id ? "bg-teal-700 text-white" : "hover:bg-[var(--adm-surface-muted)]"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter records..."
          className="w-60 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface)] px-3 py-2 outline-none focus:border-teal-600"
        />
      </div>

      {tab === "resumes" && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <table className="w-full text-left">
            <thead className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] text-[11px] uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">ATS Score</th>
                <th className="px-4 py-3">Downloads</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--adm-border)]">
              {resumes
                .filter((r) => !q || r.title.toLowerCase().includes(q))
                .map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold">{r.title}</td>
                    <td className="px-4 py-3 font-mono">{r.template_slug}</td>
                    <td className="px-4 py-3">{r.ats_score ?? "—"}</td>
                    <td className="px-4 py-3">{r.download_count}</td>
                    <td className="px-4 py-3">{new Date(r.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void deleteRecord("fcs_resumes", r.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "portfolios" && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <table className="w-full text-left">
            <thead className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] text-[11px] uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--adm-border)]">
              {portfolios
                .filter((p) => !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
                .map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold">{p.title}</td>
                    <td className="px-4 py-3 font-mono">
                      {p.is_published ? (
                        <a
                          href={`${customerSiteUrl}/p/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 underline"
                        >
                          /p/{p.slug}
                        </a>
                      ) : (
                        `/p/${p.slug}`
                      )}
                    </td>
                    <td className="px-4 py-3">{p.template_slug}</td>
                    <td className="px-4 py-3">{p.is_published ? "Published" : "Draft"}</td>
                    <td className="flex justify-end gap-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void togglePortfolioPublish(p)}
                        className="rounded border border-[var(--adm-border)] px-2.5 py-1 font-semibold"
                      >
                        {p.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteRecord("fcs_portfolios", p.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "cover_letters" && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <table className="w-full text-left">
            <thead className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] text-[11px] uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Style</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--adm-border)]">
              {coverLetters
                .filter((c) => !q || c.title.toLowerCase().includes(q) || c.company_name.toLowerCase().includes(q))
                .map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-semibold">{c.title}</td>
                    <td className="px-4 py-3">{c.company_name}</td>
                    <td className="px-4 py-3">{c.target_role}</td>
                    <td className="px-4 py-3">{c.writing_style}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void deleteRecord("fcs_cover_letters", c.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "assets" && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <table className="w-full text-left">
            <thead className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] text-[11px] uppercase">
              <tr>
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--adm-border)]">
              {assets
                .filter((a) => !q || a.file_name.toLowerCase().includes(q))
                .map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-semibold">{a.file_name}</td>
                    <td className="px-4 py-3 uppercase">{a.asset_type}</td>
                    <td className="px-4 py-3">{(a.file_size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void deleteRecord("fcs_uploaded_assets", a.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "testimonials" && (
        <div className="grid gap-3 md:grid-cols-2">
          {testimonials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--adm-border)] p-8 text-center text-[var(--adm-ink-muted)] md:col-span-2">
              No community testimonials submitted yet.
            </div>
          ) : (
            testimonials.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">
                      {t.author_name} • {t.author_role}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        t.is_approved
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {t.is_approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-2 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                </div>
                <div className="mt-4 flex justify-end gap-2 border-t border-[var(--adm-border)] pt-3">
                  <button
                    type="button"
                    onClick={() => void toggleTestimonial(t)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-3 py-1 font-semibold"
                  >
                    {t.is_approved ? <EyeOff className="h-3 w-3" /> : <Check className="h-3 w-3 text-teal-600" />}
                    {t.is_approved ? "Hide" : "Approve & Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteRecord("fcs_testimonials", t.id)}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
