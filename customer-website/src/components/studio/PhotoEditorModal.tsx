"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Eraser,
  Loader2,
  RotateCw,
  Sliders,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

export interface EditedPhotoResult {
  dataUrl: string;
  blob: Blob;
  shape: "circle" | "square" | "id_card";
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  zoom: number;
  opacity: number;
  borderWidth: number;
  borderColor: string;
  shadow: "none" | "soft" | "elevated";
  bgRemoved: boolean;
}

interface PhotoEditorModalProps {
  open: boolean;
  initialShape?: "circle" | "square" | "id_card";
  initialImageUrl?: string;
  onClose: () => void;
  onApply: (result: EditedPhotoResult) => Promise<void> | void;
  title?: string;
}

export function PhotoEditorModal({
  open,
  initialShape = "circle",
  initialImageUrl,
  onClose,
  onApply,
  title = "Realistic Photo Editor",
}: PhotoEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>(initialImageUrl || "");
  const [shape, setShape] = useState<"circle" | "square" | "id_card">(initialShape);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [borderWidth, setBorderWidth] = useState(2);
  const [borderColor, setBorderColor] = useState("#0F4C5C");
  const [shadow, setShadow] = useState<"none" | "soft" | "elevated">("soft");
  const [dragOver, setDragOver] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [bgStatus, setBgStatus] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSourceUrl(initialImageUrl || "");
      setShape(initialShape);
      setError(null);
      setBgStatus(null);
    }
  }, [open, initialImageUrl, initialShape]);

  useEffect(() => {
    if (!open || !sourceUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = shape === "id_card" ? 320 : 400;
      const h = shape === "id_card" ? 420 : 400;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      } else if (shape === "id_card") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.rect(14, 14, w - 28, h - 28);
        ctx.clip();
      }

      ctx.globalAlpha = opacity;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.translate(w / 2 + panX * 1.5, h / 2 + panY * 1.5);
      ctx.rotate((rotation * Math.PI) / 180);

      const scale = Math.max(w / img.width, h / img.height) * zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };
    img.src = sourceUrl;
  }, [open, sourceUrl, shape, brightness, contrast, saturation, rotation, zoom, panX, panY, opacity]);

  if (!open) return null;

  const loadImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be under 10 MB.");
      return;
    }
    setError(null);
    setBgRemoved(false);
    setBgStatus(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSourceUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleAutoEnhance = () => {
    setBrightness(106);
    setContrast(110);
    setSaturation(108);
    setBgStatus("Applied balanced studio portrait enhancement.");
  };

  const handleRemoveBackground = async () => {
    if (!sourceUrl) return;
    setBgLoading(true);
    setError(null);
    setBgStatus("Checking image processing service...");

    try {
      const resp = await fetch(sourceUrl);
      const blob = await resp.blob();
      const formData = new FormData();
      formData.append(
        "image_file",
        new File([blob], "photo.png", { type: blob.type || "image/png" })
      );

      const apiResp = await fetch("/api/image/remove-bg", {
        method: "POST",
        body: formData,
      });

      const contentType = apiResp.headers.get("content-type") || "";
      if (apiResp.ok && contentType.startsWith("image/")) {
        const resultBlob = await apiResp.blob();
        const url = URL.createObjectURL(resultBlob);
        setSourceUrl(url);
        setBgRemoved(true);
        setBgStatus("Background removed via configured server processor.");
        return;
      }

      setBgStatus("Running on-device ML background segmentation (first load downloads model once)...");
      const { removeBackground } = await import("@imgly/background-removal");
      const outBlob = await removeBackground(blob);
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to encode output image"));
        reader.readAsDataURL(outBlob);
      });
      setSourceUrl(dataUrl);
      setBgRemoved(true);
      setBgStatus("Background cleanly removed.");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Background removal failed: ${err.message}`
          : "Unable to process image background."
      );
      setBgStatus(null);
    } finally {
      setBgLoading(false);
    }
  };

  const handleApply = async () => {
    if (!canvasRef.current || !sourceUrl) return;
    setApplying(true);
    setError(null);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current?.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
          "image/png"
        );
      });

      await onApply({
        dataUrl,
        blob,
        shape,
        brightness,
        contrast,
        saturation,
        rotation,
        zoom,
        opacity,
        borderWidth,
        borderColor,
        shadow,
        bgRemoved,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply photo.");
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
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--fcs-border)] pb-3">
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            <p className="text-[11px] text-[var(--fcs-ink-muted)]">
              Drag & drop JPG/PNG/WebP, crop into Circle, Rectangle, or ID Frame, enhance clarity, and remove backgrounds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo editor"
            className="rounded-lg p-1.5 text-[var(--fcs-ink-muted)] hover:bg-[var(--fcs-surface-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {bgStatus && (
          <div className="mt-3 rounded-xl border border-teal-500/30 bg-teal-50 p-2.5 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            {bgStatus}
          </div>
        )}

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) loadImageFile(f);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition ${
              dragOver
                ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/30"
                : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
            }`}
          >
            {sourceUrl ? (
              <div className="relative flex items-center justify-center rounded-xl bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] p-2">
                <canvas
                  ref={canvasRef}
                  style={{
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
                    boxShadow:
                      shadow === "elevated"
                        ? "0 12px 24px rgba(15,23,42,0.28)"
                        : shadow === "soft"
                          ? "0 4px 12px rgba(15,23,42,0.14)"
                          : "none",
                  }}
                  className={`object-contain ${
                    shape === "circle"
                      ? "h-56 w-56 rounded-full"
                      : shape === "id_card"
                        ? "h-64 w-48 rounded-md"
                        : "h-56 w-56 rounded-lg"
                  }`}
                />
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--fcs-ink-muted)]">
                <p className="font-semibold">Drag &amp; drop a photo here</p>
                <p className="mt-1">Supports PNG, JPG, WEBP up to 10 MB</p>
              </div>
            )}

            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-2 text-xs font-semibold hover:border-teal-600/50">
              <Upload className="h-3.5 w-3.5" />
              <span>{sourceUrl ? "Choose Another Photo" : "Upload Photo"}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--fcs-ink-muted)]">
                <Sliders className="h-3.5 w-3.5" /> Adjustments &amp; Frame
              </span>
              <button
                type="button"
                disabled={!sourceUrl}
                onClick={handleAutoEnhance}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-600/30 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50 dark:bg-teal-950/40 dark:text-teal-300"
              >
                <Sparkles className="h-3 w-3" /> Auto Enhance
              </button>
            </div>

            <div>
              <span className="mb-1 block font-medium">Frame Preset</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "circle", label: "Circular" },
                    { id: "square", label: "Rectangle" },
                    { id: "id_card", label: "ID Card (3:4)" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShape(item.id)}
                    className={`rounded-lg border py-1.5 font-semibold ${
                      shape === item.id
                        ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                        : "border-[var(--fcs-border)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between">
                  <span>Crop Zoom</span>
                  <span className="font-mono">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={2.4}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Transparency</span>
                  <span className="font-mono">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between">
                  <span>Offset X</span>
                  <span className="font-mono">{panX}</span>
                </div>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={panX}
                  onChange={(e) => setPanX(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Offset Y</span>
                  <span className="font-mono">{panY}</span>
                </div>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={panY}
                  onChange={(e) => setPanY(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span>Rotation ({rotation}°)</span>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline dark:text-teal-400"
                >
                  <RotateCw className="h-3 w-3" /> +90°
                </button>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="flex justify-between">
                  <span>Bright</span>
                  <span className="font-mono">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={140}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Contrast</span>
                  <span className="font-mono">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={150}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Saturate</span>
                  <span className="font-mono">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={160}
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="mb-1 block font-medium">Border ({borderWidth}px)</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={borderWidth}
                  onChange={(e) => setBorderWidth(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
              <div>
                <span className="mb-1 block font-medium">Border Color</span>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="h-7 w-full rounded border border-[var(--fcs-border)]"
                />
              </div>
              <div>
                <span className="mb-1 block font-medium">Shadow</span>
                <select
                  value={shadow}
                  onChange={(e) => setShadow(e.target.value as "none" | "soft" | "elevated")}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1"
                >
                  <option value="none">None</option>
                  <option value="soft">Soft</option>
                  <option value="elevated">Elevated</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={!sourceUrl || bgLoading}
              onClick={handleRemoveBackground}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 font-semibold hover:border-teal-600/50 disabled:opacity-50"
            >
              {bgLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eraser className="h-3.5 w-3.5 text-teal-600" />
              )}
              <span>{bgRemoved ? "Background Removed ✓" : "Remove Background"}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--fcs-border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--fcs-border)] px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!sourceUrl || applying}
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Apply Photo
          </button>
        </div>
      </div>
    </div>
  );
}
