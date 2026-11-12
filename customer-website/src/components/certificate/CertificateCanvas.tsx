"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Lock, Trash2 } from "lucide-react";
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
  isVerified?: boolean;
  isSample?: boolean;
  selectedElementId?: string | null;
  interactive?: boolean;
  showGrid?: boolean;
  snapToGuides?: boolean;
  onSelectElement?: (id: string | null) => void;
  onUpdateElementPosition?: (id: string, x: number, y: number) => void;
  onUpdateElementSize?: (id: string, width: number, height: number) => void;
  onDeleteElement?: (id: string) => void;
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

function getElementFilter(el: CertificateCanvasElement): React.CSSProperties {
  const filters: string[] = [];
  if (el.type === "recipient_photo" || el.type === "custom_image") {
    if (el.brightness && el.brightness !== 100) filters.push(`brightness(${el.brightness}%)`);
    if (el.contrast && el.contrast !== 100) filters.push(`contrast(${el.contrast}%)`);
    if (el.saturation && el.saturation !== 100) filters.push(`saturate(${el.saturation}%)`);
  }

  const isInlineSvg = Boolean(el.src && el.src.startsWith("data:image/svg+xml"));
  if (isInlineSvg) {
    if (el.inkStyle === "gold_embossed") {
      filters.push("drop-shadow(0 2px 3px rgba(146, 64, 14, 0.28))");
    }
  } else {
    if (el.inkStyle === "blue_ink") {
      filters.push("sepia(1) hue-rotate(190deg) saturate(4) brightness(0.85)");
    } else if (el.inkStyle === "red_ink") {
      filters.push("sepia(1) hue-rotate(325deg) saturate(5) brightness(0.85)");
    } else if (el.inkStyle === "teal_ink") {
      filters.push("sepia(1) hue-rotate(135deg) saturate(3.5) brightness(0.82)");
    } else if (el.inkStyle === "black_ink") {
      filters.push("grayscale(1) contrast(1.35) brightness(0.6)");
    } else if (el.inkStyle === "gold_embossed") {
      filters.push("drop-shadow(0 2px 3px rgba(146, 64, 14, 0.35)) contrast(1.08) saturate(1.2)");
    }
  }

  return filters.length > 0 ? { filter: filters.join(" ") } : {};
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
    const [resizing, setResizing] = useState<{
      id: string;
      startX: number;
      startY: number;
      origW: number;
      origH: number;
      scaleRatio: number;
    } | null>(null);
    const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
    const [snapGuideY, setSnapGuideY] = useState<number | null>(null);

    const { style } = props;
    const baseWidth =
      Number(style.canvasWidth) || (props.orientation === "landscape" ? 1123 : 794);
    const baseHeight =
      Number(style.canvasHeight) || (props.orientation === "landscape" ? 794 : 1123);

    useEffect(() => {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "https://francis-creator-studio.vercel.app";
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
      if (resizing && props.onUpdateElementSize) {
        const dx = (e.clientX - resizing.startX) / resizing.scaleRatio;
        const dy = (e.clientY - resizing.startY) / resizing.scaleRatio;
        const nextW = Math.max(36, Math.min(720, Math.round(resizing.origW + dx)));
        const nextH = Math.max(24, Math.min(720, Math.round(resizing.origH + dy)));
        props.onUpdateElementSize(resizing.id, nextW, nextH);
        return;
      }

      if (!dragging || !props.onUpdateElementPosition) return;
      const dxPct = ((e.clientX - dragging.startX) / dragging.rectW) * 100;
      const dyPct = ((e.clientY - dragging.startY) / dragging.rectH) * 100;
      let nextX = Math.max(2, Math.min(94, Math.round(dragging.origX + dxPct)));
      let nextY = Math.max(2, Math.min(94, Math.round(dragging.origY + dyPct)));

      if (props.snapToGuides !== false) {
        let gX: number | null = null;
        let gY: number | null = null;
        if (Math.abs(nextX - 50) <= 2) {
          nextX = 50;
          gX = 50;
        }
        if (Math.abs(nextY - 50) <= 2) {
          nextY = 50;
          gY = 50;
        }
        for (const sibling of props.elements) {
          if (sibling.id === dragging.id) continue;
          if (gX === null && Math.abs(nextX - sibling.x) <= 2) {
            nextX = sibling.x;
            gX = sibling.x;
          }
          if (gY === null && Math.abs(nextY - sibling.y) <= 2) {
            nextY = sibling.y;
            gY = sibling.y;
          }
        }
        setSnapGuideX(gX);
        setSnapGuideY(gY);
      }

      props.onUpdateElementPosition(dragging.id, nextX, nextY);
    };

    const handlePointerUp = () => {
      setDragging(null);
      setResizing(null);
      setSnapGuideX(null);
      setSnapGuideY(null);
    };

    const displayFont = FONT_MAP[style.fontDisplay] || FONT_MAP["Cormorant Garamond"];
    const bodyFont = FONT_MAP[style.fontBody] || FONT_MAP["Plus Jakarta Sans"];
    const darkBg = isDarkHex(style.backgroundColor);

    const bodyTextColor = darkBg ? "#E2E8F0" : "#334155";
    const mutedTextColor = darkBg ? "#94A3B8" : "#64748B";
    const strongTextColor = darkBg ? "#F8FAFC" : "#0F172A";

    const borderKey = (style.borderStyle || "double-gold") as string;
    const borderThickness = Math.max(1, Math.min(10, Number(style.borderThickness ?? 4)));
    const borderFrameClass =
      !style.showBorder || borderKey === "none"
        ? ""
        : borderKey === "double-gold" ||
            borderKey === "prestige-navy" ||
            borderKey === "board-crest"
          ? "border-double"
          : "border-solid";

    const showCrestHeader =
      style.showBorder && (borderKey === "academic-crest" || borderKey === "board-crest");
    const showCornerBlocks =
      style.showBorder && (borderKey === "architectural" || borderKey === "modern-frame");
    const showFiligreeRings =
      style.showBorder &&
      (borderKey === "filigree" || borderKey === "double-gold" || borderKey === "prestige-navy");

    const titleSizePx = Math.max(24, Math.min(68, Number(style.titleFontSize ?? 44)));
    const recipientSizePx = Math.max(26, Math.min(72, Number(style.recipientFontSize ?? 46)));
    const bodySizePx = Math.max(11, Math.min(24, Number(style.bodyFontSize ?? 15)));
    const letterSpacingEm = Number(style.titleLetterSpacing ?? 0);
    const textAlign = style.textAlign || "center";

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
        {/* Custom Uploaded Background Image Layer */}
        {style.backgroundImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={style.backgroundImageUrl}
            alt="Certificate custom background"
            className={`pointer-events-none absolute inset-0 h-full w-full ${
              style.backgroundFit === "contain" ? "object-contain" : "object-cover"
            }`}
            style={{ opacity: Number(style.backgroundOpacity ?? 0.25) }}
          />
        )}

        {/* Interactive Editor Grid Overlay (hidden on export via data-export-ignore) */}
        {props.interactive && props.showGrid && (
          <div
            data-export-ignore="true"
            className="pointer-events-none absolute inset-0 z-5"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(20,184,166,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,184,166,0.14) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        )}

        {/* Live Smart Snap Guides while dragging */}
        {props.interactive && snapGuideX !== null && (
          <div
            data-export-ignore="true"
            className="pointer-events-none absolute top-0 bottom-0 z-40 w-[1.5px] bg-teal-500/80"
            style={{ left: `${snapGuideX}%` }}
          />
        )}
        {props.interactive && snapGuideY !== null && (
          <div
            data-export-ignore="true"
            className="pointer-events-none absolute right-0 left-0 z-40 h-[1.5px] bg-teal-500/80"
            style={{ top: `${snapGuideY}%` }}
          />
        )}

        {/* Architectural / Decorative Outer Frame */}
        <div
          className={`pointer-events-none absolute inset-5 ${borderFrameClass}`}
          style={{
            borderColor: style.accentColor || "#C59B27",
            borderWidth: !style.showBorder || borderKey === "none" ? 0 : `${borderThickness}px`,
          }}
        >
          {style.showBorder && borderKey !== "none" && (
            <div
              className="absolute inset-2 border"
              style={{
                borderColor: `${style.accentColor || "#C59B27"}55`,
                borderStyle: borderKey === "editorial-warm" ? "dashed" : "solid",
              }}
            />
          )}
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
          className={`relative z-10 flex h-full flex-col justify-between ${
            textAlign === "left"
              ? "items-start text-left"
              : textAlign === "right"
                ? "items-end text-right"
                : "items-center text-center"
          } ${baseWidth >= baseHeight ? "px-20 py-14" : "px-14 py-20"}`}
        >
          <div className="w-full space-y-2">
            {showCrestHeader && (
              <div
                className={`mb-1 flex ${
                  textAlign === "left"
                    ? "justify-start"
                    : textAlign === "right"
                      ? "justify-end"
                      : "justify-center"
                }`}
              >
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
              className="font-bold tracking-tight leading-tight"
              style={{
                fontFamily: displayFont,
                color: style.primaryColor,
                fontSize: `${titleSizePx}px`,
                letterSpacing: `${letterSpacingEm}em`,
              }}
            >
              {props.title || "Certificate of Completion"}
            </h1>
            <div
              className={`mt-3 h-0.5 w-36 ${
                textAlign === "left" ? "mr-auto" : textAlign === "right" ? "ml-auto" : "mx-auto"
              }`}
              style={{ backgroundColor: style.accentColor }}
            />
          </div>

          <div className="max-w-3xl space-y-4">
            <p className="text-sm tracking-widest uppercase" style={{ color: mutedTextColor }}>
              This credential is proudly presented to
            </p>
            <p
              className="border-b pb-2 font-bold leading-tight"
              style={{
                fontFamily: displayFont,
                color: style.primaryColor,
                borderColor: `${style.accentColor}66`,
                fontSize: `${recipientSizePx}px`,
              }}
            >
              {props.recipientName || "Recipient Name"}
            </p>
            <p className="pt-2" style={{ color: bodyTextColor, fontSize: `${bodySizePx + 1}px` }}>
              in recognition of successfully completing{" "}
              <strong className="font-bold" style={{ color: style.primaryColor }}>
                {props.courseOrAchievement || "Course or Achievement"}
              </strong>
            </p>
            {props.description && (
              <p
                className={`max-w-2xl leading-relaxed ${
                  textAlign === "left" ? "mr-auto" : textAlign === "right" ? "ml-auto" : "mx-auto"
                }`}
                style={{ color: bodyTextColor, fontSize: `${bodySizePx - 1}px` }}
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
              {props.isVerified ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-emerald-800">
                  ✓ Verified Credential
                </span>
              ) : props.isSample ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-amber-800">
                  Sample / Personal Draft
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Draggable, Resizable & Layered Graphic Elements */}
        {[...props.elements]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => {
            const isSelected = props.interactive && props.selectedElementId === el.id;
            const isLocked = Boolean(el.locked);
            const photoShadow =
              el.shadow === "elevated"
                ? "0 14px 28px rgba(15,23,42,0.28)"
                : el.shadow === "soft"
                  ? "0 4px 14px rgba(15,23,42,0.15)"
                  : undefined;

            return (
              <div
                key={el.id}
                onPointerDown={(e) => {
                  if (!props.interactive) return;
                  e.stopPropagation();
                  props.onSelectElement?.(el.id);
                  if (isLocked) return;
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
                className={`absolute ${
                  props.interactive ? (isLocked ? "cursor-not-allowed" : "cursor-move") : ""
                } ${isSelected ? "ring-2 ring-teal-600 ring-offset-2" : ""}`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: el.width,
                  height: el.type === "text_block" ? "auto" : el.height,
                  opacity: el.opacity ?? 1,
                  zIndex: 20 + (el.zIndex ?? 1),
                  transform: `rotate(${el.rotation ?? 0}deg)`,
                  borderRadius:
                    el.shape === "circle" ? "9999px" : el.shape === "id_card" ? "8px" : undefined,
                  border:
                    el.borderWidth && el.borderWidth > 0
                      ? `${el.borderWidth}px solid ${el.borderColor || style.accentColor}`
                      : undefined,
                  boxShadow: photoShadow,
                  ...getElementFilter(el),
                }}
              >
                {el.type === "text_block" ? (
                  <p
                    style={{
                      fontFamily: FONT_MAP[el.fontFamily || style.fontBody] || bodyFont,
                      fontSize: el.fontSize || 16,
                      fontWeight: el.fontWeight || "semibold",
                      fontStyle: el.fontStyle || "normal",
                      textDecoration: el.textDecoration || "none",
                      letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
                      color: el.color || style.primaryColor,
                      textAlign: el.align || "center",
                    }}
                    className="whitespace-pre-wrap"
                  >
                    {el.text || el.label}
                  </p>
                ) : el.type === "signature" ? (
                  <div className="flex h-full w-full flex-col items-center justify-end">
                    {el.src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={el.src}
                        alt={el.label}
                        draggable={false}
                        className="max-h-[75%] w-full object-contain"
                      />
                    )}
                    {(el.signatoryName || el.signatoryDesignation) && (
                      <div
                        className="mt-1 w-full border-t pt-0.5 text-center"
                        style={{ borderColor: `${mutedTextColor}88` }}
                      >
                        {el.signatoryName && (
                          <p
                            className="truncate text-[10px] font-bold"
                            style={{ color: strongTextColor }}
                          >
                            {el.signatoryName}
                          </p>
                        )}
                        {el.signatoryDesignation && (
                          <p className="truncate text-[8px]" style={{ color: mutedTextColor }}>
                            {el.signatoryDesignation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : el.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.src}
                    alt={el.label}
                    draggable={false}
                    className={`h-full w-full ${
                      el.shape === "circle"
                        ? "rounded-full object-cover"
                        : el.shape === "id_card"
                          ? "rounded-md bg-white p-1 object-cover"
                          : el.type === "recipient_photo"
                            ? "rounded-lg object-cover"
                            : "object-contain"
                    }`}
                  />
                ) : null}

                {isSelected && isLocked && (
                  <span
                    data-export-ignore="true"
                    className="no-print absolute -top-3.5 left-0 inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[9px] font-bold text-white shadow"
                  >
                    <Lock className="h-2.5 w-2.5" /> Locked
                  </span>
                )}

                {isSelected && !isLocked && props.onUpdateElementSize && (
                  <div
                    data-export-ignore="true"
                    title="Drag to resize element"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const parent = e.currentTarget.parentElement?.parentElement;
                      const rect = parent?.getBoundingClientRect();
                      const scaleRatio = rect ? rect.width / baseWidth : 1;
                      setResizing({
                        id: el.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        origW: el.width,
                        origH: el.height,
                        scaleRatio: scaleRatio || 1,
                      });
                    }}
                    className="no-print absolute -right-2 -bottom-2 z-40 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-teal-600 shadow"
                  />
                )}

                {isSelected && !isLocked && props.onDeleteElement && (
                  <button
                    type="button"
                    data-export-ignore="true"
                    title={`Delete ${el.label} from certificate`}
                    aria-label={`Delete ${el.label} from certificate`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDeleteElement?.(el.id);
                    }}
                    className="no-print absolute -top-3.5 -right-3.5 z-40 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-600 px-2 py-1 text-[10px] font-bold text-white shadow-md transition hover:bg-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            );
          })}
      </div>
    );
  }
);
