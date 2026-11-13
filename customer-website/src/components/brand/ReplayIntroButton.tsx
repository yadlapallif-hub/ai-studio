"use client";

import React from "react";
import { Play, Sparkles } from "lucide-react";

export function ReplayIntroButton({
  className = "",
  label = "Replay Cinema Intro",
  variant = "secondary",
}: {
  className?: string;
  label?: string;
  variant?: "secondary" | "gold";
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.dispatchEvent(new CustomEvent("fcs:replay-intro"));
      }}
      className={`${variant === "gold" ? "fcs-btn-gold" : "fcs-btn-secondary"} cursor-pointer px-3 py-1.5 text-[11px] ${className}`.trim()}
    >
      {variant === "gold" ? <Sparkles className="h-3 w-3 text-[#E6D4AD]" /> : <Play className="h-3 w-3" />}
      <span>{label}</span>
    </button>
  );
}
