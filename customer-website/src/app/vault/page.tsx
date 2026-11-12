"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  Download,
  Edit3,
  Eye,
  FileText,
  Folder,
  FolderLock,
  FolderPlus,
  History,
  Loader2,
  Search,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WatchTutorialButton } from "@/components/tutorials/WatchTutorialButton";

interface VaultFolder {
  id: string;
  name: string;
  color: string | null;
}

interface VaultAsset {
  id: string;
  asset_type: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  folder_id: string | null;
  tags: string[] | null;
  current_version: number | null;
  is_sample_decorative: boolean;
  created_at: string;
}

interface AssetVersionRow {
  id: string;
  version_number: number;
  label: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  file_size: number | null;
  created_at: string;
}

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "largest" | "name">("newest");
  const [uploading, setUploading] = useState(false);

  const [previewState, setPreviewState] = useState<{
    url: string;
    asset: VaultAsset;
    textPreview?: string;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [tagDraftId, setTagDraftId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [versionAsset, setVersionAsset] = useState<VaultAsset | null>(null);
  const [versions, setVersions] = useState<AssetVersionRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAssetsAndFolders = async () => {
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
      const [{ data: assetRows }, foldersRes] = await Promise.all([
        supabase
          .from("fcs_uploaded_assets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        fetch("/api/vault/folders"),
      ]);
      setAssets((assetRows as VaultAsset[]) ?? []);
      if (foldersRes.ok) {
        const fj = (await foldersRes.json()) as { folders?: VaultFolder[] };
        setFolders(fj.folders ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssetsAndFolders();
  }, []);

  const totalBytes = useMemo(
    () => assets.reduce((acc, item) => acc + (item.file_size || 0), 0),
    [assets]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets
      .filter((a) =>
        selectedFolderId === "all"
          ? true
          : selectedFolderId === "unfiled"
            ? !a.folder_id
            : a.folder_id === selectedFolderId
      )
      .filter((a) => (typeFilter === "all" ? true : a.asset_type === typeFilter))
      .filter(
        (a) =>
          !q ||
          a.file_name.toLowerCase().includes(q) ||
          (a.tags || []).some((t) => t.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
        if (sortBy === "largest") return b.file_size - a.file_size;
        if (sortBy === "name") return a.file_name.localeCompare(b.file_name);
        return b.created_at.localeCompare(a.created_at);
      });
  }, [assets, selectedFolderId, typeFilter, search, sortBy]);

  const getSignedUrl = async (bucket: string, path: string): Promise<string | null> => {
    const res = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, path }),
    });
    const json = (await res.json()) as { signedUrl?: string };
    return json.signedUrl || null;
  };

  const handlePreview = async (asset: VaultAsset) => {
    const url = await getSignedUrl(asset.storage_bucket, asset.storage_path);
    if (!url) return;
    if (
      asset.mime_type.startsWith("text/") ||
      /\.(txt|md)$/i.test(asset.file_name)
    ) {
      try {
        const res = await fetch(url);
        const txt = await res.text();
        setPreviewState({ url, asset, textPreview: txt.slice(0, 20000) });
        return;
      } catch {
        // fall through
      }
    }
    setPreviewState({ url, asset });
  };

  const handleDownload = async (bucket: string, path: string, fileName: string) => {
    const url = await getSignedUrl(bucket, path);
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.click();
  };

  const handleUpload = async (file: File) => {
    if (!userId) return;
    if (file.size > 15 * 1024 * 1024) {
      setMsg("Maximum file size is 15 MB.");
      return;
    }
    const allowedExt = /\.(pdf|docx|txt|md|png|jpg|jpeg|webp)$/i.test(file.name);
    if (!allowedExt) {
      setMsg("Supported file types: PDF, DOCX, TXT, PNG, JPG, JPEG.");
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
      const assetType = /\.(pdf|docx|txt|md)$/i.test(file.name) ? "document" : "other";
      const { data: inserted } = await supabase
        .from("fcs_uploaded_assets")
        .insert({
          user_id: userId,
          asset_type: assetType,
          file_name: file.name,
          storage_bucket: "fcs-vault",
          storage_path: path,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
          folder_id:
            selectedFolderId !== "all" && selectedFolderId !== "unfiled"
              ? selectedFolderId
              : null,
          current_version: 1,
        })
        .select("id")
        .single();

      if (inserted?.id) {
        await fetch("/api/vault/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: inserted.id,
            label: "Initial Upload (v1)",
            storageBucket: "fcs-vault",
            storagePath: path,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        });
      }

      await loadAssetsAndFolders();
      setMsg("File encrypted & stored in private Document Vault.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadNewVersion = async (asset: VaultAsset, file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/vault/v-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("fcs-vault").upload(path, file);
      if (upErr) {
        setMsg(upErr.message);
        return;
      }
      const nextVer = (asset.current_version ?? 1) + 1;
      await supabase
        .from("fcs_uploaded_assets")
        .update({
          storage_path: path,
          mime_type: file.type || asset.mime_type,
          file_size: file.size,
          current_version: nextVer,
        })
        .eq("id", asset.id)
        .eq("user_id", userId);

      await fetch("/api/vault/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          label: `Updated Version v${nextVer}`,
          storageBucket: "fcs-vault",
          storagePath: path,
          mimeType: file.type || asset.mime_type,
          fileSize: file.size,
        }),
      });
      await openVersionsDrawer(asset);
      await loadAssetsAndFolders();
      setMsg(`Uploaded version v${nextVer} for "${asset.file_name}".`);
    } finally {
      setUploading(false);
    }
  };

  const openVersionsDrawer = async (asset: VaultAsset) => {
    setVersionAsset(asset);
    const res = await fetch(`/api/vault/versions?assetId=${encodeURIComponent(asset.id)}`);
    if (res.ok) {
      const json = (await res.json()) as { versions?: AssetVersionRow[] };
      setVersions(json.versions ?? []);
    }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/vault/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    if (res.ok) {
      setNewFolderName("");
      await loadAssetsAndFolders();
    }
  };

  const deleteFolder = async (id: string) => {
    const res = await fetch(`/api/vault/folders?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (selectedFolderId === id) setSelectedFolderId("all");
      await loadAssetsAndFolders();
    }
  };

  const assignFolder = async (assetId: string, folderId: string | null) => {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("fcs_uploaded_assets")
      .update({ folder_id: folderId })
      .eq("id", assetId)
      .eq("user_id", userId);
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, folder_id: folderId } : a))
    );
  };

  const addTagToAsset = async (asset: VaultAsset) => {
    const clean = tagInput.trim().toLowerCase();
    if (!clean || !userId) return;
    const nextTags = Array.from(new Set([...(asset.tags || []), clean]));
    const supabase = createClient();
    await supabase
      .from("fcs_uploaded_assets")
      .update({ tags: nextTags })
      .eq("id", asset.id)
      .eq("user_id", userId);
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, tags: nextTags } : a)));
    setTagInput("");
    setTagDraftId(null);
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
    await loadAssetsAndFolders();
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
          Sign in to store PDF, DOCX, TXT, PNG, JPG &amp; JPEG documents with folders, tags,
          version history, and short-lived signed URLs.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <SafeNavLink
            href="/auth/login?redirect=/vault"
            className="inline-block rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Sign In to Vault
          </SafeNavLink>
          <WatchTutorialButton sectionKey="document_vault" label="Watch Vault Tutorial" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Encrypted Private Storage • Folders &amp; Versions
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Document Vault</h1>
          <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
            {assets.length} files • {(totalBytes / (1024 * 1024)).toFixed(2)} MB used • Supports
            PDF, DOCX, TXT, PNG, JPG, JPEG.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <WatchTutorialButton sectionKey="document_vault" label="Watch Tutorial" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Document
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
          </label>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2.5 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Folders Sidebar */}
        <aside className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs lg:col-span-3">
          <p className="font-bold tracking-wider uppercase text-[var(--fcs-ink-muted)]">Folders</p>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => setSelectedFolderId("all")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium ${
                  selectedFolderId === "all"
                    ? "bg-teal-700 text-white"
                    : "hover:bg-[var(--fcs-surface-muted)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5" /> All Files
                </span>
                <span>{assets.length}</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setSelectedFolderId("unfiled")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium ${
                  selectedFolderId === "unfiled"
                    ? "bg-teal-700 text-white"
                    : "hover:bg-[var(--fcs-surface-muted)]"
                }`}
              >
                <span>Unfiled</span>
                <span>{assets.filter((a) => !a.folder_id).length}</span>
              </button>
            </li>
            {folders.map((folder) => (
              <li key={folder.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 font-medium ${
                    selectedFolderId === folder.id
                      ? "bg-teal-700 text-white"
                      : "hover:bg-[var(--fcs-surface-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <span>{assets.filter((a) => a.folder_id === folder.id).length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteFolder(folder.id)}
                  title="Delete folder"
                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={createFolder} className="flex gap-1.5 border-t border-[var(--fcs-border)] pt-3">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="min-w-0 flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
            />
            <button
              type="submit"
              title="Create folder"
              className="rounded-lg bg-teal-700 p-2 text-white hover:bg-teal-800"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </form>
        </aside>

        {/* Main Asset Grid */}
        <div className="space-y-4 lg:col-span-9">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search filenames or #tags..."
                className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
            >
              <option value="all">All Asset Types</option>
              <option value="document">Documents (PDF / DOCX / TXT)</option>
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
              No matching files in this folder yet. Upload a document or move an existing file.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  className="flex flex-col justify-between rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="rounded bg-[var(--fcs-surface-muted)] px-2 py-0.5 font-semibold uppercase">
                        {asset.asset_type.replace(/_/g, " ")} • v{asset.current_version ?? 1}
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

                    {/* Folder selector & Tags */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <select
                        value={asset.folder_id ?? ""}
                        onChange={(e) => void assignFolder(asset.id, e.target.value || null)}
                        className="rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-1.5 py-0.5 text-[10px]"
                      >
                        <option value="">No Folder</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>

                      {(asset.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                        >
                          #{tag}
                        </span>
                      ))}

                      {tagDraftId === asset.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            placeholder="tag"
                            className="w-16 rounded border border-[var(--fcs-border)] px-1.5 py-0.5 text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={() => void addTagToAsset(asset)}
                            className="text-[10px] font-bold text-teal-700"
                          >
                            +
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTagDraftId(asset.id);
                            setTagInput("");
                          }}
                          className="inline-flex items-center gap-0.5 text-[10px] text-[var(--fcs-ink-muted)] hover:text-teal-700"
                        >
                          <Tag className="h-2.5 w-2.5" /> Add tag
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[var(--fcs-border)] pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => void handlePreview(asset)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--fcs-border)] py-1.5 font-medium hover:bg-[var(--fcs-surface-muted)]"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownload(
                          asset.storage_bucket,
                          asset.storage_path,
                          asset.file_name
                        )
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--fcs-border)] py-1.5 font-medium hover:bg-[var(--fcs-surface-muted)]"
                    >
                      <Download className="h-3.5 w-3.5" /> Get
                    </button>
                    <button
                      type="button"
                      onClick={() => void openVersionsDrawer(asset)}
                      title="Version History"
                      className="rounded-lg border border-[var(--fcs-border)] p-1.5 hover:bg-[var(--fcs-surface-muted)]"
                    >
                      <History className="h-3.5 w-3.5" />
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
        </div>
      </div>

      {/* Signed Preview Modal */}
      {previewState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setPreviewState(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">{previewState.asset.file_name}</p>
              <button
                type="button"
                onClick={() => setPreviewState(null)}
                className="rounded-lg border border-[var(--fcs-border)] px-3 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            {previewState.asset.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewState.url}
                alt={previewState.asset.file_name}
                className="mx-auto max-h-[70vh] rounded-xl object-contain"
              />
            ) : previewState.textPreview !== undefined ? (
              <pre className="max-h-[70vh] overflow-auto rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 text-xs whitespace-pre-wrap">
                {previewState.textPreview}
              </pre>
            ) : /\.docx$/i.test(previewState.asset.file_name) ? (
              <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-8 text-center text-xs">
                <p className="font-semibold">Microsoft Word Document (.DOCX)</p>
                <p className="mt-1 text-[var(--fcs-ink-muted)]">
                  Download this file to inspect or edit in Word / LibreOffice, or import it into
                  Cover Letter Studio.
                </p>
                <a
                  href={previewState.url}
                  download={previewState.asset.file_name}
                  className="mt-4 inline-block rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white"
                >
                  Download DOCX
                </a>
              </div>
            ) : (
              <iframe
                src={previewState.url}
                title={previewState.asset.file_name}
                className="h-[70vh] w-full rounded-xl border border-[var(--fcs-border)]"
              />
            )}
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {versionAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setVersionAsset(null)}
        >
          <div
            className="w-full max-w-lg space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Version History — {versionAsset.file_name}</p>
              <button
                type="button"
                onClick={() => setVersionAsset(null)}
                className="rounded-lg border border-[var(--fcs-border)] px-2.5 py-1 font-semibold"
              >
                Close
              </button>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 font-semibold text-white">
              <Upload className="h-3.5 w-3.5" /> Upload New Version
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadNewVersion(versionAsset, f);
                }}
              />
            </label>

            {versions.length === 0 ? (
              <p className="py-4 text-center text-[var(--fcs-ink-muted)]">
                Version 1 (Current) stored on upload. Upload a newer revision above to track
                multi-version snapshots.
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                  >
                    <div>
                      <p className="font-bold">
                        v{v.version_number} {v.label ? `• ${v.label}` : ""}
                      </p>
                      <p className="text-[10px] text-[var(--fcs-ink-muted)]">
                        {new Date(v.created_at).toLocaleString()}
                        {v.file_size ? ` • ${(v.file_size / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                    {v.storage_bucket && v.storage_path && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleDownload(
                            v.storage_bucket!,
                            v.storage_path!,
                            `v${v.version_number}-${versionAsset.file_name}`
                          )
                        }
                        className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
                      >
                        Download
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
