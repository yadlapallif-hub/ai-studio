"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Eraser, PenTool, Sparkles, Upload, X } from "lucide-react";

export interface CreatedSignaturePayload {
  dataUrl: string;
  signatoryName: string;
  signatoryDesignation: string;
  stylePreset: string;
  saveToLibrary: boolean;
}

interface SignatureDrawerModalProps {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultDesignation?: string;
  onApply: (sig: CreatedSignaturePayload) => Promise<void> | void;
}

const INK_COLORS = [
  { label: "Archival Black", hex: "#0F172A" },
  { label: "Executive Navy", hex: "#1E3A8A" },
  { label: "Royal Blue", hex: "#1D4ED8" },
  { label: "Studio Teal", hex: "#0F766E" },
];

const SCRIPT_STYLES = [
  { id: "classic_cursive", label: "Classic Script", font: "italic 54px 'Cormorant Garamond', Georgia, serif" },
  { id: "executive_serif", label: "Executive Ink", font: "italic 46px Georgia, 'Times New Roman', serif" },
  { id: "modern_monoline", label: "Modern Clean", font: "500 italic 42px 'Plus Jakarta Sans', system-ui, sans-serif" },
  { id: "brush_flourish", label: "Brush Calligraphy", font: "700 italic 50px 'Brush Script MT', 'Segoe Script', cursive" },
];

export function SignatureDrawerModal({
  open,
  onClose,
  defaultName = "Authorized Signatory",
  defaultDesignation = "Director / Lead Instructor",
  onApply,
}: SignatureDrawerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"draw" | "typed" | "upload">("draw");
  const [signatoryName, setSignatoryName] = useState(defaultName);
  const [signatoryDesignation, setSignatoryDesignation] = useState(defaultDesignation);
  const [inkColor, setInkColor] = useState("#0F172A");
  const [penSize, setPenSize] = useState(3);
  const [scriptStyle, setScriptStyle] = useState(SCRIPT_STYLES[0].id);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [hasStroke, setHasStroke] = useState(false);
  const [applying, setApplying] = useState(false);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setSignatoryName(defaultName);
      setSignatoryDesignation(defaultDesignation);
      setHasStroke(false);
      setUploadedUrl("");
    }
  }, [open, defaultName, defaultDesignation]);

  useEffect(() => {
    if (!open || mode !== "draw" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 560;
    canvas.height = 190;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [open, mode]);

  if (!open) return null;

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getPoint(e);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setHasStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasStroke(false);
  };

  const renderTypedSignatureDataUrl = (): string => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 560;
    offscreen.height = 190;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return "";
    const style = SCRIPT_STYLES.find((s) => s.id === scriptStyle) || SCRIPT_STYLES[0];
    ctx.clearRect(0, 0, 560, 190);
    ctx.fillStyle = inkColor;
    ctx.font = style.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(signatoryName.trim() || "Authorized Signatory", 280, 92);
    // Subtle underline flourish
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(140, 134);
    ctx.quadraticCurveTo(280, 126, 420, 132);
    ctx.stroke();
    return offscreen.toDataURL("image/png");
  };

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      // Knock out pure white background automatically if JPG/solid white
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        setUploadedUrl(c.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    let finalDataUrl = "";
    if (mode === "draw") {
      if (!canvasRef.current || !hasStroke) return;
      finalDataUrl = canvasRef.current.toDataURL("image/png");
    } else if (mode === "typed") {
      finalDataUrl = renderTypedSignatureDataUrl();
    } else {
      finalDataUrl = uploadedUrl;
    }
    if (!finalDataUrl) return;

    setApplying(true);
    try {
      await onApply({
        dataUrl: finalDataUrl,
        signatoryName: signatoryName.trim() || "Authorized Signatory",
        signatoryDesignation: signatoryDesignation.trim() || "Signatory",
        stylePreset: mode === "typed" ? scriptStyle : mode,
        saveToLibrary,
      });
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--fcs-border)] pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <PenTool className="h-4 w-4 text-teal-600" /> Digital Signature Studio
            </h2>
            <p className="text-[11px] text-[var(--fcs-ink-muted)]">
              Draw with mouse/touch, style a calligraphy signature, or upload a transparent PNG signature.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-semibold">Signatory Full Name</label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">Designation / Title</label>
            <input
              type="text"
              value={signatoryDesignation}
              onChange={(e) => setSignatoryDesignation(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5 text-xs">
            {(
              [
                { id: "draw", label: "Draw Pad" },
                { id: "typed", label: "Styled Script" },
                { id: "upload", label: "Upload Image" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={`rounded-lg border px-3 py-1.5 font-semibold ${
                  mode === t.id
                    ? "border-teal-600 bg-teal-700 text-white"
                    : "border-[var(--fcs-border)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {INK_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                onClick={() => setInkColor(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`h-6 w-6 rounded-full border-2 ${
                  inkColor === c.hex ? "border-amber-500 scale-110" : "border-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {mode === "draw" && (
          <div className="mt-4 space-y-2">
            <div className="rounded-xl border border-dashed border-[var(--fcs-border)] bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:14px_14px] p-2">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="h-44 w-full cursor-crosshair touch-none rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span>Stroke Weight:</span>
                <input
                  type="range"
                  min={1.5}
                  max={6}
                  step={0.5}
                  value={penSize}
                  onChange={(e) => setPenSize(Number(e.target.value))}
                  className="accent-teal-700"
                />
              </div>
              <button
                type="button"
                onClick={clearPad}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] px-3 py-1 font-semibold"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear Pad
              </button>
            </div>
          </div>
        )}

        {mode === "typed" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              {SCRIPT_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScriptStyle(s.id)}
                  className={`rounded-xl border p-3 text-left ${
                    scriptStyle === s.id
                      ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/30"
                      : "border-[var(--fcs-border)]"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-[var(--fcs-ink-muted)]">{s.label}</p>
                  <p
                    style={{
                      color: inkColor,
                      fontStyle: "italic",
                      fontFamily: s.id === "modern_monoline" ? "sans-serif" : "Georgia, serif",
                    }}
                    className="mt-1 truncate text-xl"
                  >
                    {signatoryName || "Authorized Signatory"}
                  </p>
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-[var(--fcs-ink-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              Rendered with a fully transparent PNG background for clean placement over certificate ink lines.
            </p>
          </div>
        )}

        {mode === "upload" && (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-6 text-center text-xs">
            {uploadedUrl ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedUrl} alt="Uploaded signature" className="mx-auto max-h-28 object-contain" />
                <p className="text-[11px] text-teal-700 dark:text-teal-400">
                  Light background automatically converted to transparency.
                </p>
              </div>
            ) : (
              <p className="text-[var(--fcs-ink-muted)]">
                Upload a scanned or digital signature image (PNG/JPG/WebP). White paper backgrounds are automatically made transparent.
              </p>
            )}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-2 font-semibold">
              <Upload className="h-3.5 w-3.5" /> Choose Signature Image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadFile(f);
                }}
              />
            </label>
          </div>
        )}

        <label className="mt-4 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(e) => setSaveToLibrary(e.target.checked)}
            className="accent-teal-700"
          />
          <span>Save to Personal Signature Library for future certificates</span>
        </label>

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--fcs-border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--fcs-border)] px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              applying ||
              (mode === "draw" && !hasStroke) ||
              (mode === "upload" && !uploadedUrl)
            }
            onClick={() => void handleConfirm()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Place Signature on Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
