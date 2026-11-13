"use client";

import React, { useEffect, useRef, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  Check,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WatchTutorialButton } from "@/components/tutorials/WatchTutorialButton";
import {
  readFileToAiAttachment,
  speakAiText,
  startVoiceDictation,
  stopAiSpeech,
  type ClientAttachment,
} from "@/lib/ai-client-helpers";

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
  proposedPatch?: {
    summary?: string;
    technicalSkills?: string[];
    softSkills?: string[];
    targetRole?: string;
    rationale?: string;
  };
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

interface UserResumeRef {
  id: string;
  title: string;
  target_role: string | null;
  data: Record<string, unknown>;
}

export default function AssistantAndIntelligencePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [recommendations, setRecommendations] = useState<SavedRecommendation[]>([]);
  const [userResumes, setUserResumes] = useState<UserResumeRef[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<
    | "chat"
    | "resume_health"
    | "resume_improve"
    | "resume_summary"
    | "certificate_assist"
  >("chat");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
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

    const [{ data: profile }, { data: convs }, { data: recs }, { data: resRows }] = await Promise.all([
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
      supabase
        .from("fcs_resumes")
        .select("id, title, target_role, data")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(10),
    ]);

    if (profile) setAiOptIn(Boolean(profile.ai_recommendations_enabled));
    setConversations((convs as AiConversation[]) ?? []);
    setRecommendations((recs as SavedRecommendation[]) ?? []);
    const typedRes = (resRows as UserResumeRef[]) ?? [];
    setUserResumes(typedRes);
    if (typedRes[0] && !selectedResumeId) setSelectedResumeId(typedRes[0].id);
  };

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleVoice = () => {
    if (listening) {
      stopVoiceRef.current?.();
      setListening(false);
      return;
    }
    setErrorMsg(null);
    setListening(true);
    stopVoiceRef.current = startVoiceDictation(
      (transcript) => setInput((prev) => (prev ? `${prev} ${transcript}` : transcript)),
      (err) => setErrorMsg(err),
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
      setErrorMsg(err instanceof Error ? err.message : "Could not attach file.");
    }
    e.target.value = "";
  };

  const sendDirectPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if ((!trimmed && attachments.length === 0) || sending) return;
    setErrorMsg(null);
    setActionBanner(null);
    setInput("");
    const userDisplay =
      trimmed || `Analyze uploaded file(s): ${attachments.map((a) => a.name).join(", ")}`;
    const payloadAttachments = [...attachments];
    setAttachments([]);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: userDisplay }]);
    setSending(true);
    try {
      const activeResume = userResumes.find((r) => r.id === selectedResumeId);
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId ?? undefined,
          mode,
          contextPage: "Creator AI Hub",
          contextDocumentId: activeResume?.id,
          contextData: activeResume
            ? { title: activeResume.title, targetRole: activeResume.target_role, data: activeResume.data }
            : undefined,
          attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
          messages: [
            ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userDisplay },
          ],
        }),
      });
      const json = (await res.json()) as {
        reply?: string;
        conversationId?: string;
        proposedPatch?: AiMessage["proposedPatch"];
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
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: json.reply || "",
          proposedPatch: json.proposedPatch,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const applyResumePatchWithConsent = async (patch: NonNullable<AiMessage["proposedPatch"]>) => {
    const activeResume = userResumes.find((r) => r.id === selectedResumeId);
    if (!activeResume) {
      setErrorMsg("Select a saved resume in the context dropdown to apply updates.");
      return;
    }
    const supabase = createClient();
    const nextData = {
      ...activeResume.data,
      ...(patch.summary ? { summary: patch.summary } : {}),
      ...(patch.technicalSkills
        ? {
            technicalSkills: Array.from(
              new Set([
                ...((activeResume.data.technicalSkills as string[]) || []),
                ...patch.technicalSkills,
              ])
            ),
          }
        : {}),
    };
    const { error } = await supabase
      .from("fcs_resumes")
      .update({
        data: nextData,
        ...(patch.targetRole ? { target_role: patch.targetRole } : {}),
      })
      .eq("id", activeResume.id);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setActionBanner(`Approved AI patch applied cleanly to "${activeResume.title}".`);
    void loadWorkspace();
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            CREATOR AI v2.0 • Voice, Vision &amp; Studio Diffs
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Creator AI Assistant Hub
          </h1>
          <p className="mt-1 text-xs text-[var(--fcs-ink-muted)] sm:text-sm">
            Dictate with voice, attach screenshots or PDF/DOCX/TXT files, review proposed diffs,
            and choose Ollama, Gemini, Groq, or OpenAI in Settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WatchTutorialButton sectionKey="assistant" label="Watch AI Tutorial" />
          <SafeNavLink
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            <Settings className="h-3.5 w-3.5 text-teal-600" /> AI Provider Settings
          </SafeNavLink>
          {userId && (
            <button
              type="button"
              onClick={toggleAiOptIn}
              className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3 py-2 text-xs font-semibold"
            >
              Memory: {aiOptIn ? "On" : "Off"}
            </button>
          )}
        </div>
      </div>

      {actionBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionBanner}</span>
        </div>
      )}

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

          {userResumes.length > 0 && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[var(--fcs-ink-muted)]">
                Active Resume Context
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-xs"
              >
                {userResumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              Sign in to persist conversation memory across sessions.
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

        {/* Main Multimodal + Voice AI Chat */}
        <div className="flex flex-col rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--fcs-border)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Bot className="h-4 w-4 text-teal-600" />
              CREATOR AI Chat
            </div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as never)}
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1 text-xs"
            >
              <option value="chat">General Assistant &amp; Studio Guide</option>
              <option value="resume_health">AI Resume Health Check (Diff)</option>
              <option value="resume_improve">Resume &amp; Bullet Upgrade (Diff)</option>
              <option value="resume_summary">Career Summary Writer</option>
              <option value="certificate_assist">Certificate Wording Assist</option>
            </select>
          </div>

          <div
            className="flex-1 space-y-3 overflow-y-auto p-4 text-xs"
            style={{ minHeight: 380, maxHeight: 500 }}
          >
            {messages.length === 0 && (
              <div className="space-y-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 text-[var(--fcs-ink-muted)]">
                <p>
                  Try voice input, attach a screenshot or resume document, or click a quick task:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Improve my resume for a software developer internship",
                    "Run an 8-axis AI Health Check on my resume",
                    "How do I bulk issue verified certificates?",
                    "How do I publish a verified certificate?",
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
              <div key={m.id} className="space-y-1.5">
                <div
                  className={`rounded-xl px-3.5 py-2.5 whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "ml-8 bg-teal-700 text-white"
                      : "mr-6 border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
                  }`}
                >
                  {m.content}
                </div>

                {m.role === "assistant" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (speakingMsgId === m.id) {
                          stopAiSpeech();
                          setSpeakingMsgId(null);
                        } else {
                          setSpeakingMsgId(m.id);
                          speakAiText(m.content, () => setSpeakingMsgId(null));
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--fcs-ink-muted)] hover:text-teal-700"
                    >
                      {speakingMsgId === m.id ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5" /> Stop Reading
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" /> Read Aloud
                        </>
                      )}
                    </button>
                  </div>
                )}

                {m.proposedPatch && (
                  <div className="mr-6 rounded-xl border border-teal-600/30 bg-teal-50/70 p-3 dark:bg-teal-950/30">
                    <p className="font-bold text-teal-800 dark:text-teal-300">
                      Proposed Resume Diff (Review Before Applying)
                    </p>
                    {m.proposedPatch.summary && (
                      <p className="mt-1 text-[11px]">
                        <strong>Summary:</strong> {m.proposedPatch.summary}
                      </p>
                    )}
                    {m.proposedPatch.technicalSkills && (
                      <p className="mt-1 text-[11px]">
                        <strong>Skills:</strong> {m.proposedPatch.technicalSkills.join(", ")}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void applyResumePatchWithConsent(m.proposedPatch!)}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-800"
                    >
                      <Check className="h-3 w-3" /> Approve &amp; Update Saved Resume
                    </button>
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2">
              {attachments.map((att, idx) => (
                <span
                  key={`${att.name}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-0.5 text-[11px]"
                >
                  {att.name}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[var(--fcs-border)] p-3">
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
              title="Upload image, screenshot, PDF, DOCX, or TXT"
              className="rounded-xl border border-[var(--fcs-border)] p-2 text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleVoice}
              title={listening ? "Stop voice input" : "Speak prompt"}
              className={`rounded-xl border p-2 ${
                listening
                  ? "border-red-500 bg-red-50 text-red-600"
                  : "border-[var(--fcs-border)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening via microphone..." : "Ask Creator AI..."}
              className="min-w-0 flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && attachments.length === 0)}
              className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Career Guidance & Intelligence Feed */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Briefcase className="h-4 w-4 text-teal-600" />
                Career Roadmap &amp; Interview Prep
              </h2>
              <WatchTutorialButton sectionKey="career_roadmap" label="Tutorial" variant="compact" />
            </div>
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Saved Intelligence Recommendations
              </h2>
              <WatchTutorialButton sectionKey="recommendations" label="Tutorial" variant="compact" />
            </div>
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
