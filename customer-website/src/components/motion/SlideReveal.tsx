"use client";

import React, { useEffect, useRef, useState } from "react";

interface SlideRevealProps {
  children: React.ReactNode;
  direction?: "up" | "left" | "right" | "clip";
  delay?: number;
  duration?: number;
  className?: string;
}

export function SlideReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 560,
  className = "",
}: SlideRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -12px 0px" }
    );

    observer.observe(el);
    const safetyTimer = window.setTimeout(() => setRevealed(true), 1050 + delay);

    return () => {
      observer.disconnect();
      window.clearTimeout(safetyTimer);
    };
  }, [delay]);

  const hiddenClass =
    direction === "left"
      ? "fcs-slide-reveal-hidden-left"
      : direction === "right"
        ? "fcs-slide-reveal-hidden-right"
        : direction === "clip"
          ? "fcs-slide-reveal-hidden-clip"
          : "fcs-slide-reveal-hidden-up";

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
      className={`fcs-slide-reveal ${
        revealed ? "fcs-slide-reveal-visible" : hiddenClass
      } ${className}`}
    >
      {children}
    </div>
  );
}
