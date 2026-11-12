"use client";

import React, { useMemo, useState } from "react";
import { Award, FileText, Layers, Search } from "lucide-react";

interface TemplateRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
}

interface CategoryRow {
  slug: string;
  label: string;
  description: string | null;
  is_active: boolean;
}

export function TemplatesClient({
  initialResumeTemplates,
  initialCertTemplates,
  initialCategories = [],
}: {
  initialResumeTemplates: TemplateRow[];
  initialCertTemplates: TemplateRow[];
  initialCategories?: CategoryRow[];
}) {
  const [resumes, setResumes] = useState(initialResumeTemplates);
  const [certs, setCerts] = useState(initialCertTemplates);
  const [cats, setCats] = useState<CategoryRow[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of resumes) set.add(r.category);
    for (const c of certs) set.add(c.category);
    return ["all", ...Array.from(set).sort()];
  }, [resumes, certs]);

  const filteredResumes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resumes.filter(
      (tpl) =>
        (categoryFilter === "all" || tpl.category === categoryFilter) &&
        (!q ||
          tpl.name.toLowerCase().includes(q) ||
          tpl.slug.toLowerCase().includes(q) ||
          tpl.category.toLowerCase().includes(q))
    );
  }, [resumes, search, categoryFilter]);

  const filteredCerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return certs.filter(
      (tpl) =>
        (categoryFilter === "all" || tpl.category === categoryFilter) &&
        (!q ||
          tpl.name.toLowerCase().includes(q) ||
          tpl.slug.toLowerCase().includes(q) ||
          tpl.category.toLowerCase().includes(q))
    );
  }, [certs, search, categoryFilter]);

  const toggleActive = async (
    table: "fcs_resume_templates" | "fcs_certificate_templates",
    item: TemplateRow
  ) => {
    const next = !item.is_active;
    await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id: item.id, patch: { is_active: next } }),
    });
    if (table === "fcs_resume_templates") {
      setResumes((prev) => prev.map((r) => (r.id === item.id ? { ...r, is_active: next } : r)));
    } else {
      setCerts((prev) => prev.map((c) => (c.id === item.id ? { ...c, is_active: next } : c)));
    }
  };

  const toggleCategory = async (cat: CategoryRow) => {
    const next = !cat.is_active;
    await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "fcs_template_categories",
        id: cat.slug,
        patch: { is_active: next },
      }),
    });
    setCats((prev) => prev.map((c) => (c.slug === cat.slug ? { ...c, is_active: next } : c)));
  };

  return (
    <div className="space-y-4">
      {cats.length > 0 && (
        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Layers className="h-4 w-4 text-teal-600" />
            Certificate Category Governance ({cats.filter((c) => c.is_active).length} / {cats.length} active)
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cats.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => void toggleCategory(cat)}
                title={cat.description || cat.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  cat.is_active
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-[var(--adm-border)] bg-[var(--adm-surface-muted)] text-[var(--adm-ink-muted)] line-through"
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] uppercase">
                  {cat.is_active ? "Active" : "Hidden"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 text-xs">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resume & certificate templates..."
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2 pr-3 pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Categories" : c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <FileText className="h-4 w-4 text-teal-600" />
            Resume Templates ({filteredResumes.length} / {resumes.length})
          </h2>
          <ul className="mt-4 max-h-[640px] space-y-2.5 overflow-y-auto pr-1 text-xs">
            {filteredResumes.map((tpl) => (
              <li
                key={tpl.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{tpl.name}</p>
                  <p className="truncate text-[11px] text-[var(--adm-ink-muted)]">
                    {tpl.category} • {tpl.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleActive("fcs_resume_templates", tpl)}
                  className={`shrink-0 rounded-lg px-3 py-1 font-semibold ${
                    tpl.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tpl.is_active ? "Published" : "Hidden"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Award className="h-4 w-4 text-amber-600" />
            Certificate Templates ({filteredCerts.length} / {certs.length})
          </h2>
          <ul className="mt-4 max-h-[640px] space-y-2.5 overflow-y-auto pr-1 text-xs">
            {filteredCerts.map((tpl) => (
              <li
                key={tpl.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{tpl.name}</p>
                  <p className="truncate text-[11px] text-[var(--adm-ink-muted)]">
                    {tpl.category} • {tpl.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleActive("fcs_certificate_templates", tpl)}
                  className={`shrink-0 rounded-lg px-3 py-1 font-semibold ${
                    tpl.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tpl.is_active ? "Published" : "Hidden"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
