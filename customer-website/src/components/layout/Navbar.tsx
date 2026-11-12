"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Award,
  Bell,
  Bot,
  CheckCheck,
  FileText,
  FolderLock,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  PenLine,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Stamp,
  Sun,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./ThemeProvider";
import { CreatorStudioLogo } from "../brand/CreatorStudioLogo";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  variant: "info" | "success" | "warning";
  link_label?: string | null;
  link_url?: string | null;
}

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotifPrefs {
  project_saved: boolean;
  document_exported: boolean;
  certificate_generated: boolean;
  ai_task_completed: boolean;
  support_ticket_updated: boolean;
  organization_approved: boolean;
  in_app_enabled: boolean;
  email_digest: boolean;
}

interface SearchResults {
  resumes: Array<{ id: string; title: string; template_slug: string }>;
  certificates: Array<{ id: string; title: string; recipient_name: string; certificate_code: string }>;
  projects?: Array<{ id: string; title: string; template_slug: string; status: string }>;
  portfolios?: Array<{ id: string; title: string; slug: string; is_published: boolean }>;
  coverLetters?: Array<{ id: string; title: string; company_name: string; target_role: string }>;
  assets: Array<{ id: string; file_name: string; asset_type: string }>;
  conversations?: Array<{ id: string; title: string; context_page: string }>;
  activities?: Array<{ id: string; action: string; entity_type: string; created_at: string }>;
  resumeTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  certificateTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  faqs: Array<{ id: string; question: string; category: string }>;
}

interface CommandItem {
  id: string;
  group: string;
  label: string;
  meta?: string;
  href: string;
}

