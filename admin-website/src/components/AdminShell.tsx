"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  FileCheck2,
  Globe,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  ScrollText,
  Shield,
  Sun,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  roles: string[];
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users & Roles", icon: Users },
  { href: "/messages", label: "Messages & Support", icon: MessageSquare },
  { href: "/verifications", label: "Verifications & Issuers", icon: FileCheck2 },
  { href: "/ai", label: "AI Management", icon: Bot },
  { href: "/templates", label: "Templates", icon: Layers },
  { href: "/website", label: "Website & Announcements", icon: Globe },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audit", label: "Audit Logs", icon: ScrollText },
  { href: "/security", label: "MFA & Security", icon: Lock },
];

export function AdminShell({ adminName, adminEmail, roles, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem("fcs-admin-theme") === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("fcs-admin-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const customerSiteUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL || "http://localhost:3000";

  return (
    <div className="flex min-h-screen bg-[var(--adm-bg)] text-[var(--adm-ink)]">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--adm-border)] bg-[var(--adm-surface)] lg:flex">
        <div className="border-b border-[var(--adm-border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-xs font-bold text-white">
              F
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide uppercase">FRANCIS ADMIN</p>
              <p className="text-[10px] text-[var(--adm-ink-muted)]">Operations & Governance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-teal-700 text-white"
                    : "text-[var(--adm-ink-muted)] hover:bg-[var(--adm-surface-muted)] hover:text-[var(--adm-ink)]"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--adm-border)] p-4 text-xs">
          <div className="mb-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3">
            <p className="truncate font-bold">{adminName}</p>
            <p className="truncate text-[11px] text-[var(--adm-ink-muted)]">{adminEmail}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded bg-teal-700/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-700 dark:text-teal-300"
                >
                  <Shield className="h-2.5 w-2.5" />
                  {r.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--adm-border)] py-2 font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--adm-border)] bg-[var(--adm-surface)] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-xs font-bold uppercase">FRANCIS ADMIN</span>
          </div>
          <div className="hidden text-xs text-[var(--adm-ink-muted)] lg:block">
            FRANCIS CREATOR STUDIO Management Console
          </div>
          <div className="flex items-center gap-2.5">
            <a
              href={customerSiteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--adm-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--adm-surface-muted)]"
            >
              Open Customer Site ↗
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-lg border border-[var(--adm-border)] p-1.5 hover:bg-[var(--adm-surface-muted)]"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Quick Nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--adm-border)] bg-[var(--adm-surface)] px-4 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
                  ? "bg-teal-700 text-white"
                  : "bg-[var(--adm-surface-muted)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
