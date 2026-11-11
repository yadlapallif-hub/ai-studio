"use client";

import React, { useEffect, useState, useCallback } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  FileText,
  Award,
  FolderLock,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Stamp,
  Sun,
  X,
  LayoutDashboard,
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

interface SearchResults {
  resumes: Array<{ id: string; title: string; template_slug: string }>;
  certificates: Array<{ id: string; title: string; recipient_name: string; certificate_code: string }>;
  assets: Array<{ id: string; file_name: string; asset_type: string }>;
  resumeTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  certificateTemplates: Array<{ id: string; slug: string; name: string; category: string }>;
  faqs: Array<{ id: string; question: string; category: string }>;
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
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
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
        .limit(12);

      setNotifications((notifs ?? []) as NotificationRow[]);
    } catch {
      // ignore if env missing during build
    }
  }, []);

  useEffect(() => {
    loadUserAndNotifications();
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
            setNotifications((prev) => [row, ...prev].slice(0, 15));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
    }, 180);
    return () => clearTimeout(timer);
  }, [searchOpen, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
    { href: "/resume-builder", label: "Resume Studio" },
    { href: "/certificate-builder", label: "Certificate Studio" },
    { href: "/verify", label: "Verify ID" },
    { href: "/assistant", label: "AI Assistant" },
    { href: "/support", label: "Support" },
  ];

  const activeAnnouncement = !dismissedBanner && announcements[0];

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
        <div className="flex items-center gap-6">
          <SafeNavLink
            href="/"
            className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-[var(--fcs-ink)]"
          >
            <CreatorStudioLogo size={34} className="shrink-0" />
            <div className="leading-tight">
              <span className="block text-[13px] font-bold tracking-wide uppercase">
                {platformName}
              </span>
              <span className="hidden text-[10px] font-medium text-[var(--fcs-ink-muted)] sm:block">
                Create Your Future. Design Your Identity.
              </span>
            </div>
          </SafeNavLink>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {navLinks.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <SafeNavLink
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname.startsWith("/vault")
                    ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                    : "text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                Vault
              </SafeNavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Global search"
            className="flex items-center gap-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--fcs-ink-muted)] transition hover:border-teal-600/40 hover:text-[var(--fcs-ink)]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-1 text-[10px] md:inline">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="rounded-lg border border-[var(--fcs-border)] p-2 text-[var(--fcs-ink-muted)] transition hover:bg-[var(--fcs-surface-muted)] hover:text-[var(--fcs-ink)]"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((p) => !p)}
                aria-label="Notifications"
                className="relative rounded-lg border border-[var(--fcs-border)] p-2 text-[var(--fcs-ink-muted)] transition hover:bg-[var(--fcs-surface-muted)] hover:text-[var(--fcs-ink)]"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between border-b border-[var(--fcs-border)] pb-2">
                    <span className="text-xs font-semibold tracking-wide uppercase">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[var(--fcs-ink-muted)]">
                      No notifications yet.
                    </p>
                  ) : (
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotifOpen(false);
                              if (n.link) router.push(n.link);
                            }}
                            className={`w-full rounded-lg p-2.5 text-left transition ${
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
                onClick={() => setProfileMenuOpen((p) => !p)}
                className="flex items-center gap-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--fcs-ink)] transition hover:border-teal-600/40"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">
                  {(user.full_name || user.email || user.phone || "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate sm:inline">
                  {user.full_name || user.email || user.phone || "Account"}
                </span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 shadow-xl">
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
                    Dashboard
                  </SafeNavLink>
                  <SafeNavLink
                    href="/stamps"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <Stamp className="h-3.5 w-3.5" />
                    Stamp Studio
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
                    Account Settings
                  </SafeNavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <SafeNavLink
                href="/auth/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--fcs-ink)] hover:bg-[var(--fcs-surface-muted)]"
              >
                Sign In
              </SafeNavLink>
              <SafeNavLink
                href="/auth/signup"
                className="rounded-lg bg-teal-700 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                Free Account
              </SafeNavLink>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle mobile menu"
            className="rounded-lg border border-[var(--fcs-border)] p-2 lg:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
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
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <SafeNavLink
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg border border-[var(--fcs-border)] px-3 py-2 text-center text-sm font-medium"
                >
                  Sign In
                </SafeNavLink>
                <SafeNavLink
                  href="/auth/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg bg-teal-700 px-3 py-2 text-center text-sm font-semibold text-white"
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-xs"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--fcs-border)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--fcs-ink-muted)]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resumes, certificates, templates, vault assets, or FAQs..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--fcs-ink-muted)]"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded p-1 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-3 text-sm">
              {searchLoading ? (
                <p className="py-6 text-center text-xs text-[var(--fcs-ink-muted)]">Searching...</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-[var(--fcs-ink-muted)] uppercase">
                      Quick Launch Studios
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <SafeNavLink
                        href="/resume-builder/new"
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                      >
                        <FileText className="h-3.5 w-3.5 text-teal-600" /> New Resume
                      </SafeNavLink>
                      <SafeNavLink
                        href="/certificate-builder"
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                      >
                        <Award className="h-3.5 w-3.5 text-amber-600" /> Certificate Studio (Auth Only)
                      </SafeNavLink>
                      <SafeNavLink
                        href="/verify"
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Verify Certificate ID
                      </SafeNavLink>
                      <SafeNavLink
                        href="/stamps"
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                      >
                        <Stamp className="h-3.5 w-3.5 text-teal-600" /> Organization Stamp Studio
                      </SafeNavLink>
                      <SafeNavLink
                        href="/support"
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                      >
                        <LifeBuoy className="h-3.5 w-3.5 text-teal-600" /> Live Support & Tickets
                      </SafeNavLink>
                    </div>
                  </div>

                  {searchResults && searchResults.resumes.length > 0 && (
                    <div>
                      <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-[var(--fcs-ink-muted)] uppercase">
                        Your Resumes
                      </p>
                      {searchResults.resumes.map((r) => (
                        <SafeNavLink
                          key={r.id}
                          href={`/resume-builder/${r.id}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs hover:bg-[var(--fcs-surface-muted)]"
                        >
                          <span className="font-medium">{r.title}</span>
                          <span className="text-[11px] text-[var(--fcs-ink-muted)]">
                            {r.template_slug}
                          </span>
                        </SafeNavLink>
                      ))}
                    </div>
                  )}

                  {searchResults && searchResults.certificates.length > 0 && (
                    <div>
                      <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-[var(--fcs-ink-muted)] uppercase">
                        Your Certificates
                      </p>
                      {searchResults.certificates.map((c) => (
                        <SafeNavLink
                          key={c.id}
                          href={`/certificate-builder/${c.id}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs hover:bg-[var(--fcs-surface-muted)]"
                        >
                          <span className="font-medium">
                            {c.title} — {c.recipient_name}
                          </span>
                          <span className="font-mono text-[11px] text-[var(--fcs-ink-muted)]">
                            {c.certificate_code}
                          </span>
                        </SafeNavLink>
                      ))}
                    </div>
                  )}

                  {searchResults && searchResults.resumeTemplates.length > 0 && (
                    <div>
                      <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-[var(--fcs-ink-muted)] uppercase">
                        Resume Templates
                      </p>
                      {searchResults.resumeTemplates.map((t) => (
                        <SafeNavLink
                          key={t.id}
                          href={`/resume-builder/new?template=${t.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs hover:bg-[var(--fcs-surface-muted)]"
                        >
                          <span>{t.name}</span>
                          <span className="text-[11px] uppercase text-[var(--fcs-ink-muted)]">
                            {t.category}
                          </span>
                        </SafeNavLink>
                      ))}
                    </div>
                  )}

                  {searchResults && searchResults.faqs.length > 0 && (
                    <div>
                      <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-[var(--fcs-ink-muted)] uppercase">
                        Help & FAQ
                      </p>
                      {searchResults.faqs.map((f) => (
                        <SafeNavLink
                          key={f.id}
                          href="/#faq"
                          onClick={() => setSearchOpen(false)}
                          className="block rounded-lg px-2.5 py-2 text-xs hover:bg-[var(--fcs-surface-muted)]"
                        >
                          {f.question}
                        </SafeNavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
