"use client";

import React, { useEffect, useState } from "react";
import { Lock, Paperclip, Send, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TicketRow {
  id: string;
  ticket_number: string;
  user_id: string;
  customerEmail: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  updated_at: string;
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
}: {
  initialTickets: TicketRow[];
  initialAttachments: AttachmentRow[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(initialTickets[0]?.id ?? null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sending, setSending] = useState(false);

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
    try {
      await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedId, ...patch }),
      });

      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedId
            ? {
                ...t,
                status: (patch.status as string) || t.status,
                priority: (patch.priority as string) || t.priority,
              }
            : t
        )
      );
      if (patch.replyBody) setReply("");
    } finally {
      setSending(false);
    }
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

  const visibleTickets = tickets.filter((t) =>
    statusFilter === "all" ? true : t.status === statusFilter
  );
  const ticketAttachments = initialAttachments.filter((a) => a.ticket_id === selectedId);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Left Queue */}
      <div className="space-y-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 lg:col-span-4">
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

        <ul className="space-y-2 max-h-[540px] overflow-y-auto">
          {visibleTickets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full rounded-xl border p-3 text-left text-xs transition ${
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
        </ul>
      </div>

      {/* Conversation Workbench */}
      <div className="flex flex-col rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] lg:col-span-8">
        {!selectedTicket ? (
          <div className="flex min-h-[420px] items-center justify-center p-8 text-xs text-[var(--adm-ink-muted)]">
            Select a support ticket to inspect conversation and reply.
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
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] px-2.5 py-1.5 font-semibold"
                >
                  <UserCheck className="h-3.5 w-3.5" /> Assign Me
                </button>
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

            {ticketAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-4 py-2 text-xs">
                {ticketAttachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => void openAttachment(att)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2.5 py-1 text-[11px] font-medium hover:border-teal-600/50"
                  >
                    <Paperclip className="h-3 w-3" /> {att.file_name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs" style={{ minHeight: 300, maxHeight: 420 }}>
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
                        ? "Internal Staff Note (Hidden from Customer)"
                        : m.sender_role === "agent"
                          ? "Admin / Agent"
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
                  status: !isInternal && selectedTicket.status === "open" ? "in_progress" : undefined,
                });
              }}
              className="space-y-2 border-t border-[var(--adm-border)] p-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-1.5 font-semibold">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="accent-amber-600"
                  />
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  Save as Internal Agent Note (hidden from customer)
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={isInternal ? "Add internal staff note..." : "Write reply to customer..."}
                  className="flex-1 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3.5 py-2.5"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
                >
                  <Send className="h-3.5 w-3.5" /> {isInternal ? "Add Note" : "Send Reply"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
