"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CreatorStudioLogo } from "./CreatorStudioLogo";

const STUDIO_CREDITS = [
  "AI Resume Studio",
  "Certificate Atelier",
  "QR Verification",
  "Creator AI",
] as const;

const INTRO_DURATION_MS = 3350;

function formatCinemaTimecode(elapsedMs: number): string {
  const clampedMs = Math.max(0, Math.min(INTRO_DURATION_MS, elapsedMs));
  const totalSeconds = Math.floor(clampedMs / 1000);
  const frames = Math.min(23, Math.floor(((clampedMs % 1000) / 1000) * 24));
  const ss = String(totalSeconds).padStart(2, "0");
  const ff = String(frames).padStart(2, "0");
  return `00:00:${ss}:${ff}`;
}

export function IntroSplash() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [timecode, setTimecode] = useState("00:00:00:00");
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const exitingRef = useRef(false);

  const dismissIntro = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setTimecode(formatCinemaTimecode(INTRO_DURATION_MS));
    setExiting(true);
    window.setTimeout(() => {
      setVisible(false);
      setExiting(false);
      exitingRef.current = false;
    }, 760);
  }, []);

  // Auto-play on fresh homepage entry (never block deep-links, respect ?no-intro=1 & reduced motion)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (params.get("no-intro") === "1" || reducedMotion) {
      setVisible(false);
      return;
    }

    const isHomeEntry = window.location.pathname === "/";
    if (isHomeEntry) {
      window.sessionStorage.setItem("fcs-intro-played", "1");
      exitingRef.current = false;
      setTimecode("00:00:00:00");
      setExiting(false);
      setVisible(true);
    }
  }, []);

  // Replay Intro event listener (from Hero "Cinema Intro" or Footer "Replay Studio Intro")
  useEffect(() => {
    const onReplay = () => {
      exitingRef.current = false;
      setTimecode("00:00:00:00");
      setCycle((c) => c + 1);
      setExiting(false);
      setVisible(true);
    };
    window.addEventListener("fcs:replay-intro", onReplay);
    return () => window.removeEventListener("fcs:replay-intro", onReplay);
  }, []);

  // Timeline & keyboard escape / enter / space skip
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
    }, INTRO_DURATION_MS);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(exitTimer);
    };
  }, [visible, cycle, dismissIntro]);

  // 60fps Anamorphic Projector Beams, Bokeh Depth & Golden Film Dust
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

    const bokehOrbs = Array.from({ length: 10 }, (_, idx) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.16,
      r: 22 + Math.random() * 44,
      alpha: 0.03 + Math.random() * 0.045,
      tone: idx % 3 === 0 ? "teal" : "gold",
    }));

    const motes = Array.from({ length: 48 }, (_, idx) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -0.16 - Math.random() * 0.34,
      r: 0.65 + Math.random() * 1.65,
      alpha: 0.2 + Math.random() * 0.52,
      tone: idx % 5 === 0 ? "teal" : idx % 3 === 0 ? "ivory" : "gold",
    }));

    const start = performance.now();
    let lastShownTc = "";

    const render = (now: number) => {
      const elapsedMs = Math.max(0, now - start);
      const elapsed = elapsedMs / 1000;
      const tc = formatCinemaTimecode(elapsedMs);
      if (!exitingRef.current && tc !== lastShownTc) {
        lastShownTc = tc;
        setTimecode(tc);
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const px = (pointerRef.current.x - 0.5) * 42;
      const py = (pointerRef.current.y - 0.5) * 26;
      const cx = w * 0.5 + px;
      const cy = h * 0.48 + py;

      ctx.clearRect(0, 0, w, h);

      // Nocturnal Cinema Focal Glow
      const focalGlow = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.58);
      focalGlow.addColorStop(0, "rgba(212, 180, 117, 0.12)");
      focalGlow.addColorStop(0.38, "rgba(15, 118, 110, 0.08)");
      focalGlow.addColorStop(1, "rgba(4, 6, 8, 0)");
      ctx.fillStyle = focalGlow;
      ctx.fillRect(0, 0, w, h);

      // Soft-Edged Volumetric Cinema Projector Beam (lateral gradient so beam edges feather smoothly)
      const sweepOffset = Math.sin(elapsed * 0.72) * (w * 0.14) + px * 1.1;
      const beamCenterX = w * 0.52 + sweepOffset * 0.7;
      const beamHalfW = Math.max(w * 0.34, 280);
      const beamGrad = ctx.createLinearGradient(
        beamCenterX - beamHalfW,
        h * 0.15,
        beamCenterX + beamHalfW,
        h * 0.85
      );
      beamGrad.addColorStop(0, "rgba(212, 180, 117, 0)");
      beamGrad.addColorStop(0.28, "rgba(212, 180, 117, 0.045)");
      beamGrad.addColorStop(0.5, "rgba(232, 206, 152, 0.075)");
      beamGrad.addColorStop(0.72, "rgba(20, 184, 166, 0.045)");
      beamGrad.addColorStop(1, "rgba(20, 184, 166, 0)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, w, h);

      // Soft Out-of-Focus Optical Bokeh Discs
      for (const orb of bokehOrbs) {
        orb.x += orb.vx + px * 0.004;
        orb.y += orb.vy + py * 0.004;
        if (orb.x < -orb.r) orb.x = w + orb.r;
        if (orb.x > w + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = h + orb.r;
        if (orb.y > h + orb.r) orb.y = -orb.r;

        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        if (orb.tone === "teal") {
          g.addColorStop(0, `rgba(20, 184, 166, ${orb.alpha})`);
          g.addColorStop(0.65, `rgba(15, 118, 110, ${orb.alpha * 0.35})`);
          g.addColorStop(1, "rgba(15, 118, 110, 0)");
        } else {
          g.addColorStop(0, `rgba(232, 206, 152, ${orb.alpha})`);
          g.addColorStop(0.65, `rgba(212, 180, 117, ${orb.alpha * 0.3})`);
          g.addColorStop(1, "rgba(212, 180, 117, 0)");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Luminous Champagne & Emerald Projector Dust Motes
      for (const m of motes) {
        m.x += m.vx + (pointerRef.current.x - 0.5) * 0.14;
        m.y += m.vy;
        if (m.y < -12) m.y = h + 12;
        if (m.x < -12) m.x = w + 12;
        if (m.x > w + 12) m.x = -12;

        const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 2.4 + m.x * 0.028);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        if (m.tone === "teal") {
          ctx.fillStyle = `rgba(45, 212, 191, ${m.alpha * twinkle * 0.72})`;
        } else if (m.tone === "ivory") {
          ctx.fillStyle = `rgba(250, 246, 238, ${m.alpha * twinkle * 0.65})`;
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
      rx: Number(((0.5 - ny) * 4.5).toFixed(2)),
      ry: Number(((nx - 0.5) * 5.5).toFixed(2)),
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
      {/* Top & Bottom Obsidian Velvet Split Curtains */}
      <div
        aria-hidden="true"
        style={{
          backgroundColor: "#040608",
          backgroundImage:
            "radial-gradient(ellipse 85% 95% at 50% 100%, rgba(212, 180, 117, 0.12), rgba(15, 118, 110, 0.07) 48%, transparent 80%)",
          transition: "transform 740ms cubic-bezier(0.77, 0, 0.175, 1)",
        }}
        className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 ${
          exiting ? "-translate-y-full border-b border-[#D4B475]/40" : "translate-y-0"
        }`}
      />
      <div
        aria-hidden="true"
        style={{
          backgroundColor: "#040608",
          backgroundImage:
            "radial-gradient(ellipse 85% 95% at 50% 0%, rgba(212, 180, 117, 0.12), rgba(15, 118, 110, 0.07) 48%, transparent 80%)",
          transition: "transform 740ms cubic-bezier(0.77, 0, 0.175, 1)",
        }}
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/2 ${
          exiting ? "translate-y-full border-t border-[#D4B475]/40" : "translate-y-0"
        }`}
      />

      {/* Interactive Cinema Stage */}
      <div
        style={{
          transition: "opacity 440ms ease, transform 580ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`relative flex h-full w-full flex-col justify-between ${
          exiting ? "pointer-events-none scale-[1.03] opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* 60fps Projector & Bokeh Canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Ambient Studio Aurora & Optical Vignette */}
        <div
          aria-hidden="true"
          className="fcs-intro-aurora pointer-events-none absolute top-1/2 left-1/2 h-[440px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-[#D4B475]/16 via-[#0F766E]/14 to-transparent blur-3xl"
        />
        <div
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 50% 48%, transparent 30%, rgba(3, 5, 8, 0.82) 100%)",
          }}
          className="pointer-events-none absolute inset-0"
        />

        {/* Upper CinemaScope Letterbox Matte Bar */}
        <header className="relative z-20 flex w-full items-center justify-between gap-2 border-b border-[#D4B475]/25 bg-[#020305]/92 px-4 py-3 backdrop-blur-md sm:px-9 sm:py-3.5">
          <div className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap sm:gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#D4B475] shadow-[0_0_10px_rgba(212,180,117,0.9)]" />
            <span className="font-mono text-[10px] font-medium tracking-[0.16em] text-[#E6D4AD] uppercase sm:tracking-[0.28em]">
              Francis Atelier
              <span className="hidden sm:inline"> &bull; Premiere</span>
            </span>
          </div>

          <button
            type="button"
            onClick={dismissIntro}
            className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#D4B475]/45 bg-[#12161E]/85 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap text-[#FAF6EE] uppercase backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-[#D4B475] hover:bg-[#1B222C] hover:text-white sm:px-4 sm:tracking-[0.2em]"
          >
            <span>Enter Studio</span>
            <kbd className="hidden rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-[#D4B475] sm:inline">
              ESC
            </kbd>
            <span className="inline-block text-[#D4B475] transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </header>

        {/* Widescreen 2.39:1 Optical Focal Stage */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-6">
          {/* 35mm Viewfinder Corner Crop Marks */}
          <div
            aria-hidden="true"
            className="fcs-cinema-matte-rule pointer-events-none absolute inset-4 sm:inset-8"
          >
            <span className="absolute top-0 left-0 h-4 w-4 border-t border-l border-[#D4B475]/45" />
            <span className="absolute top-0 right-0 h-4 w-4 border-t border-r border-[#D4B475]/45" />
            <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-[#D4B475]/45" />
            <span className="absolute right-0 bottom-0 h-4 w-4 border-r border-b border-[#D4B475]/45" />
          </div>

          {/* 3D Parallax Title Centerpiece */}
          <div
            style={{
              transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center"
          >
            {/* Opening Production Credit */}
            <div className="fcs-cinema-kicker flex items-center justify-center gap-3">
              <span className="hidden h-px w-8 bg-gradient-to-r from-transparent to-[#D4B475]/65 sm:block" />
              <p className="font-mono text-[10px] font-medium tracking-[0.34em] text-[#D4B475] uppercase sm:tracking-[0.44em]">
                A Francis Studio Production
              </p>
              <span className="hidden h-px w-8 bg-gradient-to-l from-transparent to-[#D4B475]/65 sm:block" />
            </div>

            {/* Luxury Faceted Atelier Medallion */}
            <div className="fcs-cinema-focus relative mx-auto mt-5 flex h-32 w-32 items-center justify-center sm:mt-6 sm:h-36 sm:w-36">
              <div
                aria-hidden="true"
                className="fcs-intro-orbit absolute inset-0 rounded-full border border-dashed border-[#D4B475]/40"
              />
              <div
                aria-hidden="true"
                className="fcs-intro-orbit-reverse absolute inset-2.5 rounded-full border border-[#14B8A6]/35"
              />
              <div
                aria-hidden="true"
                className="fcs-intro-ring absolute inset-1 rounded-full border border-[#D4B475]/25"
              />
              <div
                aria-hidden="true"
                className="absolute inset-5 rounded-full bg-gradient-to-b from-[#171D26] via-[#0C1016] to-[#06080B] shadow-[0_28px_72px_rgba(0,0,0,0.92),inset_0_1px_1px_rgba(255,255,255,0.22)] ring-1 ring-[#D4B475]/55"
              />
              <CreatorStudioLogo size={62} animated={true} className="relative z-10 block" />
            </div>

            {/* Anamorphic Wordmark + Optical Horizontal Flare */}
            <div className="relative mt-6 w-full overflow-hidden px-2 py-1 sm:mt-7">
              <div
                aria-hidden="true"
                className="fcs-cinema-flare pointer-events-none absolute top-1/2 left-1/2 h-[2px] w-[88%] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[#F6E6C2]/65 to-transparent blur-[1px]"
              />
              <h1 className="fcs-cinema-title relative bg-gradient-to-r from-[#FAF6EE] via-[#F4DFB4] to-[#C6F4EA] bg-clip-text font-serif text-[1.95rem] leading-tight font-semibold whitespace-nowrap text-transparent uppercase sm:text-5xl md:text-[3.85rem]">
                CREATOR STUDIO
              </h1>
              <div
                aria-hidden="true"
                className="fcs-intro-sheen pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-transparent via-white/35 to-transparent"
              />
            </div>

            {/* Sculpted Champagne-Gold Hairline Crest */}
            <div className="fcs-intro-rule relative mx-auto mt-3.5 flex w-48 items-center justify-center sm:mt-4 sm:w-56">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4B475]/80 to-[#D4B475]" />
              <span className="fcs-intro-diamond mx-2.5 h-2 w-2 border border-[#F7E5BE] bg-[#D4B475]" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D4B475]/80 to-[#D4B475]" />
            </div>

            {/* Editorial Logline */}
            <p className="fcs-cinema-logline mt-4 max-w-xl font-serif text-base font-medium tracking-[0.06em] text-[#EAE2D3] italic sm:text-xl">
              Your Ideas. Your Creativity. One Intelligent Studio.
            </p>

            {/* Opening Film Title Discipline Credits (Typography Only) */}
            <div className="fcs-cinema-credits mt-5 grid grid-cols-2 items-center gap-x-5 gap-y-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#A8B2C1] uppercase sm:flex sm:flex-wrap sm:justify-center sm:gap-x-4 sm:text-[11px] sm:tracking-[0.22em]">
              {STUDIO_CREDITS.map((credit, index) => (
                <React.Fragment key={credit}>
                  {index > 0 && (
                    <span aria-hidden="true" className="hidden text-[#14B8A6] sm:inline">
                      &bull;
                    </span>
                  )}
                  <span className="whitespace-nowrap text-[#D8CFC0]">{credit}</span>
                </React.Fragment>
              ))}
            </div>

            {/* Signature Film End-Card Credit */}
            <div className="fcs-cinema-signature mt-7 flex flex-col items-center gap-1.5 sm:mt-8">
              <p className="text-[11px] font-bold tracking-[0.38em] text-[#D4B475] uppercase">
                Crafted &amp; Built by Francis
              </p>
              <p className="font-mono text-[9px] tracking-[0.26em] text-[#8D97A6] uppercase">
                Atelier Edition &bull; 2026
              </p>
            </div>
          </div>
        </div>

        {/* Lower CinemaScope Letterbox Matte Bar */}
        <footer className="relative z-20 flex w-full items-center justify-between gap-4 border-t border-[#D4B475]/20 bg-[#020305]/92 px-4 py-2.5 backdrop-blur-md sm:px-9 sm:py-3">
          {/* Full-Bleed Cinema Progress Seam */}
          <div
            aria-hidden="true"
            className="fcs-cinema-horizon pointer-events-none absolute -top-px right-0 left-0 h-[1.5px] bg-gradient-to-r from-[#D4B475] via-[#FAF6EE] to-[#14B8A6] shadow-[0_0_12px_rgba(212,180,117,0.45)]"
          />

          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#9BA5B4] uppercase">
            <span className="text-[#D4B475]">24 FPS</span>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <span className="text-[#E6D4AD] tabular-nums">{timecode}</span>
          </div>

          <p className="hidden font-mono text-[9px] tracking-[0.28em] text-[#D4B475]/80 uppercase sm:block">
            Atelier Cut &bull; Widescreen 2.39:1
          </p>

          <p className="font-mono text-[9px] tracking-[0.22em] text-[#8E96A4] uppercase sm:text-[10px]">
            Free Forever &bull; Open Source
          </p>
        </footer>
      </div>
    </div>
  );
}
