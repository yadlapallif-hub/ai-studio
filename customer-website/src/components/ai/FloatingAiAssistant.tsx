"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  LifeBuoy,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function FloatingAiAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hello! I am FRANCIS AI ASSISTANT. I understand which studio page you are on and can help craft resumes, check ATS clarity, guide certificate & stamp workflows, or troubleshoot platform issues.",
    },
  ]);

  const contextLabel = pathname.startsWith("/resume-builder")
    ? "Resume Builder"
    : pathname.startsWith("/certificate-builder")
      ? "Certificate Builder"
      : pathname.startsWith("/support")
        ? "Customer Support"
        : pathname.startsWith("/verify")
          ? "Certificate Verification"
          : pathname.startsWith("/vault")
            ? "Document Vault"
            : "Customer Platform";

  const quickPrompts = pathname.startsWith("/resume-builder")
    ? [
        "Create a fresher software developer resume outline.",
        "How do I quantify bullet points for ATS clarity?",
        "What sections should a student include?",
      ]
    : pathname.startsWith("/certificate-builder")
      ? [
          "Recommend a layout for an internship certificate.",
          "How do I create or delete an official organization stamp?",
          "How does QR certificate verification work?",
        ]
      : [
          "How do I export a print-ready A4 PDF for free?",
          "Why is my certificate showing as Unverified Draft?",
          "Guide me through creating my first resume.",
        ];

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || loading) return;

    const nextMessages: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setErrorHint(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          contextPage: contextLabel,
          conversationId,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        conversationId?: string;
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.reply) {
        setErrorHint(
          data.message ||
            "AI assistant is currently unavailable. Check sign-in status or AI provider configuration."
        );
        return;
      }

      if (data.conversationId) setConversationId(data.conversationId);
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setErrorHint("Network error reaching FRANCIS AI service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="no-print fixed right-4 bottom-4 z-40">
      {open ? (
        <div className="flex h-[500px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wide">FRANCIS AI ASSISTANT</p>
                <p className="text-[10px] text-[var(--fcs-ink-muted)]">Context: {contextLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/assistant"
                title="Open full AI workspace"
                className="rounded p-1 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface)] hover:text-[var(--fcs-ink)]"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close AI Assistant"
                className="rounded p-1 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface)] hover:text-[var(--fcs-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-teal-700 text-white"
                      : "border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink)]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--fcs-ink-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            )}

            {errorHint && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="space-y-1.5">
                    <p>{errorHint}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/auth/login"
                        className="font-semibold underline underline-offset-2"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/support"
                        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                      >
                        <LifeBuoy className="h-3 w-3" /> Escalate to Human Support
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-1">
              <p className="mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-[var(--fcs-ink-muted)]">
                Quick Prompts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendMessage(p)}
                    className="rounded-full border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-left text-[11px] transition hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-[var(--fcs-border)] p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask FRANCIS AI..."
              className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="rounded-lg bg-teal-700 p-2 text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between border-t border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-[10px] text-[var(--fcs-ink-muted)]">
            <span>Need human help?</span>
            <Link
              href="/support"
              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              <LifeBuoy className="h-3 w-3" /> Open Support
            </Link>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-teal-700/30 bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-teal-800"
        >
          <Sparkles className="h-4 w-4" />
          <span>FRANCIS AI</span>
        </button>
      )}
    </div>
  );
}
