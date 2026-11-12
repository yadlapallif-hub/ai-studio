"use client";

import React, { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Film,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

export interface AdminTutorialRow {
  id: string;
  slug: string;
  episode_number: number;
  category: "getting_started" | "studios" | "ai_career" | "verification_admin";
  section_key: string;
  section_route: string;
  title_en: string;
  title_te: string;
  description_en: string;
  description_te: string;
  duration_seconds: number;
  video_url_en: string | null;
  video_url_te: string | null;
  thumbnail_url: string | null;
  subtitle_vtt_en: string | null;
  subtitle_vtt_te: string | null;
  transcript_en: string | null;
  transcript_te: string | null;
  is_published: boolean;
  sort_order: number;
}

const SECTION_OPTIONS = [
  { key: "home", route: "/", label: "Website Home / Overview" },
  { key: "resume_studio", route: "/resume-builder/new", label: "AI Resume Studio" },
  { key: "certificate_studio", route: "/certificate-builder/new", label: "Certificate Design Studio" },
  { key: "verify", route: "/verify", label: "QR Certificate Verification" },
  { key: "assistant", route: "/assistant", label: "Creator AI Assistant" },
  { key: "career_roadmap", route: "/assistant?tab=roadmap", label: "Career Roadmap & Interview Prep" },
  { key: "recommendations", route: "/dashboard?tab=overview", label: "AI Recommendations" },
  { key: "conversations", route: "/assistant", label: "Conversations & Chat Sessions" },
  { key: "support", route: "/support", label: "Live Support & Tickets" },
  { key: "authorized_orgs", route: "/stamps", label: "Authorized Organizations & Stamps" },
  { key: "document_vault", route: "/vault", label: "Document Vault" },
  { key: "admin_dashboard", route: "/admin", label: "Admin Dashboard" },
];

export function TutorialsAdminClient({
  initialTutorials,
  customerSiteUrl,
}: {
  initialTutorials: AdminTutorialRow[];
  customerSiteUrl: string;
}) {
  const [tutorials, setTutorials] = useState<AdminTutorialRow[]>(initialTutorials);
  const [selectedId, setSelectedId] = useState<string>(initialTutorials[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = tutorials.find((t) => t.id === selectedId) ?? null;

  const updateLocalField = <K extends keyof AdminTutorialRow>(
    id: string,
    key: K,
    value: AdminTutorialRow[K]
  ) => {
    setTutorials((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
  };

  const handleSave = async (row: AdminTutorialRow) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/tutorials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          patch: {
            slug: row.slug,
            episode_number: Number(row.episode_number),
            category: row.category,
            section_key: row.section_key,
            section_route: row.section_route,
            title_en: row.title_en,
            title_te: row.title_te,
            description_en: row.description_en,
            description_te: row.description_te,
            duration_seconds: Number(row.duration_seconds),
            video_url_en: row.video_url_en,
            video_url_te: row.video_url_te,
            thumbnail_url: row.thumbnail_url,
            subtitle_vtt_en: row.subtitle_vtt_en,
            subtitle_vtt_te: row.subtitle_vtt_te,
            transcript_en: row.transcript_en,
            transcript_te: row.transcript_te,
            is_published: row.is_published,
            sort_order: Number(row.sort_order),
          },
        }),
      });
      const json = (await res.json()) as { error?: string; tutorial?: AdminTutorialRow };
      if (!res.ok) throw new Error(json.error || "Failed to save tutorial");
      setStatusMsg(`Saved "${row.title_en}" successfully.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (row: AdminTutorialRow) => {
    const nextPub = !row.is_published;
    updateLocalField(row.id, "is_published", nextPub);
    await handleSave({ ...row, is_published: nextPub });
  };

  const handleMove = async (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= tutorials.length) return;
    const copy = [...tutorials];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    const reindexed = copy.map((t, i) => ({ ...t, sort_order: i + 1 }));
    setTutorials(reindexed);

    await fetch("/api/admin/tutorials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorder: reindexed.map((t) => ({ id: t.id, sort_order: t.sort_order })),
      }),
    });
    setStatusMsg("Tutorial order updated.");
  };

  const handleDelete = async (row: AdminTutorialRow) => {
    if (!confirm(`Delete tutorial "${row.title_en}"?`)) return;
    const res = await fetch("/api/admin/tutorials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    if (res.ok) {
      const remaining = tutorials.filter((t) => t.id !== row.id);
      setTutorials(remaining);
      setSelectedId(remaining[0]?.id ?? "");
      setStatusMsg("Tutorial deleted.");
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setStatusMsg(null);
    const nextNum = tutorials.length + 1;
    const slug = `tutorial-${nextNum}-${Date.now().toString().slice(-4)}`;
    try {
      const res = await fetch("/api/admin/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          episode_number: nextNum,
          category: "getting_started",
          section_key: "home",
          section_route: "/",
          title_en: `New Tutorial Episode ${nextNum}`,
          title_te: `కొత్త వీడియో ట్యుటోరియల్ ${nextNum}`,
          description_en: "Step-by-step walkthrough for this Creator Studio workflow.",
          description_te: "ఈ Creator Studio ఫీచర్ గురించి దశలవారీ మార్గదర్శి.",
          duration_seconds: 70,
          is_published: false,
          sort_order: nextNum,
        }),
      });
      const json = (await res.json()) as { tutorial?: AdminTutorialRow; error?: string };
      if (!res.ok || !json.tutorial) throw new Error(json.error || "Failed to create");
      setTutorials((prev) => [...prev, json.tutorial!]);
      setSelectedId(json.tutorial.id);
      setStatusMsg("Draft tutorial created. Add video URLs or upload files and publish.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleUploadAsset = async (
    row: AdminTutorialRow,
    field: "video_url_en" | "video_url_te" | "thumbnail_url" | "subtitle_vtt_en" | "subtitle_vtt_te",
    file: File
  ) => {
    setUploadingField(field);
    setStatusMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", row.slug);
      fd.append("kind", field);
      const res = await fetch("/api/admin/tutorials/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok || !json.publicUrl) throw new Error(json.error || "Upload failed");
      updateLocalField(row.id, field, json.publicUrl);
      setStatusMsg(`Uploaded ${file.name}. Click Save Changes to persist.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tutorial Videos Manager</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Manage bilingual EN/TE tutorial videos, thumbnails, WebVTT subtitles, section mappings,
            publishing status, and sequence order.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${customerSiteUrl}/tutorials`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[var(--adm-border)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--adm-surface-muted)]"
          >
            Preview Tutorials Center ↗
          </a>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Add Tutorial
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-600/30 bg-teal-50 px-4 py-2.5 text-xs font-medium text-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
          <Check className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left List + Reorder */}
        <div className="space-y-2 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 lg:col-span-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--adm-ink-muted)]">
            Episodes ({tutorials.length})
          </p>
          {tutorials.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs transition ${
                selectedId === item.id
                  ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/35"
                  : "border-[var(--adm-border)] hover:bg-[var(--adm-surface-muted)]"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-400">
                    #{String(item.episode_number).padStart(2, "0")}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      item.is_published
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                    }`}
                  >
                    {item.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 truncate font-semibold">{item.title_en}</p>
                <p className="truncate text-[11px] text-[var(--adm-ink-muted)]">{item.section_route}</p>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  title="Move up"
                  className="rounded border border-[var(--adm-border)] p-1 hover:bg-[var(--adm-surface-muted)] disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === tutorials.length - 1}
                  title="Move down"
                  className="rounded border border-[var(--adm-border)] p-1 hover:bg-[var(--adm-surface-muted)] disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Editor */}
        {selected && (
          <div className="space-y-4 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--adm-border)] pb-3">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-bold">
                  Editing Episode {selected.episode_number}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(selected)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--adm-surface-muted)]"
                >
                  {selected.is_published ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Publish
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selected)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(selected)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <label className="space-y-1">
                <span className="font-semibold">Episode #</span>
                <input
                  type="number"
                  value={selected.episode_number}
                  onChange={(e) =>
                    updateLocalField(selected.id, "episode_number", Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="font-semibold">Category</span>
                <select
                  value={selected.category}
                  onChange={(e) =>
                    updateLocalField(
                      selected.id,
                      "category",
                      e.target.value as AdminTutorialRow["category"]
                    )
                  }
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                >
                  <option value="getting_started">Getting Started</option>
                  <option value="studios">Studios &amp; Vault</option>
                  <option value="ai_career">AI &amp; Career</option>
                  <option value="verification_admin">Verification &amp; Admin</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-semibold">Assigned Website Section</span>
                <select
                  value={selected.section_key}
                  onChange={(e) => {
                    const match = SECTION_OPTIONS.find((s) => s.key === e.target.value);
                    updateLocalField(selected.id, "section_key", e.target.value);
                    if (match) updateLocalField(selected.id, "section_route", match.route);
                  }}
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                >
                  {SECTION_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-semibold">Section Route</span>
                <input
                  type="text"
                  value={selected.section_route}
                  onChange={(e) =>
                    updateLocalField(selected.id, "section_route", e.target.value)
                  }
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                />
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold">Title (English)</span>
                <input
                  type="text"
                  value={selected.title_en}
                  onChange={(e) => updateLocalField(selected.id, "title_en", e.target.value)}
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold">Title (తెలుగు)</span>
                <input
                  type="text"
                  value={selected.title_te}
                  onChange={(e) => updateLocalField(selected.id, "title_te", e.target.value)}
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold">Description (English)</span>
                <textarea
                  rows={2}
                  value={selected.description_en}
                  onChange={(e) =>
                    updateLocalField(selected.id, "description_en", e.target.value)
                  }
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold">Description (తెలుగు)</span>
                <textarea
                  rows={2}
                  value={selected.description_te}
                  onChange={(e) =>
                    updateLocalField(selected.id, "description_te", e.target.value)
                  }
                  className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-2"
                />
              </label>
            </div>

            {/* Media URLs & Uploads */}
            <div className="space-y-3 border-t border-[var(--adm-border)] pt-3 text-xs">
              <p className="font-bold uppercase tracking-wider text-[var(--adm-ink-muted)]">
                Videos, Thumbnail &amp; Subtitles
              </p>

              {(
                [
                  { field: "video_url_en", label: "English Video URL / MP4", accept: "video/*" },
                  { field: "video_url_te", label: "Telugu Video URL / MP4", accept: "video/*" },
                  { field: "thumbnail_url", label: "Thumbnail Image URL", accept: "image/*" },
                  { field: "subtitle_vtt_en", label: "English Subtitles (.vtt)", accept: ".vtt" },
                  { field: "subtitle_vtt_te", label: "Telugu Subtitles (.vtt)", accept: ".vtt" },
                ] as const
              ).map(({ field, label, accept }) => (
                <div key={field} className="flex flex-wrap items-center gap-2">
                  <label className="min-w-0 flex-1 space-y-1">
                    <span className="font-semibold">{label}</span>
                    <input
                      type="text"
                      value={selected[field] ?? ""}
                      onChange={(e) => updateLocalField(selected.id, field, e.target.value || null)}
                      className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] px-3 py-1.5 font-mono text-[11px]"
                    />
                  </label>
                  <label className="mt-5 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] px-3 py-1.5 font-semibold hover:bg-[var(--adm-surface-muted)]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingField === field ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept={accept}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadAsset(selected, field, f);
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
