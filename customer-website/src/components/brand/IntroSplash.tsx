"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CreatorStudioLogo } from "./CreatorStudioLogo";

const PILLARS = [
  { code: "01", title: "AI Resume Studio", meta: "100 ATS Layouts" },
  { code: "02", title: "Certificate Atelier", meta: "124 Designs & Seals" },
  { code: "03", title: "QR Verification", meta: "Public Trust Registry" },
] as const;

export function IntroSplash() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [percent, setPercent] = useState(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const exitingRef = useRef(false);

  const dismissIntro = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setPercent(100);
    setExiting(true);
    window.setTimeout(() => {
      setVisible(false);
      setExiting(false);
      exitingRef.current = false;
    }, 760);
  }, []);

  // Auto-play on fresh homepage load or first visit in session (never re-trigger on client nav back to "/")
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
      exitingRef.current = false;
      setPercent(0);
      setExiting(false);
      setVisible(true);
    }
  }, []);

  // Allow Replay Intro button from anywhere on the site
  useEffect(() => {
    const onReplay = () => {
      exitingRef.current = false;
      setPercent(0);
      setCycle((c) => c + 1);
      setExiting(false);
      setVisible(true);
    };
    window.addEventListener("fcs:replay-intro", onReplay);
    return () => window.removeEventListener("fcs:replay-intro", onReplay);
  }, []);

  // Timeline & keyboard escape / enter skip
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dismissIntro();
      }
    };
    window.addEventListener("keydown", onKey);

    const exitTimer = window.setTimeout(() => {
      dismissIntro();
    }, 2950);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(exitTimer);
    };
  }, [visible, cycle, dismissIntro]);

  // 60fps Architectural Meridian & Golden Dust Canvas + Smooth Telemetry Counter
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

    const motes = Array.from({ length: 56 }, (_, idx) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.32,
      vy: -0.2 - Math.random() * 0.42,
      r: 0.7 + Math.random() * 1.8,
      alpha: 0.22 + Math.random() * 0.55,
      tone: idx % 4 === 0 ? "teal" : idx % 3 === 0 ? "ivory" : "gold",
    }));

    const start = performance.now();
    let lastShownPct = -1;

    const render = (now: number) => {
      const elapsedMs = now - start;
      const elapsed = elapsedMs / 1000;
      const progress = Math.min(1, elapsedMs / 2800);
      const easedPct = Math.min(100, Math.round((1 - Math.pow(1 - progress, 3)) * 100));
      if (!exitingRef.current && easedPct !== lastShownPct) {
        lastShownPct = easedPct;
        setPercent(easedPct);
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2 + (pointerRef.current.x - 0.5) * 32;
      const cy = h * 0.46 + (pointerRef.current.y - 0.5) * 22;

      ctx.clearRect(0, 0, w, h);

      // Subtle architectural blueprint hairlines
      ctx.save();
      ctx.strokeStyle = "rgba(212, 180, 117, 0.045)";
      ctx.lineWidth = 1;
      const gridSize = 84;
      for (let gx = (w % gridSize) / 2; gx < w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = (h % gridSize) / 2; gy < h; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Precision celestial meridian arcs
      const baseRadius = Math.min(w, h) * 0.28;
      for (let ring = 0; ring < 3; ring += 1) {
        const radius = baseRadius + ring * 68;
        ctx.beginPath();
        ctx.strokeStyle =
          ring === 1 ? "rgba(20, 184, 166, 0.09)" : "rgba(212, 180, 117, 0.08)";
        ctx.setLineDash(ring === 1 ? [4, 10] : [2, 6]);
        ctx.arc(
          cx,
          cy,
          radius,
          elapsed * (ring % 2 === 0 ? 0.14 : -0.1),
          elapsed * (ring % 2 === 0 ? 0.14 : -0.1) + Math.PI * 1.45
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Sweeping anamorphic cinema beam
      const sweepX = ((elapsed * 0.28) % 1.5) * (w + 520) - 260;
      const grad = ctx.createLinearGradient(sweepX - 200, 0, sweepX + 200, h);
      grad.addColorStop(0, "rgba(212, 180, 117, 0)");
      grad.addColorStop(0.5, "rgba(212, 180, 117, 0.06)");
      grad.addColorStop(0.75, "rgba(20, 184, 166, 0.035)");
      grad.addColorStop(1, "rgba(20, 184, 166, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Luminous studio dust motes
      for (const m of motes) {
        m.x += m.vx + (pointerRef.current.x - 0.5) * 0.12;
        m.y += m.vy;
        if (m.y < -12) m.y = h + 12;
        if (m.x < -12) m.x = w + 12;
        if (m.x > w + 12) m.x = -12;

        const twinkle = 0.55 + 0.45 * Math.sin(elapsed * 2.6 + m.x * 0.025);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        if (m.tone === "teal") {
          ctx.fillStyle = `rgba(45, 212, 191, ${m.alpha * twinkle * 0.72})`;
        } else if (m.tone === "ivory") {
          ctx.fillStyle = `rgba(250, 246, 238, ${m.alpha * twinkle * 0.6})`;
        } else {
          ctx.fillStyle = `rgba(218, 186, 122, ${m.alpha * twinkle})`;
        }
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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const nx = e.clientX / Math.max(1, window.innerWidth);
    const ny = e.clientY / Math.max(1, window.innerHeight);
    pointerRef.current = { x: nx, y: ny };
    setTilt({
      rx: Number(((0.5 - ny) * 5).toFixed(2)),
      ry: Number(((nx - 0.5) * 6).toFixed(2)),
    });
  };

  if (!visible) return null;

  return (
    <div
      key={cycle}
      role="dialog"
      aria-label="CREATOR STUDIO Cinema Intro"
      onPointerMove={handlePointerMove}
      className="no-print fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden text-[#FAF6EE]"
    >
      {/* Top & Bottom Luxury Obsidian Split Curtains */}
      <div
        aria-hidden="true"
        style={{
          backgroundColor: "#05070A",
          backgroundImage:
            "radial-gradient(ellipse 85% 95% at 50% 100%, rgba(200, 169, 106, 0.14), rgba(15, 118, 110, 0.07) 48%, transparent 80%)",
          transition: "transform 740ms cubic-bezier(0.77, 0, 0.175, 1)",
        }}
        className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 border-b border-[#D4B475]/35 ${
          exiting ? "-translate-y-full" : "translate-y-0"
        }`}
      />
      <div
        aria-hidden="true"
        style={{
          backgroundColor: "#05070A",
          backgroundImage:
            "radial-gradient(ellipse 85% 95% at 50% 0%, rgba(200, 169, 106, 0.14), rgba(15, 118, 110, 0.07) 48%, transparent 80%)",
          transition: "transform 740ms cubic-bezier(0.77, 0, 0.175, 1)",
        }}
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/2 border-t border-[#D4B475]/35 ${
          exiting ? "translate-y-full" : "translate-y-0"
        }`}
      />

      {/* Interactive Layer */}
      <div
        style={{
          transition: "opacity 440ms ease, transform 560ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`relative flex h-full w-full flex-col items-center justify-between px-5 py-6 sm:px-10 sm:py-9 ${
          exiting ? "pointer-events-none scale-[1.025] opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* 60fps Architectural Canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Ambient Aurora & Horizontal Scan Line */}
        <div
          aria-hidden="true"
          className="fcs-intro-aurora pointer-events-none absolute top-1/2 left-1/2 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-[#C8A96A]/15 via-teal-500/12 to-transparent blur-3xl"
        />
        <div
          aria-hidden="true"
          className="fcs-intro-scanline pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4B475]/55 to-transparent"
        />

        {/* Architectural Corner Brackets */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 rounded-2xl border border-[#D4B475]/18 sm:inset-7"
        >
          <span className="absolute -top-px -left-px h-5 w-5 rounded-tl-2xl border-t-2 border-l-2 border-[#D4B475]/75" />
          <span className="absolute -top-px -right-px h-5 w-5 rounded-tr-2xl border-t-2 border-r-2 border-[#D4B475]/75" />
          <span className="absolute -bottom-px -left-px h-5 w-5 rounded-bl-2xl border-b-2 border-l-2 border-[#D4B475]/75" />
          <span className="absolute -right-px -bottom-px h-5 w-5 rounded-br-2xl border-r-2 border-b-2 border-[#D4B475]/75" />
        </div>

        {/* Top Header Bar */}
        <div className="relative z-20 flex w-full max-w-6xl items-center justify-between gap-4 pt-1">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#D4B475]/25 bg-[#0E1117]/80 px-3.5 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            <span className="font-mono text-[10px] font-medium tracking-[0.26em] text-[#E6D4AD] uppercase">
              Atelier Edition &bull; 2026
            </span>
          </div>

          <button
            type="button"
            onClick={dismissIntro}
            className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-[#D4B475]/45 bg-[#11151D]/85 px-4 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-[#F5EFE6] uppercase backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-[#D4B475] hover:bg-[#19202B] hover:text-white"
          >
            <span>Enter Studio</span>
            <kbd className="hidden rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-[#C8B99B] sm:inline">
              ESC
            </kbd>
            <span className="inline-block text-[#D4B475] transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>

        {/* Center 3D Parallax Cinema Stage */}
        <div
          style={{
            transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="relative z-10 mx-auto my-auto flex w-full max-w-3xl flex-col items-center px-4 py-4 text-center"
        >
          <p className="fcs-intro-subtitle font-mono text-[10px] font-semibold tracking-[0.44em] text-[#14B8A6] uppercase">
            Precision Document Engineering
          </p>

          {/* Bespoke Chronometer Medallion */}
          <div className="fcs-intro-emblem relative mx-auto mt-5 flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
            {/* Precision 60-Tick Watchmaker Dial SVG */}
            <svg
              viewBox="0 0 160 160"
              aria-hidden="true"
              className="fcs-intro-orbit pointer-events-none absolute inset-0 h-full w-full"
            >
              <circle
                cx="80"
                cy="80"
                r="76"
                fill="none"
                stroke="rgba(212,180,117,0.22)"
                strokeWidth="1"
              />
              {Array.from({ length: 36 }).map((_, idx) => {
                const angle = (idx * 10 * Math.PI) / 180;
                const major = idx % 3 === 0;
                const r1 = major ? 69 : 72;
                const r2 = 76;
                return (
                  <line
                    key={idx}
                    x1={80 + Math.cos(angle) * r1}
                    y1={80 + Math.sin(angle) * r1}
                    x2={80 + Math.cos(angle) * r2}
                    y2={80 + Math.sin(angle) * r2}
                    stroke={major ? "rgba(212,180,117,0.72)" : "rgba(212,180,117,0.26)"}
                    strokeWidth={major ? "1.4" : "0.8"}
                  />
                );
              })}
            </svg>

            {/* Counter-Rotating Emerald & Brass Guilloche Orbit */}
            <div
              aria-hidden="true"
              className="fcs-intro-orbit-reverse absolute inset-3.5 rounded-full border border-dashed border-[#14B8A6]/45"
            />
            <div
              aria-hidden="true"
              className="fcs-intro-ring absolute inset-2 rounded-full border border-[#D4B475]/35"
            />

            {/* Obsidian Glass Emblem Core */}
            <div
              aria-hidden="true"
              className="absolute inset-6 rounded-full bg-gradient-to-b from-[#1A2029] via-[#0E1117] to-[#080A0D] shadow-[0_28px_70px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-[#D4B475]/55"
            />
            <CreatorStudioLogo size={68} animated={true} className="relative z-10 block" />
          </div>

          {/* Display Wordmark + Sweeping Metallic Sheen */}
          <div className="relative mt-6 overflow-hidden px-2">
            <h1 className="fcs-intro-title bg-gradient-to-r from-[#FAF6EE] via-[#F7E5BE] to-[#D6F5EF] bg-clip-text font-serif text-4xl font-semibold tracking-[0.2em] text-transparent uppercase sm:text-6xl">
              CREATOR STUDIO
            </h1>
            <div
              aria-hidden="true"
              className="fcs-intro-sheen pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          </div>

          {/* Sculpted Gold Rule with Diamond Node */}
          <div className="fcs-intro-rule relative mx-auto mt-4 flex w-44 items-center justify-center">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4B475]/80 to-[#D4B475]" />
            <span className="fcs-intro-diamond mx-2.5 h-2 w-2 border border-[#F7E5BE] bg-[#D4B475]" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D4B475]/80 to-[#D4B475]" />
          </div>

          <p className="fcs-intro-subtitle mt-4 text-[11px] font-semibold tracking-[0.32em] text-[#D8CFC0] uppercase sm:text-xs">
            Create Your Future &bull; Design Your Identity
          </p>

          {/* 3-Pillar Studio Ribbon */}
          <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3">
            {PILLARS.map((pillar, idx) => (
              <div
                key={pillar.code}
                className={`fcs-intro-pillar-${idx + 1} rounded-xl border border-[#D4B475]/22 bg-[#0E131B]/75 px-3.5 py-2.5 text-left backdrop-blur-md`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-[#D4B475]">
                    {pillar.code}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
                </div>
                <p className="mt-1 text-xs font-bold tracking-wide text-[#FAF6EE]">
                  {pillar.title}
                </p>
                <p className="text-[10px] text-[#9BA3B0]">{pillar.meta}</p>
              </div>
            ))}
          </div>

          {/* Live Precision Progress & Telemetry */}
          <div className="mt-6 w-full max-w-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-[#B8AF9F] uppercase">
              <span>Initializing Workspace</span>
              <span className="font-semibold text-[#F5E3BC] tabular-nums">{percent}%</span>
            </div>
            <div className="h-[2.5px] w-full overflow-hidden rounded-full bg-white/10">
              <div className="fcs-intro-progress h-full w-full rounded-full bg-gradient-to-r from-[#D4B475] via-[#FAF6EE] to-[#14B8A6]" />
            </div>
          </div>
        </div>

        {/* Bottom Craft Signature */}
        <div className="fcs-intro-bottom relative z-20 flex flex-col items-center gap-1.5 pb-1">
          <p className="text-[11px] font-bold tracking-[0.42em] text-[#D4B475] uppercase">
            CRAFTED &amp; BUILT BY FRANCIS
          </p>
          <p className="font-mono text-[9px] tracking-[0.28em] text-[#8E96A4] uppercase">
            Free Forever &bull; Open Source &bull; Zero Paywalls
          </p>
        </div>
      </div>
    </div>
  );
}
