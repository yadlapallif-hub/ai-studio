"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { CertificateCanvasElement, CertificateStyleConfig } from "@francis/shared";

interface CertificateCanvasProps {
  certificateCode: string;
  title: string;
  recipientName: string;
  courseOrAchievement: string;
  organizationName: string;
  description: string;
  issueDate: string;
  expiryDate: string;
  signatoryName: string;
  signatoryDesignation: string;
  orientation: "landscape" | "portrait";
  elements: CertificateCanvasElement[];
  style: CertificateStyleConfig;
  selectedElementId?: string | null;
  interactive?: boolean;
  onSelectElement?: (id: string | null) => void;
  onUpdateElementPosition?: (id: string, x: number, y: number) => void;
}

const FONT_MAP: Record<string, string> = {
  "Cormorant Garamond": "var(--font-serif), Georgia, serif",
  "Playfair Display": "Georgia, 'Playfair Display', serif",
  Cinzel: "Georgia, 'Cinzel', serif",
  "Source Serif 4": "var(--font-serif), Georgia, serif",
  "Plus Jakarta Sans": "var(--font-sans), system-ui, sans-serif",
  Inter: "'Inter', system-ui, sans-serif",
  "Space Grotesk": "'Space Grotesk', system-ui, sans-serif",
  "IBM Plex Sans": "'IBM Plex Sans', system-ui, sans-serif",
  "DM Sans": "'DM Sans', system-ui, sans-serif",
};

