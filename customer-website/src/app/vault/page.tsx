"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Edit3,
  Eye,
  FileText,
  FolderLock,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VaultAsset {
  id: string;
  asset_type: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  is_sample_decorative: boolean;
  created_at: string;
}

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "largest" | "name">("newest");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<{ url: string; asset: VaultAsset } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setAssets([]);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("fcs_uploaded_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setAssets((data as VaultAsset[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssets();
  }, []);

  const totalBytes = useMemo(
    () => assets.reduce((acc, item) => acc + (item.file_size || 0), 0),
    [assets]
  );

  const filtered = useMemo(() => {
    return assets
      .filter((a) => (typeFilter === "all" ? true : a.asset_type === typeFilter))
      .filter((a) => a.file_name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
        if (sortBy === "largest") return b.file_size - a.file_size;
        if (sortBy === "name") return a.file_name.localeCompare(b.file_name);
        return b.created_at.localeCompare(a.created_at);
      });
  }, [assets, typeFilter, search, sortBy]);

  const getSignedUrl = async (asset: VaultAsset): Promise<string | null> => {
    const res = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket: asset.storage_bucket,
        path: asset.storage_path,
      }),
    });
    const json = (await res.json()) as { signedUrl?: string };
    return json.signedUrl || null;
  };

  const handlePreview = async (asset: VaultAsset) => {
    const url = await getSignedUrl(asset);
    if (url) setPreviewUrl({ url, asset });
  };

  const handleDownload = async (asset: VaultAsset) => {
    const url = await getSignedUrl(asset);
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = asset.file_name;
    link.target = "_blank";
    link.click();
  };

  const handleUpload = async (file: File) => {
    if (!userId) return;
    if (file.size > 10 * 1024 * 1024) {
      setMsg("Maximum file size is 10 MB.");
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const path = `${userId}/vault/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("fcs-vault").upload(path, file);
      if (upErr) {
        setMsg(upErr.message);
        return;
      }
      await supabase.from("fcs_uploaded_assets").insert({
        user_id: userId,
        asset_type: "other",
        file_name: file.name,
        storage_bucket: "fcs-vault",
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
      });
      await loadAssets();
      setMsg("File encrypted & stored in private Document Vault.");
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (asset: VaultAsset) => {
    if (!renameValue.trim() || !userId) return;
    const supabase = createClient();
    await supabase
      .from("fcs_uploaded_assets")
      .update({ file_name: renameValue.trim() })
      .eq("id", asset.id)
      .eq("user_id", userId);
    setRenamingId(null);
    await loadAssets();
  };

  const handleDelete = async (asset: VaultAsset) => {
    if (!userId) return;
    const supabase = createClient();
    await supabase.storage.from(asset.storage_bucket).remove([asset.storage_path]);
    await supabase
      .from("fcs_uploaded_assets")
      .delete()
      .eq("id", asset.id)
      .eq("user_id", userId);
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <FolderLock className="mx-auto h-10 w-10 text-teal-600" />
        <h1 className="mt-4 text-2xl font-bold">Private Document Vault</h1>
        <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
          Sign in to securely store and access your uploaded photos, seals, logos, and exported PDF
          or PNG credentials with private signed URLs.
        </p>
        <Link
          href="/auth/login?redirect=/vault"
          className="mt-6 inline-block rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Sign In to Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Encrypted Private Storage
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Document Vault</h1>
          <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
            {assets.length} files • {(totalBytes / (1024 * 1024)).toFixed(2)} MB used • Access
            protected by short-lived signed URLs.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload File
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
        </label>
      </div>

      {msg && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2.5 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {msg}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
        >
          <option value="all">All Asset Types</option>
          <option value="profile_photo">Profile Photos</option>
          <option value="organization_logo">Logos</option>
          <option value="stamp">Stamps</option>
          <option value="seal">Seals</option>
          <option value="signature">Signatures</option>
          <option value="exported_pdf">Exported PDFs</option>
          <option value="exported_png">Exported PNGs</option>
          <option value="other">Other Files</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as never)}
          className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="largest">Largest First</option>
          <option value="name">Filename A–Z</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-12 text-center text-sm text-[var(--fcs-ink-muted)]">
          No matching files in your vault yet. Upload an asset or archive an exported Resume or
          Certificate.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="flex flex-col justify-between rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4"
            >
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="rounded bg-[var(--fcs-surface-muted)] px-2 py-0.5 font-semibold uppercase">
                    {asset.asset_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[var(--fcs-ink-muted)]">
                    {(asset.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>

                {renamingId === asset.id ? (
                  <div className="mt-3 flex gap-1.5">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 rounded-lg border border-[var(--fcs-border)] px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void handleRename(asset)}
                      className="rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <h3 className="mt-3 flex items-center gap-2 truncate text-sm font-bold">
                    <FileText className="h-4 w-4 shrink-0 text-teal-600" />
                    <span className="truncate">{asset.file_name}</span>
                  </h3>
                )}

                <p className="mt-1 text-[11px] text-[var(--fcs-ink-muted)]">
                  {new Date(asset.created_at).toLocaleString()}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 border-t border-[var(--fcs-border)] pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => void handlePreview(asset)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--fcs-border)] py-1.5 font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(asset)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--fcs-border)] py-1.5 font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  <Download className="h-3.5 w-3.5" /> Get
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(asset.id);
                    setRenameValue(asset.file_name);
                  }}
                  title="Rename"
                  className="rounded-lg border border-[var(--fcs-border)] p-1.5 hover:bg-[var(--fcs-surface-muted)]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(asset)}
                  title="Delete"
                  className="rounded-lg border border-[var(--fcs-border)] p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signed Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">{previewUrl.asset.file_name}</p>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="rounded-lg border border-[var(--fcs-border)] px-3 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            {previewUrl.asset.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl.url}
                alt={previewUrl.asset.file_name}
                className="mx-auto max-h-[70vh] rounded-xl object-contain"
              />
            ) : (
              <iframe
                src={previewUrl.url}
                title={previewUrl.asset.file_name}
                className="h-[70vh] w-full rounded-xl border border-[var(--fcs-border)]"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
