"use client";

import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type ExportFormatType = "pdf" | "png" | "png_2k" | "png_4k" | "jpeg" | "bulk_zip" | "svg";

function shouldIncludeExportNode(node: HTMLElement): boolean {
  if (!node || typeof node.getAttribute !== "function") return true;
  if (node.getAttribute("data-export-ignore") === "true") return false;
  if (node.classList?.contains("no-print")) return false;
  return true;
}

async function waitForFontsAndImages(element: HTMLElement): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font loading timeout
    }
  }
  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 1500);
        })
    )
  );
}

export async function logExportEvent(
  documentType: "resume" | "certificate",
  documentId: string | undefined,
  format: ExportFormatType,
  fileName?: string,
  resolutionLabel?: string
) {
  if (!documentId) return;
  try {
    await fetch("/api/export/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType,
        documentId,
        format,
        fileName,
        resolutionLabel,
      }),
    });
  } catch {
    // Non-blocking telemetry
  }
}

export async function logDocumentExport(
  documentType: "resume" | "certificate",
  documentId: string,
  format: ExportFormatType
) {
  return logExportEvent(documentType, documentId, format);
}

export async function renderElementToPngDataUrl(
  element: HTMLElement,
  options?: { pixelRatio?: number; targetWidth?: number }
): Promise<string> {
  await waitForFontsAndImages(element);
  const rect = element.getBoundingClientRect();
  const baseWidth = Math.max(300, element.offsetWidth || rect.width || 1123);
  const pixelRatio = options?.targetWidth
    ? Math.max(1.5, Math.min(4.5, options.targetWidth / baseWidth))
    : options?.pixelRatio ?? 2.5;

  return toPng(element, {
    quality: 1.0,
    pixelRatio,
    cacheBust: true,
    skipAutoScale: false,
    filter: (node) => shouldIncludeExportNode(node as HTMLElement),
  });
}

export async function exportElementToPng(
  element: HTMLElement,
  filename: string,
  options?: {
    documentType?: "resume" | "certificate";
    documentId?: string;
    resolution?: "standard" | "2k" | "4k";
  }
) {
  const targetWidth =
    options?.resolution === "4k" ? 3840 : options?.resolution === "2k" ? 2560 : undefined;
  const dataUrl = await renderElementToPngDataUrl(element, {
    targetWidth,
    pixelRatio: options?.resolution ? undefined : 2.5,
  });
  const link = document.createElement("a");
  const cleanName = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.download = cleanName;
  link.href = dataUrl;
  link.click();

  const fmt: ExportFormatType =
    options?.resolution === "4k" ? "png_4k" : options?.resolution === "2k" ? "png_2k" : "png";
  const label =
    options?.resolution === "4k"
      ? "4K Ultra-HD (3840px)"
      : options?.resolution === "2k"
        ? "2K HD (2560px)"
        : "Standard HD";
  if (options?.documentType) {
    await logExportEvent(options.documentType, options.documentId, fmt, cleanName, label);
  }
}

export async function exportElementAsPng(element: HTMLElement, filename: string) {
  await exportElementToPng(element, filename);
}

export async function exportElementToJpeg(
  element: HTMLElement,
  filename: string,
  options?: {
    documentType?: "resume" | "certificate";
    documentId?: string;
    backgroundColor?: string;
    resolution?: "standard" | "2k" | "4k";
  }
) {
  await waitForFontsAndImages(element);
  const baseWidth = Math.max(300, element.offsetWidth || 1123);
  const targetWidth =
    options?.resolution === "4k" ? 3840 : options?.resolution === "2k" ? 2560 : 2200;
  const pixelRatio = Math.max(1.5, Math.min(4.2, targetWidth / baseWidth));

  const dataUrl = await toJpeg(element, {
    quality: 0.96,
    pixelRatio,
    backgroundColor: options?.backgroundColor || "#FFFFFF",
    cacheBust: true,
    filter: (node) => shouldIncludeExportNode(node as HTMLElement),
  });
  const link = document.createElement("a");
  const cleanName =
    filename.endsWith(".jpg") || filename.endsWith(".jpeg") ? filename : `${filename}.jpg`;
  link.download = cleanName;
  link.href = dataUrl;
  link.click();

  if (options?.documentType) {
    await logExportEvent(
      options.documentType,
      options.documentId,
      "jpeg",
      cleanName,
      options?.resolution === "4k" ? "4K JPEG" : "High-Res JPEG"
    );
  }
}

export async function renderElementToPdfBlob(
  element: HTMLElement,
  orientation: "portrait" | "landscape" = "portrait",
  dimensionsPx?: { width: number; height: number }
): Promise<Blob> {
  const dataUrl = await renderElementToPngDataUrl(element, { pixelRatio: 2.6 });

  const wPx =
    dimensionsPx?.width || element.offsetWidth || (orientation === "landscape" ? 1123 : 794);
  const hPx =
    dimensionsPx?.height || element.offsetHeight || (orientation === "landscape" ? 794 : 1123);
  const isCustomRatio =
    Math.abs(wPx / hPx - 1123 / 794) > 0.08 && Math.abs(wPx / hPx - 794 / 1123) > 0.08;

  if (isCustomRatio) {
    const wMm = Math.round(wPx * 0.264583 * 10) / 10;
    const hMm = Math.round(hPx * 0.264583 * 10) / 10;
    const pdf = new jsPDF({
      orientation: wMm >= hMm ? "landscape" : "portrait",
      unit: "mm",
      format: [wMm, hMm],
      compress: true,
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, wMm, hMm, undefined, "FAST");
    return pdf.output("blob");
  }

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(dataUrl);
  const imgRatio = imgProps.width / imgProps.height;
  const pageRatio = pageWidth / pageHeight;

  let drawWidth = pageWidth;
  let drawHeight = pageHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > pageRatio) {
    drawHeight = pageWidth / imgRatio;
    offsetY = Math.max(0, (pageHeight - drawHeight) / 2);
  } else {
    drawWidth = pageHeight * imgRatio;
    offsetX = Math.max(0, (pageWidth - drawWidth) / 2);
  }

  pdf.addImage(dataUrl, "PNG", offsetX, offsetY, drawWidth, drawHeight, undefined, "FAST");
  return pdf.output("blob");
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait",
  options?: {
    documentType?: "resume" | "certificate";
    documentId?: string;
    dimensionsPx?: { width: number; height: number };
  }
): Promise<Blob> {
  const blob = await renderElementToPdfBlob(element, orientation, options?.dimensionsPx);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.download = cleanName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  if (options?.documentType) {
    await logExportEvent(
      options.documentType,
      options.documentId,
      "pdf",
      cleanName,
      orientation === "landscape" ? "A4 Print Landscape" : "A4 Print Portrait"
    );
  }
  return blob;
}

export async function exportElementAsA4Pdf(
  element: HTMLElement,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait"
): Promise<Blob> {
  return exportElementToPdf(element, filename, orientation);
}
