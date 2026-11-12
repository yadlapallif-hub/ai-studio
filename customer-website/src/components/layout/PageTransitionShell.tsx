"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageTransitionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const onNavStart = (evt: Event) => {
      const detail = (evt as CustomEvent<{ href?: string }>).detail;
      if (detail?.href && detail.href.split("?")[0] === pathname) return;
      setNavigating(true);
    };
    window.addEventListener("fcs:nav-start", onNavStart);
    return () => window.removeEventListener("fcs:nav-start", onNavStart);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNavigating(false), 120);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {navigating && (
        <div
          aria-hidden="true"
          className="no-print fixed inset-x-0 top-0 z-[90] h-[2.5px] overflow-hidden bg-teal-950/20"
        >
          <div className="h-full w-2/3 animate-pulse rounded-r-full bg-gradient-to-r from-[#D4B475] via-teal-400 to-teal-600" />
        </div>
      )}
      <div key={pathname} className="fcs-page-enter flex-1">
        {children}
      </div>
    </>
  );
}
