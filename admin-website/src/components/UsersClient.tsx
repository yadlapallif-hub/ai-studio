"use client";

import React, { useMemo, useState } from "react";
import { Ban, CheckCircle2, Search, Shield, Trash2 } from "lucide-react";

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
  currentAdminId,
}: {
  initialUsers: UserRow[];
  isSuperAdmin: boolean;
  currentAdminId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

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
              <th className="p-3">Roles</th>
              <th className="p-3">Docs / Tickets</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
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
                              <span>{role}</span>
                            </label>
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void saveRoles(u.id)}
                        className="rounded bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white"
                      >
                        Save Roles
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className="rounded bg-[var(--adm-surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                        >
                          {r.replace(/_/g, " ")}
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
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRolesFor(editingRolesFor === u.id ? null : u.id);
                        setRoleDraft(u.roles);
                      }}
                      title="Manage Roles"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2 py-1 font-medium"
                    >
                      <Shield className="h-3 w-3" /> Roles
                    </button>
                  )}
                  {u.id !== currentAdminId && (
                    <button
                      type="button"
                      onClick={() => void toggleStatus(u)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2 py-1 font-medium"
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
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2 py-1 text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
