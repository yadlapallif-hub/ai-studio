"use client";

import React, { useEffect, useState } from "react";
import { CreatorStudioLogo } from "./CreatorStudioLogo";

export function IntroSplash() {
  const [visible, setVisible] = useState(true);
  const [slidingOut, setSlidingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (params.get("no-intro") === "1" || reducedMotion) {
      setVisible(false);
      return;
    }

    const slideTimer = window.setTimeout(() => {
      setSlidingOut(true);
    }, 1750);

    const doneTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2400);

    return () => {
      window.clearTimeout(slideTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="FRANCIS CREATOR STUDIO Welcome Intro"
      style={{
        transition: "transform 650ms cubic-bezier(0.76, 0, 0.24, 1), opacity 550ms ease",
      }}
      className={`no-print fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#060A0F] text-white ${
        slidingOut ? "pointer-events-none -translate-y-full opacity-95" : "translate-y-0 opacity-100"
      }`}
    >
      {/* Bottom Slide Curtain Edge Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-teal-500 via-amber-400 to-teal-500 opacity-85"
      />

      {/* Ambient Radial Studio Glow & Precision Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 42%, rgba(20, 184, 166, 0.22), rgba(6, 10, 15, 0) 58%), radial-gradient(circle at 60% 34%, rgba(245, 158, 11, 0.12), transparent 42%), linear-gradient(to right, rgba(148, 163, 184, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.045) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 44px 44px, 44px 44px",
        }}
      />

      {/* Skip Trigger */}
      <button
        type="button"
        onClick={() => {
          setSlidingOut(true);
          window.setTimeout(() => setVisible(false), 520);
        }}
        className="absolute top-5 right-5 z-10 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 transition hover:border-teal-400/50 hover:text-white"
      >
        Skip →
      </button>

      {/* Center Logo Slide Reveal Stage */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="fcs-intro-emblem relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="fcs-intro-ring absolute -inset-4 rounded-3xl border border-teal-400/25"
          />
          <CreatorStudioLogo
            size={102}
            animated={true}
            className="drop-shadow-[0_14px_40px_rgba(20,184,166,0.35)]"
          />
        </div>

        <h1 className="fcs-intro-title mt-7 text-xl font-bold tracking-[0.26em] text-white uppercase sm:text-2xl">
          FRANCIS CREATOR STUDIO
        </h1>

        <div className="fcs-intro-rule mt-3 h-px w-28 bg-gradient-to-r from-transparent via-teal-400 to-transparent" />

        <p className="fcs-intro-subtitle mt-3 text-xs font-medium tracking-[0.14em] text-teal-200/80 uppercase sm:text-[13px]">
          Create Your Future. Design Your Identity.
        </p>
      </div>

      {/* Bottom Signature */}
      <div className="fcs-intro-bottom absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 sm:bottom-11">
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
        <p className="text-xs font-semibold tracking-[0.44em] text-amber-300/95 uppercase sm:text-sm">
          FRANCIS BUILT
        </p>
      </div>
    </div>
  );
}
