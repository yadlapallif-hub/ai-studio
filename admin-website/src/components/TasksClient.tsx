"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Plus, Trash2 } from "lucide-react";
import { formatRoleLabel } from "@francis/shared";

interface StaffMemberOption {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface StaffTaskItem {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  target_role: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "done" | "blocked";
  due_date: string | null;
  completion_note: string;
  created_at: string;
}

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const STATUS_BADGE: Record<string, string> = {
  todo: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

export function TasksClient({
  initialTasks,
  assignableStaff,
  staffLookup,
  canAssignTasks,
  currentAdminId,
}: {
  initialTasks: StaffTaskItem[];
  assignableStaff: StaffMemberOption[];
  staffLookup: Record<string, { name: string; email: string }>;
  canAssignTasks: boolean;
  currentAdminId: string;
}) {
  const [tasks, setTasks] = useState<StaffTaskItem[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState(assignableStaff[0]?.id || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!assignedTo) {
      setFeedback("No eligible lower-level staff member available. Assign a role in Users & Roles first.");
      return;
    }
    setSaving(true);
    try {
      const selectedStaff = assignableStaff.find((s) => s.id === assignedTo);
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          assignedTo,
          targetRole: selectedStaff?.roles[0],
          priority,
          dueDate: dueDate || null,
        }),
      });
      const json = (await res.json()) as { task?: StaffTaskItem; error?: string };
      if (!res.ok || !json.task) {
        setFeedback(json.error || "Failed assigning task.");
        return;
      }
      setTasks((prev) => [json.task!, ...prev]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setFeedback(`Assigned "${json.task.title}" to ${selectedStaff?.name || selectedStaff?.email}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (
    task: StaffTaskItem,
    nextStatus: StaffTaskItem["status"],
    completionNote?: string
  ) => {
    setFeedback(null);
    const res = await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        status: nextStatus,
        completionNote: completionNote !== undefined ? completionNote : task.completion_note,
      }),
    });
    const json = (await res.json()) as { task?: StaffTaskItem; error?: string };
    if (!res.ok || !json.task) {
      setFeedback(json.error || "Failed updating task.");
      return;
    }
    setTasks((prev) => prev.map((item) => (item.id === task.id ? json.task! : item)));
    setFeedback(`Task updated to ${nextStatus.replace("_", " ")}.`);
  };

  const handleDeleteTask = async (taskId: string) => {
    const res = await fetch("/api/admin/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Failed deleting task.");
      return;
    }
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    setFeedback("Task removed.");
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {feedback}
        </div>
      )}

      {canAssignTasks && (
        <form
          onSubmit={handleAssignTask}
          className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-bold">Assign New Task to Staff</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold">Task Title</label>
              <input
                type="text"
                required
                minLength={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Resolve pending customer certificate queries"
                className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold">Assign To Staff</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
              >
                {assignableStaff.length === 0 ? (
                  <option value="">No lower-level staff yet</option>
                ) : (
                  assignableStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email} ({s.roles.map(formatRoleLabel).join(", ")})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold">Priority</label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "low" | "medium" | "high" | "urgent")
                  }
                  className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-2 text-xs outline-none focus:border-teal-600"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-2 text-xs outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold">Task Instructions</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed work instructions or expected deliverable..."
              className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>

          <button
            type="submit"
            disabled={saving || assignableStaff.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {saving ? "Assigning..." : "Assign Task"}
          </button>
        </form>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">
          {canAssignTasks ? `Assigned Team Tasks (${visibleTasks.length})` : `My Assigned Tasks (${visibleTasks.length})`}
        </h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface)] px-3 py-1.5 text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <div className="space-y-3">
        {visibleTasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--adm-border)] bg-[var(--adm-surface)] p-8 text-center text-xs text-[var(--adm-ink-muted)]">
            No tasks match this view yet.
          </div>
        )}

        {visibleTasks.map((t) => {
          const assignee = staffLookup[t.assigned_to];
          const assigner = staffLookup[t.assigned_by];
          const draftNote =
            noteDrafts[t.id] !== undefined ? noteDrafts[t.id] : t.completion_note || "";

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">{t.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.medium
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        STATUS_BADGE[t.status] || STATUS_BADGE.todo
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--adm-ink-muted)]">
                    Assigned to{" "}
                    <strong className="text-[var(--adm-ink)]">
                      {t.assigned_to === currentAdminId
                        ? "You"
                        : assignee?.name || assignee?.email || t.assigned_to}
                    </strong>{" "}
                    ({formatRoleLabel(t.target_role)}) • By{" "}
                    {assigner?.name || assigner?.email || "Admin"}
                    {t.due_date ? ` • Due ${t.due_date}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={t.status}
                    onChange={(e) =>
                      void handleUpdateTask(
                        t,
                        e.target.value as StaffTaskItem["status"],
                        draftNote
                      )
                    }
                    className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1 text-xs font-medium"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  {canAssignTasks && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteTask(t.id)}
                      className="cursor-pointer rounded-lg border border-[var(--adm-border)] p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {t.description && (
                <p className="text-xs leading-relaxed text-[var(--adm-ink-muted)]">
                  {t.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={draftNote}
                  onChange={(e) =>
                    setNoteDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                  }
                  placeholder="Add progress / completion note..."
                  className="min-w-[220px] flex-1 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-1.5 text-xs outline-none focus:border-teal-600"
                />
                <button
                  type="button"
                  onClick={() => void handleUpdateTask(t, t.status, draftNote)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[var(--adm-border)] px-3 py-1.5 text-xs font-semibold hover:border-teal-600"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> Save Note
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
