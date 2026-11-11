"use client";

import React, { useMemo, useState } from "react";
import { Ban, CheckCircle2, Copy, KeyRound, Search, Shield, Trash2 } from "lucide-react";
import { STAFF_ROLES, formatRoleLabel, type AppRole } from "@francis/shared";

interface UserRow {
  id: string;
  email: string | null;
  phone?: string | null;
  full_name: string | null;
  headline: string | null;
  status: string;
  created_at: string;
  roles: string[];
  resumeCount: number;
  certCount: number;
  ticketCount: number;
}

export function UsersClient({
  initialUsers,
  isSuperAdmin,
  isAdmin,
  currentAdminId,
}: {
  initialUsers: UserRow[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  currentAdminId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ email: string; url: string } | null>(null);

  const generateRecoveryLink = async (user: UserRow) => {
    setFeedback(null);
    setGeneratedLink(null);
    const res = await fetch("/api/admin/users/recovery-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, kind: "recovery" }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      link?: string;
      email?: string;
      error?: string;
    };
    if (!res.ok || !json.link) {
      setFeedback(json.error || "Failed generating recovery link.");
      return;
    }
    setGeneratedLink({ email: json.email || user.email || "user", url: json.link });
    setFeedback(
      `Generated zero-rate-limit cross-device reset link for ${json.email || user.email}.`
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (statusFilter === "all" ? true : u.status === statusFilter))
      .filter(
        (u) =>
          !q ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.phone || "").toLowerCase().includes(q) ||
          (u.full_name || "").toLowerCase().includes(q)
      );
  }, [users, search, statusFilter]);

  const toggleStatus = async (user: UserRow) => {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, status: nextStatus }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Failed updating status.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    setFeedback(`User ${user.email || user.phone || user.id} is now ${nextStatus}.`);
  };

  const saveRoles = async (userId: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roles: roleDraft }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Failed updating roles.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roles: roleDraft } : u)));
    setEditingRolesFor(null);
    setFeedback("User roles updated.");
  };

  const deleteUser = async (user: UserRow) => {
    const label = user.email || user.phone || user.id;
    if (!window.confirm(`Permanently delete user ${label}?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Delete failed.");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setFeedback(`Deleted ${label}.`);
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {feedback}
        </div>
      )}

      {generatedLink && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Direct Cross-Device Reset Link for {generatedLink.email} (bypasses email rate limit):
            </p>
            <p className="mt-1 truncate font-mono text-[11px] opacity-85">{generatedLink.url}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(generatedLink.url);
              setFeedback(`Copied reset link for ${generatedLink.email} to clipboard.`);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, phone, or name..."
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2 pr-3 pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] text-[var(--adm-ink-muted)]">
              <th className="p-3">User</th>
              <th className="p-3">Roles &amp; Admin Access</th>
              <th className="p-3">Docs / Tickets</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const targetIsStaff = u.roles.some((r) =>
                STAFF_ROLES.includes(r as AppRole)
              );
              const canToggleStatus =
                u.id !== currentAdminId &&
                (isSuperAdmin ||
                  (isAdmin && !u.roles.includes("super_admin")) ||
                  !targetIsStaff);

              return (
                <tr key={u.id} className="border-b border-[var(--adm-border)]/60">
                  <td className="p-3">
                    <p className="font-bold">{u.full_name || "Unnamed User"}</p>
                    <p className="text-[11px] text-[var(--adm-ink-muted)]">
                      {u.email || u.phone || "No email/phone"}
                    </p>
                  </td>
                  <td className="p-3">
                    {editingRolesFor === u.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {["super_admin", "admin", "support_agent", "content_manager", "customer"].map(
                            (role) => (
                              <label key={role} className="inline-flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={roleDraft.includes(role)}
                                  onChange={(e) =>
                                    setRoleDraft((prev) =>
                                      e.target.checked
                                        ? [...prev, role]
                                        : prev.filter((r) => r !== role)
                                    )
                                  }
                                />
                                <span>{formatRoleLabel(role)}</span>
                              </label>
                            )
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void saveRoles(u.id)}
                          className="cursor-pointer rounded bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          Save Roles
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              r === "customer"
                                ? "bg-[var(--adm-surface-muted)] text-[var(--adm-ink-muted)]"
                                : "bg-teal-700/15 text-teal-700 dark:text-teal-300"
                            }`}
                          >
                            {formatRoleLabel(r)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-[var(--adm-ink-muted)]">
                    {u.resumeCount}R • {u.certCount}C • {u.ticketCount}T
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.status === "suspended"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                    {(isSuperAdmin || (isAdmin && !u.roles.includes("super_admin"))) && u.email && (
                      <button
                        type="button"
                        onClick={() => void generateRecoveryLink(u)}
                        title="Generate Direct Cross-Device Password Reset Link"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2 py-1 font-medium"
                      >
                        <KeyRound className="h-3 w-3 text-amber-600" /> Reset Link
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRolesFor(editingRolesFor === u.id ? null : u.id);
                          setRoleDraft(u.roles);
                        }}
                        title="Manage Roles"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2 py-1 font-medium"
                      >
                        <Shield className="h-3 w-3" /> Roles
                      </button>
                    )}
                    {canToggleStatus && (
                      <button
                        type="button"
                        onClick={() => void toggleStatus(u)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2 py-1 font-medium"
                      >
                        {u.status === "suspended" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Reactivate
                          </>
                        ) : (
                          <>
                            <Ban className="h-3 w-3 text-amber-600" /> Suspend
                          </>
                        )}
                      </button>
                    )}
                    {isSuperAdmin && u.id !== currentAdminId && (
                      <button
                        type="button"
                        onClick={() => void deleteUser(u)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2 py-1 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
