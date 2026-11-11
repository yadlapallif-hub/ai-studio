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
    }, 2550);

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
        backgroundColor: "#0C0B0A",
        backgroundImage:
          "radial-gradient(ellipse 68% 54% at 50% 42%, rgba(200, 169, 106, 0.08), transparent 72%)",
        transition:
          "transform 720ms cubic-bezier(0.76, 0, 0.24, 1), opacity 580ms ease",
      }}
      className={`no-print fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden text-[#F7F3EA] ${
        slidingOut
          ? "pointer-events-none -translate-y-full opacity-95"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Subtle Architectural Hairline Perimeter Frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 border border-[#C8A96A]/18 sm:inset-7"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-6 border border-[#F7F3EA]/[0.05] sm:inset-9"
      />

      {/* Fine Champagne Brass Bottom Curtain Edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#C8A96A]/75 to-transparent"
      />

      {/* Discreet Editorial Skip Action */}
      <button
        type="button"
        onClick={() => {
          setSlidingOut(true);
          window.setTimeout(() => setVisible(false), 540);
        }}
        className="absolute top-7 right-7 z-20 cursor-pointer border border-[#C8A96A]/30 bg-[#141210]/80 px-4 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-[#DDD5C7] uppercase transition hover:border-[#C8A96A]/70 hover:text-white sm:top-10 sm:right-10"
      >
        Skip
      </button>

      {/* Center Editorial Monograph Plate */}
      <div className="relative z-10 mx-4 w-full max-w-lg px-6 py-10 text-center">
        <p className="fcs-intro-subtitle text-[10px] font-medium tracking-[0.38em] text-[#C8A96A] uppercase">
          Editorial Edition &bull; MMXXVI
        </p>

        {/* Monogram Emblem in Matte Obsidian Brass Mount */}
        <div className="fcs-intro-emblem relative mx-auto mt-7 flex w-fit items-center justify-center">
          <div className="relative border border-[#C8A96A]/35 bg-[#12110F] p-3.5 shadow-[0_22px_60px_rgba(0,0,0,0.65)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 -left-1 h-2.5 w-2.5 border-t border-l border-[#C8A96A]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 -right-1 h-2.5 w-2.5 border-t border-r border-[#C8A96A]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-1 -left-1 h-2.5 w-2.5 border-b border-l border-[#C8A96A]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-1 -bottom-1 h-2.5 w-2.5 border-r border-b border-[#C8A96A]"
            />
            <CreatorStudioLogo size={72} animated={true} className="relative block" />
          </div>
        </div>

        {/* Classic High-Contrast Editorial Display Wordmark */}
        <h1 className="fcs-intro-title mt-8 font-serif text-4xl font-semibold tracking-[0.18em] text-[#FAF6EE] uppercase sm:text-5xl">
          CREATOR STUDIO
        </h1>

        <div className="fcs-intro-rule mx-auto mt-4 h-px w-24 bg-[#C8A96A]/70" />

        <p className="fcs-intro-subtitle mt-4 text-xs font-medium tracking-[0.22em] text-[#BEB6A7] uppercase sm:text-[13px]">
          Create Your Future &bull; Design Your Identity
        </p>
      </div>

      {/* Bottom Craft Stamp */}
      <div className="fcs-intro-bottom absolute inset-x-0 bottom-9 z-10 flex flex-col items-center gap-2 sm:bottom-12">
        <div className="h-px w-14 bg-[#C8A96A]/55" />
        <p className="text-[11px] font-semibold tracking-[0.42em] text-[#C8A96A] uppercase">
          BUILT BY FRANCIS
        </p>
      </div>
    </div>
  );
}