function isDarkHex(hex?: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  const clean = hex.slice(1);
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (full.length !== 6) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

function getInkFilter(inkStyle?: CertificateCanvasElement["inkStyle"]): React.CSSProperties {
  if (inkStyle === "blue_ink") {
    return { filter: "sepia(1) hue-rotate(190deg) saturate(4) brightness(0.85)" };
  }
  if (inkStyle === "red_ink") {
    return { filter: "sepia(1) hue-rotate(325deg) saturate(5) brightness(0.85)" };
  }
  if (inkStyle === "gold_embossed") {
    return {
      filter: "drop-shadow(0 2px 3px rgba(146, 64, 14, 0.35)) contrast(1.08) saturate(1.2)",
    };
  }
  return {};
}

export const CertificateCanvas = React.forwardRef<HTMLDivElement, CertificateCanvasProps>(
  function CertificateCanvas(props, ref) {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [dragging, setDragging] = useState<{
      id: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      rectW: number;
      rectH: number;
    } | null>(null);

    const baseWidth = props.orientation === "landscape" ? 1123 : 794;
    const baseHeight = props.orientation === "landscape" ? 794 : 1123;

    useEffect(() => {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "https://franciscreatorstudio.org";
      const verifyUrl = `${origin}/verify/${encodeURIComponent(props.certificateCode)}`;
      QRCode.toDataURL(verifyUrl, {
        width: 140,
        margin: 1,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    }, [props.certificateCode]);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || !props.onUpdateElementPosition) return;
      const dxPct = ((e.clientX - dragging.startX) / dragging.rectW) * 100;
      const dyPct = ((e.clientY - dragging.startY) / dragging.rectH) * 100;
      const nextX = Math.max(2, Math.min(94, Math.round(dragging.origX + dxPct)));
      const nextY = Math.max(2, Math.min(94, Math.round(dragging.origY + dyPct)));
      props.onUpdateElementPosition(dragging.id, nextX, nextY);
    };

    const handlePointerUp = () => {
      setDragging(null);
    };

    const { style } = props;
    const displayFont = FONT_MAP[style.fontDisplay] || FONT_MAP["Cormorant Garamond"];
    const bodyFont = FONT_MAP[style.fontBody] || FONT_MAP["Plus Jakarta Sans"];
    const darkBg = isDarkHex(style.backgroundColor);

    const bodyTextColor = darkBg ? "#E2E8F0" : "#334155";
    const mutedTextColor = darkBg ? "#94A3B8" : "#64748B";
    const strongTextColor = darkBg ? "#F8FAFC" : "#0F172A";

    const borderKey = (style.borderStyle || "double-gold") as string;
    const borderFrameClass =
      !style.showBorder || borderKey === "none"
        ? ""
        : borderKey === "double-gold" ||
            borderKey === "prestige-navy" ||
            borderKey === "board-crest"
          ? "border-[6px] border-double"
          : borderKey === "clean-grid" || borderKey === "modern-frame"
            ? "border-2"
            : borderKey === "editorial-warm"
              ? "border-[5px]"
              : "border-[4px]";

    const showCrestHeader =
      style.showBorder && (borderKey === "academic-crest" || borderKey === "board-crest");
    const showCornerBlocks =
      style.showBorder &&
      (borderKey === "architectural" || borderKey === "modern-frame");
    const showFiligreeRings =
      style.showBorder &&
      (borderKey === "filigree" || borderKey === "double-gold" || borderKey === "prestige-navy");

    return (
      <div
        ref={ref}
        onPointerMove={props.interactive ? handlePointerMove : undefined}
        onPointerUp={props.interactive ? handlePointerUp : undefined}
        onClick={() => props.interactive && props.onSelectElement?.(null)}
        className="print-only-canvas relative select-none overflow-hidden shadow-xl"
        style={{
          width: baseWidth,
          height: baseHeight,
          backgroundColor: style.backgroundColor || "#FFFDF7",
          color: style.primaryColor || "#0F4C5C",
          fontFamily: bodyFont,
          backgroundImage:
            borderKey === "clean-grid"
              ? `linear-gradient(to right, ${style.accentColor || "#0F766E"}12 1px, transparent 1px), linear-gradient(to bottom, ${style.accentColor || "#0F766E"}12 1px, transparent 1px)`
              : undefined,
          backgroundSize: borderKey === "clean-grid" ? "28px 28px" : undefined,
        }}
      >
        {/* Architectural / Decorative Outer Frame */}
        <div
          className={`pointer-events-none absolute inset-5 ${borderFrameClass}`}
          style={{ borderColor: style.accentColor || "#C59B27" }}
        >
          <div
            className="absolute inset-2 border"
            style={{
              borderColor: `${style.accentColor || "#C59B27"}55`,
              borderStyle: borderKey === "editorial-warm" ? "dashed" : "solid",
            }}
          />
        </div>

        {/* Corner Ornaments */}
        {style.showBorder && borderKey !== "none" && (
          <>
            <div
              className="pointer-events-none absolute top-8 left-8 h-8 w-8 border-t-4 border-l-4"
              style={{ borderColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute top-8 right-8 h-8 w-8 border-t-4 border-r-4"
              style={{ borderColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4"
              style={{ borderColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute right-8 bottom-8 h-8 w-8 border-r-4 border-b-4"
              style={{ borderColor: style.accentColor }}
            />
          </>
        )}

        {showCornerBlocks && (
          <>
            <div
              className="pointer-events-none absolute top-6 left-6 h-3 w-3"
              style={{ backgroundColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute top-6 right-6 h-3 w-3"
              style={{ backgroundColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute bottom-6 left-6 h-3 w-3"
              style={{ backgroundColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute right-6 bottom-6 h-3 w-3"
              style={{ backgroundColor: style.accentColor }}
            />
          </>
        )}

        {showFiligreeRings && (
          <>
            <div
              className="pointer-events-none absolute top-9 left-9 h-4 w-4 rounded-full border-2"
              style={{ borderColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute top-9 right-9 h-4 w-4 rounded-full border-2"
              style={{ borderColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute bottom-9 left-9 h-4 w-4 rounded-full border-2"
              style={{ borderColor: style.accentColor }}
            />
            <div
              className="pointer-events-none absolute right-9 bottom-9 h-4 w-4 rounded-full border-2"
              style={{ borderColor: style.accentColor }}
            />
          </>
        )}

        {/* Core Certificate Typography */}
        <div
          className={`relative z-10 flex h-full flex-col items-center justify-between text-center ${
            props.orientation === "landscape" ? "px-20 py-14" : "px-14 py-20"
          }`}
        >
          <div className="space-y-2">
            {showCrestHeader && (
              <div className="mb-1 flex justify-center">
                <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    stroke={style.accentColor || "#C59B27"}
                    strokeWidth="1.8"
                  />
                  <path
                    d="M18 8L20.8 14.2L27.5 14.9L22.4 19.3L24 26L18 22.3L12 26L13.6 19.3L8.5 14.9L15.2 14.2L18 8Z"
                    fill={style.accentColor || "#C59B27"}
                    fillOpacity="0.85"
                  />
                </svg>
              </div>
            )}
            <p
              className="text-xs font-bold tracking-[0.28em] uppercase"
              style={{ color: style.accentColor }}
            >
              {props.organizationName || "Organization Name"}
            </p>
            <h1
              className="text-5xl font-bold tracking-tight"
              style={{ fontFamily: displayFont, color: style.primaryColor }}
            >
              {props.title || "Certificate of Completion"}
            </h1>
            <div
              className="mx-auto mt-3 h-0.5 w-36"
              style={{ backgroundColor: style.accentColor }}
            />
          </div>

          <div className="max-w-3xl space-y-4">
            <p
              className="text-sm tracking-widest uppercase"
              style={{ color: mutedTextColor }}
            >
              This credential is proudly presented to
            </p>
            <p
              className="border-b pb-2 text-5xl font-bold"
              style={{
                fontFamily: displayFont,
                color: style.primaryColor,
                borderColor: `${style.accentColor}66`,
              }}
            >
              {props.recipientName || "Recipient Name"}
            </p>
            <p className="pt-2 text-base" style={{ color: bodyTextColor }}>
              in recognition of successfully completing{" "}
              <strong className="font-bold" style={{ color: style.primaryColor }}>
                {props.courseOrAchievement || "Course or Achievement"}
              </strong>
            </p>
            {props.description && (
              <p
                className="mx-auto max-w-2xl text-sm leading-relaxed"
                style={{ color: bodyTextColor }}
              >
                {props.description}
              </p>
            )}
          </div>

          {/* Footer Signatory, Dates & QR Block */}
          <div className="grid w-full grid-cols-3 items-end gap-8 pt-4">
            <div className="text-left">
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: mutedTextColor }}
              >
                Issue Date
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: strongTextColor }}>
                {props.issueDate || "—"}
              </p>
              {props.expiryDate && (
                <p className="mt-0.5 text-[11px]" style={{ color: mutedTextColor }}>
                  Expires: {props.expiryDate}
                </p>
              )}
              <p className="mt-2 font-mono text-[11px]" style={{ color: mutedTextColor }}>
                ID: {props.certificateCode}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div
                className="mb-2 h-10 w-44 border-b"
                style={{ borderColor: `${mutedTextColor}88` }}
              />
              <p className="text-sm font-bold" style={{ color: strongTextColor }}>
                {props.signatoryName || "Authorized Signatory"}
              </p>
              <p className="text-xs" style={{ color: mutedTextColor }}>
                {props.signatoryDesignation || "Program Director"}
              </p>
            </div>

            <div className="flex flex-col items-end">
              {style.showQrCode && qrDataUrl && (
                <div className="rounded-lg border border-slate-200 bg-white p-1.5 text-center shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={`QR Verification ${props.certificateCode}`}
                    className="h-16 w-16"
                  />
                  <p className="mt-0.5 text-[8px] font-semibold tracking-wider uppercase text-slate-600">
                    Scan to Verify
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Draggable & Layered Graphic Elements (Logos, Photos, Stamps, Seals, Signatures) */}
        {[...props.elements]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => {
            const isSelected = props.interactive && props.selectedElementId === el.id;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => {
                  if (!props.interactive) return;
                  e.stopPropagation();
                  props.onSelectElement?.(el.id);
                  const parent = e.currentTarget.parentElement;
                  if (!parent) return;
                  const rect = parent.getBoundingClientRect();
                  setDragging({
                    id: el.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: el.x,
                    origY: el.y,
                    rectW: rect.width || baseWidth,
                    rectH: rect.height || baseHeight,
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                className={`absolute ${props.interactive ? "cursor-move" : ""} ${
                  isSelected ? "ring-2 ring-teal-600 ring-offset-2" : ""
                }`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: el.width,
                  height: el.type === "text_block" ? "auto" : el.height,
                  opacity: el.opacity ?? 1,
                  zIndex: 20 + (el.zIndex ?? 1),
                  transform: `rotate(${el.rotation ?? 0}deg)`,
                  ...getInkFilter(el.inkStyle),
                }}
              >
                {el.type === "text_block" ? (
                  <p
                    style={{
                      fontFamily: FONT_MAP[el.fontFamily || style.fontBody] || bodyFont,
                      fontSize: el.fontSize || 16,
                      color: el.color || style.primaryColor,
                      textAlign: el.align || "center",
                    }}
                    className="font-semibold whitespace-pre-wrap"
                  >
                    {el.text || el.label}
                  </p>
                ) : el.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.src}
                    alt={el.label}
                    draggable={false}
                    className={`h-full w-full object-contain ${
                      el.shape === "circle" ? "rounded-full object-cover" : ""
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
      </div>
    );
  }
);
