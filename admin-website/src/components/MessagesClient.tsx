"use client";

import React, { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  FileText,
  Lock,
  Paperclip,
  Send,
  ShieldCheck,
  UserCheck,
  UserCog,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SafeNavLink } from "@/components/ui/SafeNavLink";

interface TicketRow {
  id: string;
  ticket_number: string;
  user_id: string;
  customerEmail: string;
  customerName: string;
  customerStatus: string;
  customerResumes: number;
  customerCerts: number;
  customerOrgs: Array<{ organization_name: string; verification_status: string }>;
  customerIsStaff: boolean;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  updated_at: string;
}

interface StaffAgentOption {
  id: string;
  label: string;
  roles: string[];
}

interface MsgRow {
  id: string;
  ticket_id: string;
  sender_role: string;
  body: string;
  is_internal_note: boolean;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  ticket_id: string;
  file_name: string;
  storage_path: string;
}

export function MessagesClient({
  initialTickets,
  initialAttachments,
  staffAgents,
  currentAgentId,
}: {
  initialTickets: TicketRow[];
  initialAttachments: AttachmentRow[];
  staffAgents: StaffAgentOption[];
  currentAgentId: string;
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(initialTickets[0]?.id ?? null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();

    supabase
      .from("fcs_support_messages")
      .select("id, ticket_id, sender_role, body, is_internal_note, created_at")
      .eq("ticket_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as MsgRow[]) ?? []));

    const channel = supabase
      .channel(`adm-ticket-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fcs_support_messages",
          filter: `ticket_id=eq.${selectedId}`,
        },
        (payload) => {
          const row = payload.new as MsgRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId]);

  const handleAction = async (patch: Record<string, unknown>) => {
    if (!selectedId) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedId, ...patch }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedback(json.error || "Support update failed.");
        return;
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedId
            ? {
                ...t,
                status: (patch.status as string) || t.status,
                priority: (patch.priority as string) || t.priority,
                assigned_to: patch.assignToMe
                  ? currentAgentId
                  : patch.assignedTo !== undefined
                    ? (patch.assignedTo as string | null)
                    : t.assigned_to,
              }
            : t
        )
      );
      if (patch.replyBody) setReply("");
      if (patch.status === "resolved") {
        setFeedback("Ticket marked as Resolved and customer notified.");
      }
    } finally {
      setSending(false);
    }
  };

  const toggleCustomerStatus = async () => {
    if (!selectedTicket || selectedTicket.customerIsStaff) return;
    const nextStatus = selectedTicket.customerStatus === "suspended" ? "active" : "suspended";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedTicket.user_id, status: nextStatus }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Failed updating customer account status.");
      return;
    }
    setTickets((prev) =>
      prev.map((t) =>
        t.user_id === selectedTicket.user_id ? { ...t, customerStatus: nextStatus } : t
      )
    );
    setFeedback(`Customer account ${selectedTicket.customerEmail} is now ${nextStatus}.`);
  };

  const openAttachment = async (att: AttachmentRow) => {
    const res = await fetch("/api/admin/support/attachment-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: att.storage_path }),
    });
    const json = (await res.json()) as { signedUrl?: string };
    if (json.signedUrl) window.open(json.signedUrl, "_blank", "noopener,noreferrer");
  };

  const visibleTickets = tickets
    .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
    .filter((t) =>
      queueFilter === "mine"
        ? t.assigned_to === currentAgentId
        : queueFilter === "unassigned"
          ? !t.assigned_to
          : true
    );
  const ticketAttachments = initialAttachments.filter((a) => a.ticket_id === selectedId);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Left Queue */}
      <div className="space-y-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 lg:col-span-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-1 text-[11px] font-semibold">
          {(
            [
              ["all", "All"],
              ["mine", "My Queue"],
              ["unassigned", "Unassigned"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setQueueFilter(val)}
              className={`cursor-pointer rounded-lg py-1.5 transition ${
                queueFilter === val
                  ? "bg-[var(--adm-surface)] text-[var(--adm-ink)] shadow-xs"
                  : "text-[var(--adm-ink-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2 text-xs font-semibold"
        >
          <option value="all">All Ticket Statuses ({tickets.length})</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_for_customer">Waiting for Customer</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <ul className="max-h-[540px] space-y-2 overflow-y-auto">
          {visibleTickets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full cursor-pointer rounded-xl border p-3 text-left text-xs transition ${
                  selectedId === t.id
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/40"
                    : "border-[var(--adm-border)] hover:bg-[var(--adm-surface-muted)]"
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono font-bold">{t.ticket_number}</span>
                  <span className="rounded bg-[var(--adm-surface-muted)] px-1.5 py-0.5 uppercase">
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 truncate font-bold">{t.subject}</p>
                <p className="truncate text-[11px] text-[var(--adm-ink-muted)]">
                  {t.customerEmail} • {t.priority}
                </p>
              </button>
            </li>
          ))}
          {visibleTickets.length === 0 && (
            <li className="py-8 text-center text-xs text-[var(--adm-ink-muted)]">
              No tickets match the selected filter.
            </li>
          )}
        </ul>
      </div>

      {/* Conversation Workbench */}
      <div className="flex flex-col rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] lg:col-span-8">
        {!selectedTicket ? (
          <div className="flex min-h-[420px] items-center justify-center p-8 text-xs text-[var(--adm-ink-muted)]">
            Select a support ticket to inspect customer context, chat, and resolve.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--adm-border)] p-4">
              <div>
                <p className="font-mono text-[11px] text-[var(--adm-ink-muted)]">
                  {selectedTicket.ticket_number} • {selectedTicket.customerEmail}
                </p>
                <h2 className="text-sm font-bold">{selectedTicket.subject}</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => void handleAction({ assignToMe: true })}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2.5 py-1.5 font-semibold hover:bg-[var(--adm-surface-muted)]"
                >
                  <UserCheck className="h-3.5 w-3.5" /> Assign Me
                </button>
                <select
                  value={selectedTicket.assigned_to || ""}
                  onChange={(e) =>
                    void handleAction({ assignedTo: e.target.value ? e.target.value : null })
                  }
                  aria-label="Assign agent"
                  className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1.5"
                >
                  <option value="">Unassigned</option>
                  {staffAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTicket.priority}
                  onChange={(e) => void handleAction({ priority: e.target.value })}
                  className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1.5"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => void handleAction({ status: e.target.value })}
                  className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-2.5 py-1.5"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_for_customer">Waiting for Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Super Agent Customer Context Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-4 py-2.5 text-[11px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-[var(--adm-ink)]">
                  {selectedTicket.customerName}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    selectedTicket.customerStatus === "suspended"
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {selectedTicket.customerStatus}
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--adm-ink-muted)]">
                  <FileText className="h-3 w-3" /> {selectedTicket.customerResumes} Resumes
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--adm-ink-muted)]">
                  <Award className="h-3 w-3" /> {selectedTicket.customerCerts} Certificates
                </span>
                {selectedTicket.customerOrgs.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300">
                    <ShieldCheck className="h-3 w-3" />
                    {selectedTicket.customerOrgs
                      .map((o) => `${o.organization_name} (${o.verification_status})`)
                      .join(", ")}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!selectedTicket.customerIsStaff && (
                  <button
                    type="button"
                    onClick={() => void toggleCustomerStatus()}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2.5 py-1 font-semibold hover:border-teal-600/50"
                  >
                    <UserCog className="h-3 w-3" />
                    {selectedTicket.customerStatus === "suspended"
                      ? "Reactivate Customer"
                      : "Suspend Customer"}
                  </button>
                )}
                <SafeNavLink
                  href="/verifications"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2.5 py-1 font-semibold hover:border-teal-600/50"
                >
                  <ShieldCheck className="h-3 w-3" /> Issuers
                </SafeNavLink>
                {selectedTicket.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => void handleAction({ status: "resolved" })}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 font-semibold text-white hover:bg-emerald-800"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Mark Resolved
                  </button>
                )}
              </div>
            </div>

            {feedback && (
              <div className="border-b border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                {feedback}
              </div>
            )}

            {ticketAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-4 py-2 text-xs">
                {ticketAttachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => void openAttachment(att)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2.5 py-1 text-[11px] font-medium hover:border-teal-600/50"
                  >
                    <Paperclip className="h-3 w-3" /> {att.file_name}
                  </button>
                ))}
              </div>
            )}

            <div
              className="flex-1 space-y-3 overflow-y-auto p-4 text-xs"
              style={{ minHeight: 300, maxHeight: 420 }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3.5 py-2.5 ${
                    m.is_internal_note
                      ? "border border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200"
                      : m.sender_role === "agent"
                        ? "ml-10 bg-teal-700 text-white"
                        : "mr-10 border border-[var(--adm-border)] bg-[var(--adm-surface-muted)]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] opacity-80">
                    <span className="font-bold uppercase">
                      {m.is_internal_note
                        ? "Internal Staff Note"
                        : m.sender_role === "agent"
                          ? "Support Super Agent"
                          : "Customer"}
                    </span>
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                void handleAction({
                  replyBody: reply,
                  isInternalNote: isInternal,
                  status: isInternal ? undefined : "waiting_for_customer",
                });
              }}
              className="space-y-2 border-t border-[var(--adm-border)] p-3"
            >
              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-1.5 font-medium text-[var(--adm-ink-muted)]">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  <Lock className="h-3 w-3" />
                  Save as Internal Agent Note (hidden from customer)
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={isInternal ? "Add internal staff note..." : "Write reply to customer..."}
                  className="flex-1 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3.5 py-2 text-xs outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> {isInternal ? "Save Note" : "Send Reply"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
