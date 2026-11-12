"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CreatorStudioLogo } from "./CreatorStudioLogo";

export function IntroSplash() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [cycle, setCycle] = useState(0);

  const dismissIntro = useCallback(() => {
    setExiting(true);
    window.setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 620);
  }, []);

  // Auto-play on fresh page load of homepage ("/") or first visit in session (never re-trigger on in-app nav back to "/")
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (params.get("no-intro") === "1" || reducedMotion) {
      setVisible(false);
      return;
    }

    const isHomeEntry = window.location.pathname === "/";
    const seenThisSession = window.sessionStorage.getItem("fcs-intro-played") === "1";

    if (isHomeEntry || !seenThisSession) {
      window.sessionStorage.setItem("fcs-intro-played", "1");
      setExiting(false);
      setVisible(true);
    }
  }, []);

  // Allow Replay Intro button from anywhere on the site
  useEffect(() => {
    const onReplay = () => {
      setCycle((c) => c + 1);
      setExiting(false);
      setVisible(true);
    };
    window.addEventListener("fcs:replay-intro", onReplay);
    return () => window.removeEventListener("fcs:replay-intro", onReplay);
  }, []);

  // Auto-complete cinema intro timeline & Esc skip
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissIntro();
    };
    window.addEventListener("keydown", onKey);

    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 2650);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 3300);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible, cycle, dismissIntro]);

  // 60fps Volumetric Particle & Champagne Beam Canvas
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 42 }, (_, idx) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.25 - Math.random() * 0.45,
      r: 0.9 + Math.random() * 1.9,
      alpha: 0.25 + Math.random() * 0.55,
      gold: idx % 3 !== 0,
    }));

    const start = performance.now();

    const render = (now: number) => {
      const elapsed = (now - start) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Sweeping diagonal cinema light beam
      const sweepX = ((elapsed * 0.34) % 1.4) * (w + 480) - 240;
      const grad = ctx.createLinearGradient(sweepX - 180, 0, sweepX + 180, h);
      grad.addColorStop(0, "rgba(200, 169, 106, 0)");
      grad.addColorStop(0.5, "rgba(200, 169, 106, 0.065)");
      grad.addColorStop(1, "rgba(20, 184, 166, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -12) p.y = h + 12;
        if (p.x < -12) p.x = w + 12;
        if (p.x > w + 12) p.x = -12;

        const twinkle = 0.65 + 0.35 * Math.sin(elapsed * 2.8 + p.x * 0.02);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(218, 186, 122, ${p.alpha * twinkle})`
          : `rgba(45, 212, 191, ${p.alpha * twinkle * 0.7})`;
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [visible, cycle]);

  if (!visible) return null;

  return (
    <div
      key={cycle}
      role="dialog"
      aria-label="CREATOR STUDIO Cinema Intro"
      style={{
        backgroundColor: "#06080B",
        backgroundImage:
          "radial-gradient(ellipse 74% 58% at 50% 44%, rgba(200, 169, 106, 0.14), rgba(15, 118, 110, 0.08) 46%, transparent 76%)",
        transition:
          "transform 640ms cubic-bezier(0.76, 0, 0.24, 1), opacity 520ms ease, filter 520ms ease",
      }}
      className={`no-print fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden text-[#FAF6EE] ${
        exiting
          ? "pointer-events-none scale-[1.03] opacity-0 blur-[2px]"
          : "scale-100 opacity-100 blur-0"
      }`}
    >
      {/* Volumetric Particle & Sweep Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Ambient Aurora Bloom */}
      <div
        aria-hidden="true"
        className="fcs-intro-aurora pointer-events-none absolute h-[440px] w-[620px] rounded-full bg-gradient-to-tr from-[#C8A96A]/14 via-teal-500/12 to-transparent blur-3xl"
      />

      {/* Architectural Blueprint Frame & Cinema Letterbox Bars */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-black/80 to-transparent sm:h-8"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/80 to-transparent sm:h-8"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 rounded-2xl border border-[#C8A96A]/20 sm:inset-7"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-6 rounded-xl border border-[#FAF6EE]/[0.05] sm:inset-10"
      />

      {/* Luxury Skip Intro Button */}
      <button
        type="button"
        onClick={dismissIntro}
        className="group absolute top-7 right-7 z-20 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#C8A96A]/40 bg-[#111317]/80 px-4 py-1.5 text-[10px] font-semibold tracking-[0.24em] text-[#E8DFD1] uppercase backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-[#C8A96A] hover:bg-[#191D24] hover:text-white sm:top-10 sm:right-10"
      >
        <span>Skip Intro</span>
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
          →
        </span>
      </button>

      {/* Center Cinema Stage */}
      <div className="relative z-10 mx-4 w-full max-w-xl px-6 py-10 text-center">
        <p className="fcs-intro-subtitle text-[10px] font-semibold tracking-[0.42em] text-[#D4B475] uppercase">
          Atelier Edition &bull; MMXXVI
        </p>

        {/* Orbital Monogram Chamber */}
        <div className="fcs-intro-emblem relative mx-auto mt-7 flex h-32 w-32 items-center justify-center">
          <div
            aria-hidden="true"
            className="fcs-intro-ring absolute inset-0 rounded-full border border-[#C8A96A]/35"
          />
          <div
            aria-hidden="true"
            className="fcs-intro-orbit absolute inset-1.5 rounded-full border border-dashed border-[#C8A96A]/40"
          />
          <div
            aria-hidden="true"
            className="absolute inset-4 rounded-full bg-gradient-to-b from-[#1A1C20] to-[#0C0D10] shadow-[0_24px_60px_rgba(0,0,0,0.8)] ring-1 ring-[#C8A96A]/45"
          />
          <CreatorStudioLogo size={68} animated={true} className="relative z-10 block" />
        </div>

        {/* Display Wordmark with Metallic Light Sheen */}
        <div className="relative mt-7 overflow-hidden">
          <h1 className="fcs-intro-title bg-gradient-to-r from-[#FAF6EE] via-[#F5E3BC] to-[#FAF6EE] bg-clip-text font-serif text-4xl font-semibold tracking-[0.18em] text-transparent uppercase sm:text-5xl">
            CREATOR STUDIO
          </h1>
          <div
            aria-hidden="true"
            className="fcs-intro-sheen pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />
        </div>

        <div className="fcs-intro-rule mx-auto mt-4 h-px w-28 bg-gradient-to-r from-transparent via-[#D4B475] to-transparent" />

        <p className="fcs-intro-subtitle mt-4 text-xs font-medium tracking-[0.26em] text-[#C7C0B3] uppercase sm:text-[13px]">
          Create Your Future &bull; Design Your Identity
        </p>

        {/* Cinema Progress Bar */}
        <div className="mx-auto mt-7 h-[2px] w-48 overflow-hidden rounded-full bg-white/10">
          <div className="fcs-intro-progress h-full w-full rounded-full bg-gradient-to-r from-[#D4B475] via-[#FAF6EE] to-[#14B8A6]" />
        </div>
      </div>

      {/* Bottom Craft Signature */}
      <div className="fcs-intro-bottom absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 sm:bottom-11">
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#C8A96A]/70 to-transparent" />
        <p className="text-[11px] font-semibold tracking-[0.44em] text-[#D4B475] uppercase">
          BUILT BY FRANCIS
        </p>
      </div>
    </div>
  );
}
