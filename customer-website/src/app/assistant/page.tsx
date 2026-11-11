"use client";

import React, { useEffect, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  Check,
  Loader2,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AiConversation {
  id: string;
  title: string;
  context_page: string;
  updated_at: string;
}

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SavedRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  status: string;
  feedback: string;
}

export default function AssistantAndIntelligencePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [recommendations, setRecommendations] = useState<SavedRecommendation[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "resume_improve" | "resume_summary">(
    "chat"
  );
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [careerRole, setCareerRole] = useState("");
  const [careerPlanLoading, setCareerPlanLoading] = useState(false);
  const [careerAdvice, setCareerAdvice] = useState<string | null>(null);
  const [aiOptIn, setAiOptIn] = useState(true);

  const loadWorkspace = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: profile }, { data: convs }, { data: recs }] = await Promise.all([
      supabase.from("fcs_profiles").select("ai_recommendations_enabled").eq("id", user.id).single(),
      supabase
        .from("fcs_ai_conversations")
        .select("id, title, context_page, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("fcs_ai_recommendations")
        .select("id, category, title, description, rationale, status, feedback")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    if (profile) setAiOptIn(Boolean(profile.ai_recommendations_enabled));
    setConversations((convs as AiConversation[]) ?? []);
    setRecommendations((recs as SavedRecommendation[]) ?? []);
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const loadConversationMessages = async (convId: string) => {
    setActiveConvId(convId);
    const supabase = createClient();
    const { data } = await supabase
      .from("fcs_ai_messages")
      .select("id, role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(((data as AiMessage[]) ?? []).filter((m) => m.role === "user" || m.role === "assistant"));
  };

  const sendDirectPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;
    setErrorMsg(null);
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: trimmed }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId ?? undefined,
          mode,
          contextPage: "Creator AI Hub",
          messages: [
            ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: trimmed },
          ],
        }),
      });
      const json = (await res.json()) as {
        reply?: string;
        conversationId?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setErrorMsg(json.message || "Creator AI service is currently unavailable.");
        return;
      }
      if (json.conversationId && !activeConvId) {
        setActiveConvId(json.conversationId);
        void loadWorkspace();
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: json.reply || "" },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendDirectPrompt(input);
  };

  const handleCareerGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerRole.trim()) return;
    setCareerPlanLoading(true);
    setCareerAdvice(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          contextPage: "Career Guidance Advisor",
          messages: [
            {
              role: "user",
              content: `Build a practical skill roadmap, 2 realistic portfolio project ideas, and 5 interview preparation topics for the target role: ${careerRole}. Do not invent live job listings or salary guarantees.`,
            },
          ],
        }),
      });
      const json = (await res.json()) as { reply?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(json.message || "AI provider is not configured.");
        return;
      }
      setCareerAdvice(json.reply || "");
    } finally {
      setCareerPlanLoading(false);
    }
  };

  const updateRecommendation = async (
    id: string,
    patch: { status?: string; feedback?: string }
  ) => {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("fcs_ai_recommendations")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const clearHistory = async () => {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("fcs_ai_conversations").delete().eq("user_id", userId);
    setConversations([]);
    setMessages([]);
    setActiveConvId(null);
  };

  const toggleAiOptIn = async () => {
    if (!userId) return;
    const next = !aiOptIn;
    setAiOptIn(next);
    const supabase = createClient();
    await supabase
      .from("fcs_profiles")
      .update({ ai_recommendations_enabled: next })
      .eq("id", userId);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            CREATOR AI & Intelligence
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Creator AI Assistant, Website & Certificate Guide
          </h1>
          <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
            Ask Creator AI about Creator Studio website tools, how to build a website, how to create
            and publish verified certificates, or how to build an ATS resume.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userId && (
            <button
              type="button"
              onClick={toggleAiOptIn}
              className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3.5 py-2 text-xs font-semibold"
            >
              Personalization: {aiOptIn ? "Enabled" : "Disabled"}
            </button>
          )}
          <SafeNavLink
            href="/support"
            className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3.5 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            Escalate to Human Support →
          </SafeNavLink>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-50 p-3.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Conversation History Sidebar */}
        <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--fcs-ink-muted)]">
              Conversations
            </h2>
            {userId && conversations.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:underline"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveConvId(null);
              setMessages([]);
            }}
            className="w-full rounded-xl bg-teal-700 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            + New Chat Session
          </button>

          {!userId ? (
            <p className="text-xs text-[var(--fcs-ink-muted)]">
              Sign in to save AI conversation history and track recommendations.
            </p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-[var(--fcs-ink-muted)]">No saved AI threads yet.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => void loadConversationMessages(c.id)}
                    className={`w-full truncate rounded-lg border px-2.5 py-2 text-left transition ${
                      activeConvId === c.id
                        ? "border-teal-600 bg-teal-50/60 font-semibold dark:bg-teal-950/40"
                        : "border-[var(--fcs-border)] hover:bg-[var(--fcs-surface-muted)]"
                    }`}
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Main AI Chat */}
        <div className="flex flex-col rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[var(--fcs-border)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Bot className="h-4 w-4 text-teal-600" />
              CREATOR AI Chat
            </div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as never)}
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1 text-xs"
            >
              <option value="chat">Website & Certificate Guide</option>
              <option value="resume_improve">Resume & Bullet Critic</option>
              <option value="resume_summary">Career Summary Helper</option>
            </select>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs" style={{ minHeight: 360, maxHeight: 460 }}>
            {messages.length === 0 && (
              <div className="space-y-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 text-[var(--fcs-ink-muted)]">
                <p>
                  Ask Creator AI for complete information about the Creator Studio website, how to
                  build a website step by step, how to create &amp; publish verified certificates,
                  or how to improve your resume.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Tell me about Creator Studio website",
                    "How do I create & publish a verified certificate?",
                    "How do I build a website?",
                    "How do I build an ATS resume?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendDirectPrompt(prompt)}
                      className="rounded-full border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--fcs-ink)] transition hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3.5 py-2.5 whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "ml-8 bg-teal-700 text-white"
                    : "mr-8 border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-[var(--fcs-border)] p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Creator AI..."
              className="flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Career Guidance & Intelligence Feed */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Briefcase className="h-4 w-4 text-teal-600" />
              Career Roadmap & Interview Prep
            </h2>
            <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
              Get practical skill roadmaps, portfolio ideas, and interview topics without fabricated
              job listings.
            </p>
            <form onSubmit={handleCareerGuidance} className="mt-3 flex gap-2">
              <input
                type="text"
                value={careerRole}
                onChange={(e) => setCareerRole(e.target.value)}
                placeholder="Target role (e.g. Data Analyst)"
                className="flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={careerPlanLoading}
                className="rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                {careerPlanLoading ? "..." : "Plan"}
              </button>
            </form>
            {careerAdvice && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 whitespace-pre-wrap text-[11px] leading-relaxed">
                {careerAdvice}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Saved Intelligence Recommendations
            </h2>
            {recommendations.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
                Open your Resume Studio or Dashboard to generate personalized recommendations with
                full transparency.
              </p>
            ) : (
              <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto text-xs">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{rec.title}</span>
                      <span className="rounded bg-[var(--fcs-surface)] px-1.5 py-0.5 text-[10px] uppercase">
                        {rec.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--fcs-ink-muted)]">{rec.description}</p>
                    <p className="mt-1 text-[10px] italic text-teal-700 dark:text-teal-400">
                      Why shown: {rec.rationale}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void updateRecommendation(rec.id, { status: "accepted" })}
                        className="inline-flex items-center gap-1 rounded border border-[var(--fcs-border)] px-2 py-0.5 text-[10px] font-medium"
                      >
                        <Check className="h-3 w-3 text-teal-600" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateRecommendation(rec.id, { status: "dismissed" })}
                        className="inline-flex items-center gap-1 rounded border border-[var(--fcs-border)] px-2 py-0.5 text-[10px] font-medium"
                      >
                        <X className="h-3 w-3" /> Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateRecommendation(rec.id, { feedback: "helpful" })}
                        title="Helpful"
                        className={`rounded p-1 ${rec.feedback === "helpful" ? "text-teal-600" : ""}`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateRecommendation(rec.id, { feedback: "not_helpful" })
                        }
                        title="Not helpful"
                        className={`rounded p-1 ${rec.feedback === "not_helpful" ? "text-red-600" : ""}`}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
