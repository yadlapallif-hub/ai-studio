"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  LifeBuoy,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TicketItem {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  updated_at: string;
}

interface SupportMsg {
  id: string;
  sender_role: "customer" | "agent" | "ai" | "system";
  body: string;
  created_at: string;
}

export default function CustomerSupportPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);

  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [newReply, setNewReply] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data } = await supabase
      .from("fcs_support_tickets")
      .select("id, ticket_number, subject, category, priority, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    const list = (data as TicketItem[]) ?? [];
    setTickets(list);
    if (list.length > 0 && !selectedTicketId) {
      setSelectedTicketId(list[0].id);
    }
    setLoading(false);
  }, [selectedTicketId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const loadMessages = useCallback(async (ticketId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("fcs_support_messages")
      .select("id, sender_role, body, created_at")
      .eq("ticket_id", ticketId)
      .eq("is_internal_note", false)
      .order("created_at", { ascending: true });
    setMessages((data as SupportMsg[]) ?? []);
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    void loadMessages(selectedTicketId);

    const supabase = createClient();
    const channel = supabase
      .channel(`fcs-ticket-${selectedTicketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fcs_support_messages",
          filter: `ticket_id=eq.${selectedTicketId}`,
        },
        (payload) => {
          const row = payload.new as SupportMsg & { is_internal_note?: boolean };
          if (!row.is_internal_note) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedTicketId, loadMessages]);

  const uploadAttachment = async (ticketId: string, messageId: string | null, file: File) => {
    if (!userId) return;
    const supabase = createClient();
    const path = `${userId}/${ticketId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("fcs-support-attachments")
      .upload(path, file);
    if (!upErr) {
      await supabase.from("fcs_support_attachments").insert({
        ticket_id: ticketId,
        message_id: messageId,
        uploaded_by: userId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
      });
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !subject.trim() || !description.trim()) return;
    setSubmitting(true);
    setStatusNote(null);
    try {
      const supabase = createClient();
      const ticketNumber = `FCS-${Date.now().toString().slice(-6)}`;
      const { data: ticket, error } = await supabase
        .from("fcs_support_tickets")
        .insert({
          ticket_number: ticketNumber,
          user_id: userId,
          subject: subject.trim(),
          description: description.trim(),
          category,
          priority,
          status: "open",
        })
        .select("id")
        .single();

      if (error || !ticket) {
        setStatusNote(error?.message || "Failed creating ticket.");
        return;
      }

      const { data: firstMsg } = await supabase
        .from("fcs_support_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: userId,
          sender_role: "customer",
          body: description.trim(),
          is_internal_note: false,
        })
        .select("id")
        .single();

      if (attachmentFile) {
        await uploadAttachment(ticket.id, firstMsg?.id ?? null, attachmentFile);
      }

      setSubject("");
      setDescription("");
      setAttachmentFile(null);
      setShowNewForm(false);
      setSelectedTicketId(ticket.id);
      setStatusNote(`Support ticket ${ticketNumber} created.`);
      await loadTickets();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedTicketId || !newReply.trim()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: msg } = await supabase
        .from("fcs_support_messages")
        .insert({
          ticket_id: selectedTicketId,
          sender_id: userId,
          sender_role: "customer",
          body: newReply.trim(),
          is_internal_note: false,
        })
        .select("id")
        .single();

      if (attachmentFile) {
        await uploadAttachment(selectedTicketId, msg?.id ?? null, attachmentFile);
        setAttachmentFile(null);
      }
      setNewReply("");
    } finally {
      setSubmitting(false);
    }
  };

  const updateTicketStatus = async (status: "resolved" | "open") => {
    if (!userId || !selectedTicketId) return;
    const supabase = createClient();
    await supabase
      .from("fcs_support_tickets")
      .update({ status })
      .eq("id", selectedTicketId)
      .eq("user_id", userId);
    await loadTickets();
  };

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;

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
        <LifeBuoy className="mx-auto h-10 w-10 text-teal-600" />
        <h1 className="mt-4 text-2xl font-bold">Customer Support & Live Help</h1>
        <p className="mt-2 text-sm text-[var(--fcs-ink-muted)]">
          Sign in to open support tickets, attach screenshots, and chat directly in real time with
          FRANCIS Support Agents.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/auth/login?redirect=/support"
            className="rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Sign In
          </Link>
          <Link
            href="/assistant"
            className="rounded-xl border border-[var(--fcs-border)] px-5 py-2.5 text-sm font-semibold"
          >
            Ask AI Assistant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Realtime Customer Support
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Support Tickets & Live Chat</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowNewForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <MessageSquarePlus className="h-4 w-4" /> New Support Ticket
        </button>
      </div>

      {statusNote && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2.5 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          <CheckCircle2 className="h-4 w-4" />
          {statusNote}
        </div>
      )}

      {showNewForm && (
        <form
          onSubmit={handleCreateTicket}
          className="grid gap-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 text-xs sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block font-semibold">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Summarize your issue or request"
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
            >
              <option value="resume_builder">Resume Builder</option>
              <option value="certificate_builder">Certificate Builder</option>
              <option value="verification">Certificate Verification</option>
              <option value="ai_assistant">AI Assistant</option>
              <option value="account_auth">Account & Profile</option>
              <option value="bug_report">Bug Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-semibold">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block font-semibold">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened and how we can help..."
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] px-3 py-2 font-medium">
              <Paperclip className="h-3.5 w-3.5" />
              {attachmentFile ? attachmentFile.name : "Attach Screenshot / PDF (Optional)"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800"
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Ticket List */}
        <div className="space-y-2 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 lg:col-span-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--fcs-ink-muted)]">
            Your Tickets ({tickets.length})
          </h2>
          {tickets.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--fcs-ink-muted)]">
              No support tickets yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedTicketId === t.id
                        ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/40"
                        : "border-[var(--fcs-border)] hover:bg-[var(--fcs-surface-muted)]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-semibold">{t.ticket_number}</span>
                      <span className="rounded bg-[var(--fcs-surface-muted)] px-2 py-0.5 uppercase">
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold">{t.subject}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Realtime Conversation Pane */}
        <div className="flex flex-col rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] lg:col-span-8">
          {!activeTicket ? (
            <div className="flex min-h-[380px] items-center justify-center p-8 text-sm text-[var(--fcs-ink-muted)]">
              Select a ticket to view live conversation.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fcs-border)] px-5 py-4">
                <div>
                  <p className="font-mono text-xs text-[var(--fcs-ink-muted)]">
                    {activeTicket.ticket_number} • {activeTicket.category.replace(/_/g, " ")}
                  </p>
                  <h3 className="text-sm font-bold">{activeTicket.subject}</h3>
                </div>
                <div className="flex gap-2 text-xs">
                  {activeTicket.status !== "resolved" && activeTicket.status !== "closed" ? (
                    <button
                      type="button"
                      onClick={() => void updateTicketStatus("resolved")}
                      className="rounded-lg border border-teal-600/40 px-3 py-1.5 font-semibold text-teal-700 dark:text-teal-400"
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void updateTicketStatus("open")}
                      className="rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 font-semibold"
                    >
                      Reopen Ticket
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5 text-xs" style={{ minHeight: 320, maxHeight: 420 }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl px-4 py-3 ${
                      m.sender_role === "customer"
                        ? "ml-10 bg-teal-700 text-white"
                        : "mr-10 border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-[10px] opacity-80">
                      <span className="font-bold uppercase">
                        {m.sender_role === "customer" ? "You" : "FRANCIS Support"}
                      </span>
                      <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSendReply}
                className="flex flex-wrap items-center gap-2 border-t border-[var(--fcs-border)] p-4"
              >
                <label className="cursor-pointer rounded-xl border border-[var(--fcs-border)] p-2.5 hover:bg-[var(--fcs-surface-muted)]">
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <input
                  type="text"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3.5 py-2.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
