"use client";

import React from "react";
import { Play } from "lucide-react";

export function ReplayIntroButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.dispatchEvent(new CustomEvent("fcs:replay-intro"));
      }}
      className={`fcs-btn-secondary cursor-pointer px-3 py-1.5 text-[11px] ${className}`.trim()}
    >
      <Play className="h-3 w-3" />
      <span>Replay Studio Intro</span>
    </button>
  );
}
