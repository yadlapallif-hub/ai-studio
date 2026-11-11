"use client";

import React, { useState } from "react";
import { Award, FileText } from "lucide-react";

interface TemplateRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
}

export function TemplatesClient({
  initialResumeTemplates,
  initialCertTemplates,
}: {
  initialResumeTemplates: TemplateRow[];
  initialCertTemplates: TemplateRow[];
}) {
  const [resumes, setResumes] = useState(initialResumeTemplates);
  const [certs, setCerts] = useState(initialCertTemplates);

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <FileText className="h-4 w-4 text-teal-600" />
          Resume Templates ({resumes.length})
        </h2>
        <ul className="mt-4 space-y-2.5 text-xs">
          {resumes.map((tpl) => (
            <li
              key={tpl.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
            >
              <div>
                <p className="font-bold">{tpl.name}</p>
                <p className="text-[11px] text-[var(--adm-ink-muted)]">
                  {tpl.category} • {tpl.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleActive("fcs_resume_templates", tpl)}
                className={`rounded-lg px-3 py-1 font-semibold ${
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
          Certificate Templates ({certs.length})
        </h2>
        <ul className="mt-4 space-y-2.5 text-xs">
          {certs.map((tpl) => (
            <li
              key={tpl.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
            >
              <div>
                <p className="font-bold">{tpl.name}</p>
                <p className="text-[11px] text-[var(--adm-ink-muted)]">
                  {tpl.category} • {tpl.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleActive("fcs_certificate_templates", tpl)}
                className={`rounded-lg px-3 py-1 font-semibold ${
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
  );
}