export function Navbar({
  platformName,
  announcements,
}: {
  platformName: string;
  announcements: AnnouncementItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<{
    id: string;
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
  } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const loadUserAndNotifications = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setNotifications([]);
        return;
      }

      const { data: profile } = await supabase
        .from("fcs_profiles")
        .select("full_name, phone")
        .eq("id", authUser.id)
        .maybeSingle();

      setUser({
        id: authUser.id,
        email: authUser.email ?? null,
        phone: profile?.phone || authUser.phone || null,
        full_name:
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email ||
          authUser.phone ||
          "Creator",
      });

      const { data: notifs } = await supabase
        .from("fcs_notifications")
        .select("id, title, message, link, is_read, created_at")
        .eq("user_id", authUser.id)
        .eq("audience", "customer")
        .order("created_at", { ascending: false })
        .limit(20);

      setNotifications((notifs ?? []) as NotificationRow[]);
    } catch {
      // ignore if env missing during build
    }
  }, []);

  useEffect(() => {
    loadUserAndNotifications();
    try {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        void loadUserAndNotifications();
      });
      return () => {
        subscription.unsubscribe();
      };
    } catch {
      return undefined;
    }
  }, [loadUserAndNotifications, pathname]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`fcs-cust-notifs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fcs_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow & { audience?: string };
          if (row.audience === "customer") {
            setNotifications((prev) => [row, ...prev].slice(0, 25));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!showNotifPrefs || !user?.id || notifPrefs) return;
    fetch("/api/notifications/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.preferences) setNotifPrefs(json.preferences as NotifPrefs);
      })
      .catch(() => {});
  }, [showNotifPrefs, user?.id, notifPrefs]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setProfileMenuOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    setActiveIndex(0);
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          setSearchResults((await res.json()) as SearchResults);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [searchOpen, searchQuery]);

  const commandItems: CommandItem[] = useMemo(() => {
    const baseCommands: CommandItem[] = [
      { id: "cmd-dash", group: "Quick Actions", label: "Open Unified Dashboard", meta: "/dashboard", href: "/dashboard" },
      { id: "cmd-resume", group: "Quick Actions", label: "New ATS Resume", meta: "Resume Studio", href: "/resume-builder/new" },
      { id: "cmd-cert", group: "Quick Actions", label: "Certificate Designer", meta: "124 Templates", href: "/certificate-builder" },
      { id: "cmd-bulk", group: "Quick Actions", label: "Bulk Certificate Generator (1–500)", meta: "Quantity / CSV", href: "/bulk-generator" },
      { id: "cmd-port", group: "Quick Actions", label: "AI Portfolio Website Builder", meta: "Export HTML/Next.js", href: "/portfolio-builder" },
      { id: "cmd-cl", group: "Quick Actions", label: "AI Cover Letter Generator", meta: "PDF & DOCX", href: "/cover-letter" },
      { id: "cmd-vault", group: "Quick Actions", label: "Private Document Vault", meta: "Folders & Versions", href: "/vault" },
      { id: "cmd-ai", group: "Quick Actions", label: "Creator AI Assistant", meta: "Voice & Analysis", href: "/assistant" },
      { id: "cmd-verify", group: "Quick Actions", label: "Verify Certificate QR / ID", meta: "Public Trust", href: "/verify" },
      { id: "cmd-tut", group: "Quick Actions", label: "Video Tutorials (EN / తెలుగు)", meta: "12 Guides", href: "/tutorials" },
      { id: "cmd-sup", group: "Quick Actions", label: "Live Support & Tickets", meta: "Help Center", href: "/support" },
    ];

    const q = searchQuery.trim().toLowerCase();
    const list: CommandItem[] = q
      ? baseCommands.filter(
          (c) => c.label.toLowerCase().includes(q) || (c.meta || "").toLowerCase().includes(q)
        )
      : baseCommands.slice(0, 6);

    if (searchResults) {
      for (const r of searchResults.resumes ?? []) {
        list.push({ id: `r-${r.id}`, group: "Resumes", label: r.title, meta: r.template_slug, href: `/resume-builder/${r.id}` });
      }
      for (const c of searchResults.certificates ?? []) {
        list.push({
          id: `c-${c.id}`,
          group: "Certificates",
          label: `${c.title} — ${c.recipient_name}`,
          meta: c.certificate_code,
          href: `/certificate-builder/${c.id}`,
        });
      }
      for (const pf of searchResults.portfolios ?? []) {
        list.push({
          id: `pf-${pf.id}`,
          group: "Portfolios",
          label: pf.title,
          meta: pf.is_published ? `/p/${pf.slug}` : "Draft",
          href: `/portfolio-builder?id=${pf.id}`,
        });
      }
      for (const cl of searchResults.coverLetters ?? []) {
        list.push({
          id: `cl-${cl.id}`,
          group: "Cover Letters",
          label: cl.title,
          meta: `${cl.company_name} • ${cl.target_role}`,
          href: `/cover-letter?id=${cl.id}`,
        });
      }
      for (const p of searchResults.projects ?? []) {
        list.push({
          id: `proj-${p.id}`,
          group: "Design Projects",
          label: p.title,
          meta: p.status,
          href: `/certificate-builder?project=${p.id}`,
        });
      }
      for (const a of searchResults.assets ?? []) {
        list.push({
          id: `asset-${a.id}`,
          group: "Document Vault",
          label: a.file_name,
          meta: a.asset_type,
          href: "/vault",
        });
      }
      for (const conv of searchResults.conversations ?? []) {
        list.push({
          id: `conv-${conv.id}`,
          group: "AI Conversations",
          label: conv.title,
          meta: conv.context_page,
          href: `/assistant?c=${conv.id}`,
        });
      }
      for (const t of searchResults.resumeTemplates ?? []) {
        list.push({
          id: `rt-${t.id}`,
          group: "Resume Templates",
          label: t.name,
          meta: t.category,
          href: `/resume-builder/new?template=${t.slug}`,
        });
      }
      for (const ct of searchResults.certificateTemplates ?? []) {
        list.push({
          id: `ct-${ct.id}`,
          group: "Certificate Templates",
          label: ct.name,
          meta: ct.category,
          href: `/certificate-builder?template=${ct.slug}`,
        });
      }
      for (const act of searchResults.activities ?? []) {
        list.push({
          id: `act-${act.id}`,
          group: "Recent Activity",
          label: act.action.replace(/_/g, " "),
          meta: act.entity_type,
          href: "/dashboard",
        });
      }
      for (const f of searchResults.faqs ?? []) {
        list.push({
          id: `faq-${f.id}`,
          group: "Help & FAQ",
          label: f.question,
          meta: f.category,
          href: "/#faq",
        });
      }
    }
    return list;
  }, [searchQuery, searchResults]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (commandItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % commandItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + commandItems.length) % commandItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = commandItems[activeIndex];
      if (target) {
        setSearchOpen(false);
        router.push(target.href);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const visibleNotifs =
    notifFilter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  const markNotificationRead = async (id: string) => {
    const supabase = createClient();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("fcs_notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    const supabase = createClient();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("fcs_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("audience", "customer")
      .eq("is_read", false);
  };

  const togglePref = async (key: keyof NotifPrefs) => {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: updated[key] }),
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/resume-builder", label: "Resumes" },
    { href: "/certificate-builder", label: "Certificates" },
    { href: "/portfolio-builder", label: "Portfolio" },
    { href: "/cover-letter", label: "Cover Letter" },
    { href: "/verify", label: "Verify" },
    { href: "/assistant", label: "Creator AI" },
    { href: "/tutorials", label: "Tutorials" },
    { href: "/support", label: "Support" },
  ];

  const activeAnnouncement = !dismissedBanner && announcements[0];

  const groupedSearch = useMemo(() => {
    const groups = new Map<string, Array<CommandItem & { flatIndex: number }>>();
    commandItems.forEach((item, idx) => {
      const existing = groups.get(item.group) ?? [];
      existing.push({ ...item, flatIndex: idx });
      groups.set(item.group, existing);
    });
    return Array.from(groups.entries());
  }, [commandItems]);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)]/92 backdrop-blur-md">
      {activeAnnouncement && (
        <div className="border-b border-[var(--fcs-border)] bg-teal-950 text-teal-50 dark:bg-teal-950/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-teal-500/20 px-1.5 py-0.5 font-semibold tracking-wide text-teal-200 uppercase">
                {activeAnnouncement.title}
              </span>
              <span className="text-teal-100/90">{activeAnnouncement.message}</span>
              {activeAnnouncement.link_url && (
                <SafeNavLink
                  href={activeAnnouncement.link_url}
                  className="font-semibold text-teal-300 underline underline-offset-2 hover:text-white"
                >
                  {activeAnnouncement.link_label || "Explore"}
                </SafeNavLink>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissedBanner(true)}
              aria-label="Dismiss announcement"
              className="rounded p-0.5 text-teal-200 hover:bg-teal-900 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <SafeNavLink
            href="/"
            className="flex shrink-0 items-center gap-2.5 text-sm font-bold tracking-tight text-[var(--fcs-ink)]"
          >
            <CreatorStudioLogo size={32} className="shrink-0" />
            <div className="leading-tight">
              <span className="block text-[13px] font-bold tracking-wide uppercase">
                {platformName}
              </span>
              <span className="hidden text-[10px] font-medium text-[var(--fcs-ink-muted)] xl:block">
                Create. Design. Innovate.
              </span>
            </div>
          </SafeNavLink>

          <nav aria-label="Main navigation" className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <SafeNavLink
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`fcs-btn-ghost whitespace-nowrap px-2 py-1.5 text-[13px] ${
                    active
                      ? "bg-teal-50/90 font-semibold text-teal-800 shadow-[inset_0_0_0_1px_rgba(15,118,110,0.18)] dark:bg-teal-950/60 dark:text-teal-300"
                      : "text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)] hover:text-[var(--fcs-ink)]"
                  }`}
                >
                  {item.label}
                </SafeNavLink>
              );
            })}
            {user && (
              <SafeNavLink
                href="/vault"
                aria-current={pathname.startsWith("/vault") ? "page" : undefined}
                className={`fcs-btn-ghost whitespace-nowrap px-2 py-1.5 text-[13px] ${
                  pathname.startsWith("/vault")
                    ? "bg-teal-50/90 font-semibold text-teal-800 shadow-[inset_0_0_0_1px_rgba(15,118,110,0.18)] dark:bg-teal-950/60 dark:text-teal-300"
                    : "text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                Vault
              </SafeNavLink>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Global search"
            className="fcs-btn-secondary cursor-pointer px-2.5 py-1.5 text-xs font-medium text-[var(--fcs-ink-muted)]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-1 text-[10px] xl:inline">
              Ctrl K
            </kbd>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="fcs-btn-secondary cursor-pointer p-2 text-[var(--fcs-ink-muted)]"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((p) => !p);
                  setProfileMenuOpen(false);
                }}
                aria-label="Notifications"
                className="relative cursor-pointer rounded-lg border border-[var(--fcs-border)] p-2 text-[var(--fcs-ink-muted)] transition hover:bg-[var(--fcs-surface-muted)] hover:text-[var(--fcs-ink)]"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fcs-menu-enter absolute right-0 mt-2 w-80 max-w-[92vw] rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between border-b border-[var(--fcs-border)] pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold tracking-wide uppercase">
                        Notifications
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotifFilter("all")}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          notifFilter === "all"
                            ? "bg-teal-700 text-white"
                            : "text-[var(--fcs-ink-muted)]"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter("unread")}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          notifFilter === "unread"
                            ? "bg-teal-700 text-white"
                            : "text-[var(--fcs-ink-muted)]"
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          title="Mark all read"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-400"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifPrefs((p) => !p)}
                        title="Notification preferences"
                        className="rounded p-1 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)]"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {showNotifPrefs ? (
                    <div className="space-y-2 py-1 text-xs">
                      <p className="font-semibold">Notification Preferences</p>
                      {(
                        [
                          ["project_saved", "Project Saved"],
                          ["document_exported", "Document Exported"],
                          ["certificate_generated", "Certificate Generated"],
                          ["ai_task_completed", "AI Task Completed"],
                          ["support_ticket_updated", "Support Ticket Updated"],
                          ["organization_approved", "Organization Approved"],
                        ] as Array<[keyof NotifPrefs, string]>
                      ).map(([k, label]) => (
                        <label
                          key={k}
                          className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[var(--fcs-surface-muted)]"
                        >
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(notifPrefs?.[k] ?? true)}
                            onChange={() => togglePref(k)}
                          />
                        </label>
                      ))}
                    </div>
                  ) : visibleNotifs.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[var(--fcs-ink-muted)]">
                      {notifFilter === "unread" ? "All caught up!" : "No notifications yet."}
                    </p>
                  ) : (
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                      {visibleNotifs.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotifOpen(false);
                              if (n.link) router.push(n.link);
                            }}
                            className={`w-full cursor-pointer rounded-lg p-2.5 text-left transition ${
                              n.is_read
                                ? "hover:bg-[var(--fcs-surface-muted)]"
                                : "bg-teal-50/70 hover:bg-teal-50 dark:bg-teal-950/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-[var(--fcs-ink)]">
                                {n.title}
                              </p>
                              {!n.is_read && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--fcs-ink-muted)]">
                              {n.message}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((p) => !p);
                  setNotifOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--fcs-ink)] transition hover:border-teal-600/40"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">
                  {(user.full_name || user.email || user.phone || "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate sm:inline">
                  {user.full_name || user.email || user.phone || "Account"}
                </span>
              </button>

              {profileMenuOpen && (
                <div className="fcs-menu-enter absolute right-0 mt-2 w-60 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 shadow-xl">
                  <div className="border-b border-[var(--fcs-border)] px-3 py-2">
                    <p className="truncate text-xs font-semibold">{user.full_name}</p>
                    <p className="truncate text-[11px] text-[var(--fcs-ink-muted)]">
                      {user.email || user.phone || "Signed-in Creator"}
                    </p>
                  </div>
                  <SafeNavLink
                    href="/dashboard"
                    onClick={() => setProfileMenuOpen(false)}
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Unified Dashboard
                  </SafeNavLink>
                  <SafeNavLink
                    href="/portfolio-builder"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    AI Portfolio Builder
                  </SafeNavLink>
                  <SafeNavLink
                    href="/cover-letter"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Cover Letter Studio
                  </SafeNavLink>
                  <SafeNavLink
                    href="/stamps"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <Stamp className="h-3.5 w-3.5" />
                    Stamp &amp; Signature Studio
                  </SafeNavLink>
                  <SafeNavLink
                    href="/bulk-generator"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <Award className="h-3.5 w-3.5" />
                    Bulk Certificate Generator
                  </SafeNavLink>
                  <SafeNavLink
                    href="/vault"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <FolderLock className="h-3.5 w-3.5" />
                    Document Vault
                  </SafeNavLink>
                  <SafeNavLink
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Account &amp; AI Settings
                  </SafeNavLink>
                  <SafeNavLink
                    href="/admin"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                    Admin Portal
                  </SafeNavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <SafeNavLink
                href="/auth/login"
                className="fcs-btn-secondary whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
              >
                Sign In
              </SafeNavLink>
              <SafeNavLink
                href="/auth/signup"
                className="fcs-btn-primary whitespace-nowrap px-3.5 py-1.5 text-xs sm:text-sm"
              >
                Free Account
              </SafeNavLink>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle mobile menu"
            className="cursor-pointer rounded-lg border border-[var(--fcs-border)] p-2 lg:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fcs-drawer-enter border-t border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-3 lg:hidden">
          <div className="grid grid-cols-2 gap-1.5">
            {navLinks.map((item) => (
              <SafeNavLink
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--fcs-surface-muted)]"
              >
                {item.label}
              </SafeNavLink>
            ))}
            {user ? (
              <>
                <SafeNavLink
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  Dashboard
                </SafeNavLink>
                <SafeNavLink
                  href="/vault"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  Document Vault
                </SafeNavLink>
                <SafeNavLink
                  href="/bulk-generator"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  Bulk Certs
                </SafeNavLink>
                <SafeNavLink
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--fcs-surface-muted)]"
                >
                  Settings
                </SafeNavLink>
              </>
            ) : (
              <div className="col-span-2 mt-2 flex gap-2">
                <SafeNavLink
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="fcs-btn-secondary flex-1 px-3 py-2 text-center text-sm"
                >
                  Sign In
                </SafeNavLink>
                <SafeNavLink
                  href="/auth/signup"
                  onClick={() => setMobileOpen(false)}
                  className="fcs-btn-primary flex-1 px-3 py-2 text-center text-sm"
                >
                  Free Account
                </SafeNavLink>
              </div>
            )}
          </div>
        </div>
      )}

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-16 backdrop-blur-xs sm:pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--fcs-border)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--fcs-ink-muted)]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search resumes, certificates, portfolios, cover letters, vault, AI chats..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--fcs-ink-muted)]"
              />
              <span className="hidden text-[10px] text-[var(--fcs-ink-muted)] sm:inline">
                ↑↓ navigate • ↵ open
              </span>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded p-1 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[26rem] overflow-y-auto p-3 text-sm">
              {searchLoading && (
                <p className="mb-2 px-2 text-[11px] font-medium text-teal-600 dark:text-teal-400">
                  Searching workspace &amp; templates...
                </p>
              )}
              {groupedSearch.length === 0 ? (
                searchLoading ? null : (
                  <p className="py-6 text-center text-xs text-[var(--fcs-ink-muted)]">
                    No matching documents, templates, or conversations found.
                  </p>
                )
              ) : (
                <div className="space-y-4">
                  {groupedSearch.map(([groupName, items]) => (
                    <div key={groupName}>
                      <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-[var(--fcs-ink-muted)] uppercase">
                        {groupName}
                      </p>
                      <div className="space-y-0.5">
                        {items.map((item) => {
                          const isSelected = item.flatIndex === activeIndex;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onMouseEnter={() => setActiveIndex(item.flatIndex)}
                              onClick={() => {
                                setSearchOpen(false);
                                router.push(item.href);
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                isSelected
                                  ? "bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200"
                                  : "hover:bg-[var(--fcs-surface-muted)]"
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate font-medium">
                                {groupName.includes("Resume") ? (
                                  <FileText className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                                ) : groupName.includes("Certificate") ? (
                                  <Award className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                ) : groupName.includes("Portfolio") ? (
                                  <Globe className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                                ) : groupName.includes("Vault") ? (
                                  <FolderLock className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                                ) : groupName.includes("AI") ? (
                                  <Bot className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                                ) : groupName.includes("Activity") ? (
                                  <Activity className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                                ) : (
                                  <LifeBuoy className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                                )}
                                <span className="truncate">{item.label}</span>
                              </span>
                              {item.meta && (
                                <span className="shrink-0 font-mono text-[10px] text-[var(--fcs-ink-muted)]">
                                  {item.meta}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
