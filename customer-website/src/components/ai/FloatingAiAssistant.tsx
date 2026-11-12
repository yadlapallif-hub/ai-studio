"use client";

import React, { useRef, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  LifeBuoy,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  readFileToAiAttachment,
  speakAiText,
  startVoiceDictation,
  stopAiSpeech,
  type ClientAttachment,
} from "@/lib/ai-client-helpers";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function FloatingAiAssistant() {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hello! I am CREATOR AI. Ask me about resumes, certificates, portfolio websites, cover letters, Document Vault, or upload a screenshot/file for instant analysis.",
    },
  ]);

  const contextLabel = pathname.startsWith("/resume-builder")
    ? "Resume Builder"
    : pathname.startsWith("/certificate-builder")
      ? "Certificate Builder"
      : pathname.startsWith("/portfolio-builder")
        ? "Portfolio Builder"
        : pathname.startsWith("/cover-letter")
          ? "Cover Letter Studio"
          : pathname.startsWith("/support")
            ? "Customer Support"
            : pathname.startsWith("/verify")
              ? "Certificate Verification"
              : pathname.startsWith("/vault")
                ? "Document Vault"
                : "Creator Studio";

  const quickPrompts = pathname.startsWith("/resume-builder")
    ? [
        "How do I optimize my resume for ATS?",
        "How does the 8-axis AI Resume Health Check work?",
        "How do I export my resume as DOCX?",
      ]
    : pathname.startsWith("/certificate-builder")
      ? [
          "How do I issue 100 bulk certificates?",
          "How do I add an official stamp and QR code?",
          "How does 1:1 PDF export work?",
        ]
      : [
          "Tell me about Creator Studio Version 2.0",
          "How do I create a portfolio website?",
          "How do I generate a tailored cover letter?",
        ];

  const toggleVoice = () => {
    if (listening) {
      stopVoiceRef.current?.();
      setListening(false);
      return;
    }
    setErrorHint(null);
    setListening(true);
    stopVoiceRef.current = startVoiceDictation(
      (transcript) => setInput((prev) => (prev ? `${prev} ${transcript}` : transcript)),
      (err) => setErrorHint(err),
      () => setListening(false)
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const att = await readFileToAiAttachment(file);
      setAttachments((prev) => [...prev.slice(-2), att]);
    } catch (err) {
      setErrorHint(err instanceof Error ? err.message : "Could not attach file.");
    }
    e.target.value = "";
  };

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if ((!content && attachments.length === 0) || loading) return;

    const userDisplay = content || `Analyze attached file(s): ${attachments.map((a) => a.name).join(", ")}`;
    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: userDisplay }];
    setMessages(nextMessages);
    setInput("");
    const payloadAttachments = [...attachments];
    setAttachments([]);
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
          attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
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
      setErrorHint("Network error reaching Creator AI service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="no-print fixed right-4 bottom-4 z-40">
      {open ? (
        <div className="flex h-[520px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wide">CREATOR AI</p>
                <p className="text-[10px] text-[var(--fcs-ink-muted)]">Context: {contextLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SafeNavLink
                href="/assistant"
                title="Open full AI workspace"
                className="rounded p-1 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface)] hover:text-[var(--fcs-ink)]"
              >
                <ArrowUpRight className="h-4 w-4" />
              </SafeNavLink>
              <button
                type="button"
                onClick={() => {
                  stopAiSpeech();
                  setOpen(false);
                }}
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
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-teal-700 text-white"
                      : "border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink)]"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (speakingIdx === idx) {
                        stopAiSpeech();
                        setSpeakingIdx(null);
                      } else {
                        setSpeakingIdx(idx);
                        speakAiText(m.content, () => setSpeakingIdx(null));
                      }
                    }}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--fcs-ink-muted)] hover:text-teal-700"
                  >
                    {speakingIdx === idx ? (
                      <>
                        <VolumeX className="h-3 w-3" /> Stop Reading
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3 w-3" /> Read Aloud
                      </>
                    )}
                  </button>
                )}
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
                      <SafeNavLink
                        href="/auth/login"
                        className="font-semibold underline underline-offset-2"
                      >
                        Sign in
                      </SafeNavLink>
                      <SafeNavLink
                        href="/settings"
                        className="font-semibold underline underline-offset-2"
                      >
                        AI Settings
                      </SafeNavLink>
                      <SafeNavLink
                        href="/support"
                        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                      >
                        <LifeBuoy className="h-3 w-3" /> Escalate
                      </SafeNavLink>
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

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5">
              {attachments.map((att, i) => (
                <span
                  key={`${att.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-0.5 text-[10px]"
                >
                  {att.name}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-1.5 border-t border-[var(--fcs-border)] p-2.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.docx,.txt,.md,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach screenshot or document"
              className="rounded-lg border border-[var(--fcs-border)] p-2 text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleVoice}
              title={listening ? "Stop voice input" : "Voice input"}
              className={`rounded-lg border p-2 ${
                listening
                  ? "border-red-500 bg-red-50 text-red-600"
                  : "border-[var(--fcs-border)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening..." : "Ask Creator AI..."}
              className="min-w-0 flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-xs outline-none focus:border-teal-600"
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && attachments.length === 0)}
              aria-label="Send message"
              className="rounded-lg bg-teal-700 p-2 text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between border-t border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-[10px] text-[var(--fcs-ink-muted)]">
            <span>Voice &amp; file analysis ready</span>
            <SafeNavLink
              href="/support"
              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              <LifeBuoy className="h-3 w-3" /> Open Support
            </SafeNavLink>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-teal-700/30 bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-teal-800"
        >
          <Sparkles className="h-4 w-4" />
          <span>CREATOR AI</span>
        </button>
      )}
    </div>
  );
}
