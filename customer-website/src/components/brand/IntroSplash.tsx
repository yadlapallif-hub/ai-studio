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
    }, 1850);

    const doneTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2500);

    return () => {
      window.clearTimeout(slideTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="CREATOR STUDIO Welcome Intro"
      style={{
        background:
          "linear-gradient(155deg, #04060e 0%, #0b1024 48%, #07131c 100%)",
        transition:
          "transform 680ms cubic-bezier(0.76, 0, 0.24, 1), opacity 550ms ease",
      }}
      className={`no-print fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden text-white ${
        slidingOut
          ? "pointer-events-none -translate-y-full opacity-95"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Aurora Ambient Halos & Blueprint Dot Matrix */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 64% 48% at 28% 28%, rgba(99, 102, 241, 0.28), transparent 62%), radial-gradient(ellipse 56% 44% at 74% 68%, rgba(6, 182, 212, 0.24), transparent 60%), radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.08), transparent 46%), radial-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 26px 26px",
        }}
      />

      {/* Luminous Bottom Curtain Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-amber-400 opacity-90"
      />

      {/* Skip Trigger */}
      <button
        type="button"
        onClick={() => {
          setSlidingOut(true);
          window.setTimeout(() => setVisible(false), 520);
        }}
        className="absolute top-5 right-5 z-20 cursor-pointer rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-slate-200 backdrop-blur-md transition hover:border-cyan-400/60 hover:bg-white/15 hover:text-white"
      >
        Skip →
      </button>

      {/* Center Aurora Glass Studio Card */}
      <div className="relative z-10 mx-4 w-full max-w-md px-2 text-center">
        <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.045] px-7 py-9 shadow-[0_28px_90px_rgba(79,70,229,0.28)] backdrop-blur-xl sm:px-10 sm:py-11">
          {/* Precision Architectural Corner Brackets */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 left-4 h-3.5 w-3.5 border-t-2 border-l-2 border-cyan-400/70"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 right-4 h-3.5 w-3.5 border-t-2 border-r-2 border-indigo-400/70"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 left-4 h-3.5 w-3.5 border-b-2 border-l-2 border-indigo-400/70"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-4 bottom-4 h-3.5 w-3.5 border-r-2 border-b-2 border-cyan-400/70"
          />

          {/* Top Micro Label */}
          <div className="fcs-intro-subtitle mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.22em] text-cyan-200 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Open Studio • 2026</span>
          </div>

          <div className="fcs-intro-emblem relative mx-auto flex w-fit items-center justify-center">
            <div
              aria-hidden="true"
              className="fcs-intro-ring absolute -inset-4 rounded-3xl border border-indigo-400/35 bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 blur-[1px]"
            />
            <CreatorStudioLogo
              size={88}
              animated={true}
              className="relative drop-shadow-[0_14px_38px_rgba(56,189,248,0.38)]"
            />
          </div>

          <h1 className="fcs-intro-title mt-7 bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-2xl font-extrabold tracking-[0.24em] text-transparent uppercase sm:text-[28px]">
            CREATOR STUDIO
          </h1>

          <div className="fcs-intro-rule mx-auto mt-3.5 h-0.5 w-32 rounded-full bg-gradient-to-r from-indigo-400 via-cyan-400 to-amber-300" />

          <p className="fcs-intro-subtitle mt-3.5 text-xs font-medium tracking-[0.14em] text-slate-200/85 uppercase sm:text-[13px]">
            Create Your Future. Design Your Identity.
          </p>

          {/* Animated Progress Ribbon */}
          <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="fcs-intro-progress h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-amber-300" />
          </div>
        </div>
      </div>

      {/* Bottom Signature */}
      <div className="fcs-intro-bottom absolute inset-x-0 bottom-7 z-10 flex flex-col items-center gap-2 sm:bottom-10">
        <div className="h-px w-20 bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
        <p className="text-xs font-semibold tracking-[0.44em] text-amber-200 uppercase sm:text-sm">
          BUILT BY FRANCIS
        </p>
      </div>
    </div>
  );
}
