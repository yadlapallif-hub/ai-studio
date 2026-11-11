"use client";

import React, { useState } from "react";
import { Megaphone, Plus, Save, Trash2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  variant: string;
  is_active: boolean;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export function WebsiteManagementClient({
  initialBranding,
  initialWebsiteContent,
  initialFooter,
  initialAnnouncements,
  initialFaqs,
}: {
  initialBranding: Record<string, string>;
  initialWebsiteContent: Record<string, string>;
  initialFooter: Record<string, string>;
  initialAnnouncements: Announcement[];
  initialFaqs: FaqItem[];
}) {
  const [branding, setBranding] = useState(initialBranding);
  const [website, setWebsite] = useState(initialWebsiteContent);
  const [footer, setFooter] = useState(initialFooter);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [faqs, setFaqs] = useState(initialFaqs);
  const [annTitle, setAnnTitle] = useState("");
  const [annMsg, setAnnMsg] = useState("");
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const saveSetting = async (
    key: "branding" | "website_content" | "footer_content",
    value: Record<string, string>
  ) => {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setStatus(res.ok ? `Saved ${key} to live Customer Website.` : "Save failed.");
  };

  const addAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMsg.trim()) return;
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "fcs_announcements",
        record: { title: annTitle.trim(), message: annMsg.trim(), variant: "info", is_active: true },
      }),
    });
    const json = (await res.json()) as { item?: Announcement };
    if (json.item) {
      setAnnouncements((prev) => [json.item!, ...prev]);
      setAnnTitle("");
      setAnnMsg("");
    }
  };

  const deleteRow = async (
    table: "fcs_announcements" | "fcs_faqs",
    id: string
  ) => {
    await fetch("/api/admin/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id }),
    });
    if (table === "fcs_announcements") {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } else {
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const addFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQ.trim() || !faqA.trim()) return;
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "fcs_faqs",
        record: { question: faqQ.trim(), answer: faqA.trim(), category: "general" },
      }),
    });
    const json = (await res.json()) as { item?: FaqItem };
    if (json.item) {
      setFaqs((prev) => [...prev, json.item!]);
      setFaqQ("");
      setFaqA("");
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {status && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {status}
        </div>
      )}

      {/* Hero & Website Content */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Homepage Content</h2>
          <button
            type="button"
            onClick={() => void saveSetting("website_content", website)}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white"
          >
            <Save className="h-3.5 w-3.5" /> Save Homepage
          </button>
        </div>
        <input
          type="text"
          value={website.heroHeadline || ""}
          onChange={(e) => setWebsite({ ...website, heroHeadline: e.target.value })}
          placeholder="Hero Headline"
          className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
        />
        <textarea
          rows={2}
          value={website.heroSubheadline || ""}
          onChange={(e) => setWebsite({ ...website, heroSubheadline: e.target.value })}
          placeholder="Hero Subheadline"
          className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
        />
      </div>

      {/* Branding & Footer */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Branding & Links</h2>
            <button
              type="button"
              onClick={() => void saveSetting("branding", branding)}
              className="rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white"
            >
              Save Branding
            </button>
          </div>
          <input
            type="text"
            value={branding.platformName || ""}
            onChange={(e) => setBranding({ ...branding, platformName: e.target.value })}
            placeholder="Platform Name"
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
          <input
            type="email"
            value={branding.supportEmail || ""}
            onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
            placeholder="Support Email"
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
          <input
            type="url"
            value={branding.githubUrl || ""}
            onChange={(e) => setBranding({ ...branding, githubUrl: e.target.value })}
            placeholder="GitHub URL"
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
        </div>

        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Footer Content</h2>
            <button
              type="button"
              onClick={() => void saveSetting("footer_content", footer)}
              className="rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white"
            >
              Save Footer
            </button>
          </div>
          <input
            type="text"
            value={footer.credit || ""}
            onChange={(e) => setFooter({ ...footer, credit: e.target.value })}
            placeholder="Credit Line"
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
          <textarea
            rows={2}
            value={footer.disclaimer || ""}
            onChange={(e) => setFooter({ ...footer, disclaimer: e.target.value })}
            placeholder="Footer Disclaimer"
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
          />
        </div>
      </div>

      {/* Announcements */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Megaphone className="h-4 w-4 text-teal-600" /> Announcements
        </h2>
        <form onSubmit={addAnnouncement} className="grid gap-2 sm:grid-cols-3">
          <input
            type="text"
            required
            value={annTitle}
            onChange={(e) => setAnnTitle(e.target.value)}
            placeholder="Banner title"
            className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
          <input
            type="text"
            required
            value={annMsg}
            onChange={(e) => setAnnMsg(e.target.value)}
            placeholder="Announcement message"
            className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-teal-700 py-2 font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Publish Banner
          </button>
        </form>
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
            >
              <span>
                <strong>{a.title}:</strong> {a.message}
              </span>
              <button
                type="button"
                onClick={() => void deleteRow("fcs_announcements", a.id)}
                className="text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* FAQ Knowledge Base */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-4">
        <h2 className="text-sm font-bold">FAQ & AI Knowledge Base ({faqs.length})</h2>
        <form onSubmit={addFaq} className="grid gap-2 sm:grid-cols-3">
          <input
            type="text"
            required
            value={faqQ}
            onChange={(e) => setFaqQ(e.target.value)}
            placeholder="Question"
            className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
          <input
            type="text"
            required
            value={faqA}
            onChange={(e) => setFaqA(e.target.value)}
            placeholder="Answer"
            className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-teal-700 py-2 font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add FAQ
          </button>
        </form>
        <ul className="space-y-2">
          {faqs.map((f) => (
            <li
              key={f.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
            >
              <div>
                <p className="font-bold">{f.question}</p>
                <p className="mt-1 text-[var(--adm-ink-muted)]">{f.answer}</p>
              </div>
              <button
                type="button"
                onClick={() => void deleteRow("fcs_faqs", f.id)}
                className="text-red-600 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
