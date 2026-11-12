"use client";

import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ResumeData } from "@francis/shared";

export type ExportFormatType =
  | "pdf"
  | "png"
  | "png_2k"
  | "png_4k"
  | "jpeg"
  | "bulk_zip"
  | "svg"
  | "docx"
  | "html";

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

export type ExportDocumentType = "resume" | "certificate" | "cover_letter" | "portfolio";

export async function logExportEvent(
  documentType: ExportDocumentType,
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
  documentType: ExportDocumentType,
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

export async function exportResumeToDocx(
  data: ResumeData,
  filename: string,
  options?: { documentId?: string; accentColor?: string }
): Promise<void> {
  const accentHex = (options?.accentColor || "#0F766E").replace(/^#/, "");
  const p = data.personalInfo;
  const contactParts = [
    p.email,
    p.phone,
    p.location,
    p.website,
    p.linkedin,
    p.github,
  ].filter((v): v is string => Boolean(v && v.trim()));

  const sectionHeading = (label: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 80 },
      border: {
        bottom: {
          color: accentHex,
          space: 4,
          style: BorderStyle.SINGLE,
          size: 8,
        },
      },
      children: [
        new TextRun({
          text: label.toUpperCase(),
          bold: true,
          color: accentHex,
          size: 22,
        }),
      ],
    });

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: p.fullName || "Untitled Resume",
          bold: true,
          size: 40,
          color: "111827",
        }),
      ],
    }),
  ];

  if (p.headline?.trim()) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: p.headline.trim(),
            bold: true,
            size: 24,
            color: accentHex,
          }),
        ],
      })
    );
  }

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: contactParts.join("  •  "),
            size: 19,
            color: "4B5563",
          }),
        ],
      })
    );
  }

  if (data.summary?.trim()) {
    children.push(sectionHeading("Professional Summary"));
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: data.summary.trim(), size: 21 })],
      })
    );
  }

  if (data.careerObjective?.trim()) {
    children.push(sectionHeading("Career Objective"));
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: data.careerObjective.trim(), size: 21 })],
      })
    );
  }

  if (data.experience.length > 0) {
    children.push(sectionHeading("Work Experience"));
    for (const exp of data.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 30 },
          children: [
            new TextRun({ text: exp.role || "Role", bold: true, size: 22 }),
            new TextRun({ text: `  —  ${exp.company || ""}`, bold: true, size: 21, color: "374151" }),
            new TextRun({
              text: `  (${exp.startDate || ""} – ${exp.current ? "Present" : exp.endDate || ""})`,
              size: 19,
              color: "6B7280",
            }),
          ],
        })
      );
      for (const b of exp.bullets.filter(Boolean)) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: b, size: 20 })],
          })
        );
      }
    }
  }

  if (data.internships.length > 0) {
    children.push(sectionHeading("Internships"));
    for (const intern of data.internships) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 30 },
          children: [
            new TextRun({ text: intern.role, bold: true, size: 22 }),
            new TextRun({ text: `  —  ${intern.organization}`, size: 21, color: "374151" }),
            new TextRun({
              text: intern.duration ? `  (${intern.duration})` : "",
              size: 19,
              color: "6B7280",
            }),
          ],
        })
      );
      for (const h of intern.highlights.filter(Boolean)) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: h, size: 20 })],
          })
        );
      }
    }
  }

  if (data.projects.length > 0) {
    children.push(sectionHeading("Projects"));
    for (const proj of data.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 30 },
          children: [
            new TextRun({ text: proj.name, bold: true, size: 22 }),
            ...(proj.techStack.length > 0
              ? [new TextRun({ text: `  [${proj.techStack.join(", ")}]`, size: 19, color: accentHex })]
              : []),
          ],
        })
      );
      if (proj.description?.trim()) {
        children.push(
          new Paragraph({
            spacing: { after: 30 },
            children: [new TextRun({ text: proj.description.trim(), size: 20 })],
          })
        );
      }
      for (const h of proj.highlights.filter(Boolean)) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: h, size: 20 })],
          })
        );
      }
    }
  }

  if (data.education.length > 0) {
    children.push(sectionHeading("Education"));
    for (const ed of data.education) {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({
              text: `${ed.degree}${ed.field ? ` in ${ed.field}` : ""}`,
              bold: true,
              size: 21,
            }),
            new TextRun({ text: `  —  ${ed.institution}`, size: 20, color: "374151" }),
            new TextRun({
              text: `  (${ed.startDate} – ${ed.endDate}${ed.gpa ? ` • GPA: ${ed.gpa}` : ""})`,
              size: 19,
              color: "6B7280",
            }),
          ],
        })
      );
    }
  }

  if (data.technicalSkills.length > 0 || data.softSkills.length > 0) {
    children.push(sectionHeading("Skills"));
    if (data.technicalSkills.length > 0) {
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: "Technical: ", bold: true, size: 20 }),
            new TextRun({ text: data.technicalSkills.join(", "), size: 20 }),
          ],
        })
      );
    }
    if (data.softSkills.length > 0) {
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: "Interpersonal: ", bold: true, size: 20 }),
            new TextRun({ text: data.softSkills.join(", "), size: 20 }),
          ],
        })
      );
    }
  }

  if (data.certifications.length > 0) {
    children.push(sectionHeading("Certifications"));
    for (const cert of data.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${cert.name} — ${cert.issuer}`, bold: true, size: 20 }),
            new TextRun({ text: cert.date ? ` (${cert.date})` : "", size: 19, color: "6B7280" }),
          ],
        })
      );
    }
  }

  if (data.achievements.length > 0) {
    children.push(sectionHeading("Achievements"));
    for (const ach of data.achievements) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: ach.title, bold: true, size: 20 }),
            new TextRun({
              text: ach.description ? ` — ${ach.description}` : "",
              size: 20,
            }),
          ],
        })
      );
    }
  }

  if (data.languages.length > 0) {
    children.push(sectionHeading("Languages"));
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: data.languages.map((l) => `${l.language} (${l.proficiency})`).join("  •  "),
            size: 20,
          }),
        ],
      })
    );
  }

  if (data.references.length > 0) {
    children.push(sectionHeading("References"));
    for (const refItem of data.references) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `${refItem.name} — ${refItem.title}, ${refItem.organization}`,
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: refItem.email ? ` (${refItem.email})` : "",
              size: 19,
              color: "6B7280",
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    creator: "Francis Creator Studio",
    title: p.fullName ? `${p.fullName} Resume` : "Resume",
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const cleanName = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = cleanName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  await logExportEvent("resume", options?.documentId, "docx", cleanName, "Word DOCX (ATS Ready)");
}

export async function exportCoverLetterToDocx(opts: {
  candidateName?: string;
  candidateContact?: string;
  companyName?: string;
  targetRole?: string;
  content: string;
  filename: string;
}): Promise<void> {
  const paragraphs: Paragraph[] = [];
  if (opts.candidateName?.trim()) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: opts.candidateName.trim(), bold: true, size: 30 })],
      })
    );
  }
  if (opts.candidateContact?.trim()) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun({ text: opts.candidateContact.trim(), size: 20, color: "6B7280" })],
      })
    );
  }
  if (opts.targetRole || opts.companyName) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: `Application: ${opts.targetRole || "Position"}${opts.companyName ? ` — ${opts.companyName}` : ""}`,
            bold: true,
            size: 22,
            color: "0F766E",
          }),
        ],
      })
    );
  }
  for (const block of opts.content.split(/\n{2,}/)) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [new TextRun({ text: block.trim(), size: 22 })],
      })
    );
  }

  const doc = new Document({
    creator: "Francis Creator Studio",
    title: opts.filename,
    sections: [{ children: paragraphs }],
  });
  const blob = await Packer.toBlob(doc);
  const cleanName = opts.filename.endsWith(".docx") ? opts.filename : `${opts.filename}.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = cleanName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function exportCoverLetterToPdf(opts: {
  candidateName?: string;
  candidateContact?: string;
  companyName?: string;
  targetRole?: string;
  content: string;
  filename: string;
}): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const marginX = 22;
  let cursorY = 24;
  const maxWidth = 166;

  if (opts.candidateName?.trim()) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(17, 24, 39);
    pdf.text(opts.candidateName.trim(), marginX, cursorY);
    cursorY += 6;
  }
  if (opts.candidateContact?.trim()) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(82, 88, 102);
    pdf.text(opts.candidateContact.trim(), marginX, cursorY);
    cursorY += 8;
  }
  pdf.setDrawColor(15, 118, 110);
  pdf.setLineWidth(0.5);
  pdf.line(marginX, cursorY, marginX + maxWidth, cursorY);
  cursorY += 10;

  if (opts.targetRole || opts.companyName) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 118, 110);
    pdf.text(
      `RE: ${opts.targetRole || "Role"}${opts.companyName ? ` at ${opts.companyName}` : ""}`,
      marginX,
      cursorY
    );
    cursorY += 9;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(31, 41, 55);

  const lines = pdf.splitTextToSize(opts.content, maxWidth) as string[];
  for (const line of lines) {
    if (cursorY > 274) {
      pdf.addPage();
      cursorY = 22;
    }
    pdf.text(line, marginX, cursorY);
    cursorY += 5.8;
  }

  const cleanName = opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`;
  pdf.save(cleanName);
}

