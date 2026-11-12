"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  ALL_CERTIFICATE_TEMPLATES,
  createDefaultCertificateStyle,
  generateCertificateCode,
  type CertificateCanvasElement,
  type CertificateStyleConfig,
} from "@francis/shared";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { CertificateCanvas } from "./CertificateCanvas";
import { renderElementToPdfBlob, renderElementToPngDataUrl } from "@/lib/exportHelpers";

interface ApprovedIssuerOption {
  id: string;
  organization_name: string;
}

interface TemplateOption {
  slug: string;
  name: string;
  orientation: "landscape" | "portrait";
  layout_config: Record<string, unknown>;
}

interface BulkGeneratorClientProps {
  isAuthenticated: boolean;
  approvedIssuers: ApprovedIssuerOption[];
  templates: TemplateOption[];
  defaultStampElement?: CertificateCanvasElement | null;
}

const SAMPLE_COHORT_ROWS: Array<Record<string, string>> = [
  {
    "Recipient Name": "Aarav Sharma",
    "Course Name": "Full-Stack AI & Cloud Engineering",
    "Issue Date": new Date().toISOString().slice(0, 10),
    Description: "Completed all live engineering capstones with top marks.",
  },
  {
    "Recipient Name": "Priya Nair",
    "Course Name": "Full-Stack AI & Cloud Engineering",
    "Issue Date": new Date().toISOString().slice(0, 10),
    Description: "Demonstrated outstanding system design and deployment craft.",
  },
  {
    "Recipient Name": "Daniel Brooks",
    "Course Name": "Full-Stack AI & Cloud Engineering",
    "Issue Date": new Date().toISOString().slice(0, 10),
    Description: "Awarded Honors Cohort recognition for leadership and delivery.",
  },
];

function guessColumn(headers: string[], candidates: string[]): string {
  for (const cand of candidates) {
    const found = headers.find((h) => h.toLowerCase().includes(cand));
    if (found) return found;
  }
  return "";
}

export function BulkGeneratorClient({
  isAuthenticated,
  approvedIssuers,
  templates,
  defaultStampElement = null,
}: BulkGeneratorClientProps) {
  const hasApprovedIssuer = isAuthenticated && approvedIssuers.length > 0;
  const renderCanvasRef = useRef<HTMLDivElement | null>(null);

  const [batchName, setBatchName] = useState(
    `Cohort Graduation ${new Date().toISOString().slice(0, 10)}`
  );
  const [selectedIssuerId, setSelectedIssuerId] = useState(approvedIssuers[0]?.id || "");
  const [organizationName, setOrganizationName] = useState(
    approvedIssuers[0]?.organization_name || "Creator Studio Academy"
  );
  const [templateSlug, setTemplateSlug] = useState(
    templates[0]?.slug || ALL_CERTIFICATE_TEMPLATES[0].slug
  );
  const [certificateTitle, setCertificateTitle] = useState("Certificate of Completion");
  const [signatoryName, setSignatoryName] = useState("Program Director");
  const [signatoryDesignation, setSignatoryDesignation] = useState("Academic Board");
  const [publishOfficial, setPublishOfficial] = useState(hasApprovedIssuer);
  const [exportFormat, setExportFormat] = useState<"zip_png" | "zip_pdf" | "merged_pdf">("zip_png");

  const [headers, setHeaders] = useState<string[]>([
    "Recipient Name",
    "Course Name",
    "Issue Date",
    "Description",
  ]);
  const [rows, setRows] = useState<Array<Record<string, string>>>(SAMPLE_COHORT_ROWS);
  const [colRecipient, setColRecipient] = useState("Recipient Name");
  const [colCourse, setColCourse] = useState("Course Name");
  const [colTitle, setColTitle] = useState("");
  const [colDate, setColDate] = useState("Issue Date");
  const [colDesc, setColDesc] = useState("Description");

  const [activeRenderRow, setActiveRenderRow] = useState<{
    code: string;
    recipientName: string;
    course: string;
    title: string;
    issueDate: string;
    description: string;
  } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.slug === templateSlug) || templates[0],
    [templates, templateSlug]
  );

  const styleConfig = useMemo<CertificateStyleConfig>(() => {
    const cfg = (selectedTemplate?.layout_config ?? {}) as Record<string, string>;
    return createDefaultCertificateStyle({
      backgroundColor: cfg.background || "#FFFDF7",
      primaryColor: cfg.primaryColor || "#0F4C5C",
      accentColor: cfg.accentColor || "#C59B27",
      borderStyle: (cfg.borderStyle as CertificateStyleConfig["borderStyle"]) || "double-gold",
      fontDisplay: cfg.fontDisplay || "Cormorant Garamond",
      fontBody: cfg.fontBody || "Plus Jakarta Sans",
    });
  }, [selectedTemplate]);

  const orientation = selectedTemplate?.orientation || "landscape";
  const elements = useMemo<CertificateCanvasElement[]>(
    () => (defaultStampElement ? [defaultStampElement] : []),
    [defaultStampElement]
  );

  const handleSpreadsheetUpload = async (file: File) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheet = wb.SheetNames[0];
      if (!firstSheet) {
        setErrorMsg("No sheet found in uploaded file.");
        return;
      }
      const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheet], {
        defval: "",
      });
      if (rawJson.length === 0) {
        setErrorMsg("Spreadsheet appears empty. Include a header row and at least 1 recipient row.");
        return;
      }
      const normalized = rawJson.slice(0, 200).map((r) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          out[String(k).trim()] = String(v ?? "").trim();
        }
        return out;
      });
      const hdrs = Object.keys(normalized[0]);
      setHeaders(hdrs);
      setRows(normalized);
      setColRecipient(guessColumn(hdrs, ["name", "recipient", "student", "participant"]) || hdrs[0]);
      setColCourse(guessColumn(hdrs, ["course", "program", "event", "track", "achievement"]) || hdrs[1] || "");
      setColTitle(guessColumn(hdrs, ["title", "award"]));
      setColDate(guessColumn(hdrs, ["date", "issued"]));
      setColDesc(guessColumn(hdrs, ["desc", "citation", "note"]));
      setStatusMsg(`Loaded ${normalized.length} recipient rows from "${file.name}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not parse spreadsheet.");
    }
  };

  const previewRowData = useMemo(() => {
    if (activeRenderRow) return activeRenderRow;
    const first = rows[0] || SAMPLE_COHORT_ROWS[0];
    return {
      code: "FCS-CERT-PREVIEW",
      recipientName: (colRecipient && first[colRecipient]) || "Recipient Name",
      course: (colCourse && first[colCourse]) || "Course Achievement",
      title: (colTitle && first[colTitle]) || certificateTitle,
      issueDate: (colDate && first[colDate]) || new Date().toISOString().slice(0, 10),
      description: (colDesc && first[colDesc]) || "",
    };
  }, [activeRenderRow, rows, colRecipient, colCourse, colTitle, colDate, colDesc, certificateTitle]);

  const handleGenerateBatch = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    if (rows.length === 0) {
      setErrorMsg("Upload a CSV/Excel file or load sample rows first.");
      return;
    }
    if (!colRecipient) {
      setErrorMsg("Select which spreadsheet column contains Recipient Names.");
      return;
    }

    setGenerating(true);
    try {
      const mapped = rows
        .map((r) => ({
          recipientName: (r[colRecipient] || "").trim(),
          courseOrAchievement: (colCourse && r[colCourse]) || "Program Completion",
          title: (colTitle && r[colTitle]) || certificateTitle,
          issueDate: (colDate && r[colDate]) || new Date().toISOString().slice(0, 10),
          description: (colDesc && r[colDesc]) || "",
        }))
        .filter((item) => Boolean(item.recipientName));

      if (mapped.length === 0) {
        setErrorMsg("No non-empty recipient rows found for the mapped Name column.");
        return;
      }

      let serverIssued: Array<{
        id: string;
        recipient_name: string;
        certificate_code: string;
      }> = [];

      if (hasApprovedIssuer && publishOfficial) {
        const res = await fetch("/api/certificates/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchName,
            issuerId: selectedIssuerId || approvedIssuers[0].id,
            templateSlug,
            orientation,
            canvasWidth: styleConfig.canvasWidth || (orientation === "landscape" ? 1123 : 794),
            canvasHeight: styleConfig.canvasHeight || (orientation === "landscape" ? 794 : 1123),
            issueOfficial: true,
            columnMapping: {
              recipientName: colRecipient,
              courseOrAchievement: colCourse,
              issueDate: colDate,
              certificateTitle: colTitle,
              description: colDesc,
            },
            canvasElements: elements,
            styleConfig,
            rows: mapped.map((m) => ({
              recipientName: m.recipientName,
              courseOrAchievement: m.courseOrAchievement,
              issueDate: m.issueDate,
              organizationName,
              certificateTitle: m.title,
              description: m.description,
              signatoryName,
              signatoryDesignation,
            })),
          }),
        });
        const json = (await res.json()) as {
          certificates?: Array<{ id: string; recipient_name: string; certificate_code: string }>;
          error?: string;
        };
        if (!res.ok) {
          setErrorMsg(json.error || "Official batch registration failed.");
          return;
        }
        serverIssued = json.certificates ?? [];
      }

      setProgress({ current: 0, total: mapped.length });
      const zip = new JSZip();
      let mergedPdf: jsPDF | null = null;

      for (let i = 0; i < mapped.length; i += 1) {
        const item = mapped[i];
        const code = serverIssued[i]?.certificate_code || generateCertificateCode();
        setActiveRenderRow({
          code,
          recipientName: item.recipientName,
          course: item.courseOrAchievement,
          title: item.title,
          issueDate: item.issueDate,
          description: item.description,
        });

        // Allow React & QRCode effect to paint next frame before capturing
        await new Promise((resolve) => setTimeout(resolve, 180));
        if (!renderCanvasRef.current) continue;

        const safeName = item.recipientName.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40) || `Row_${i + 1}`;

        if (exportFormat === "zip_png") {
          const dataUrl = await renderElementToPngDataUrl(renderCanvasRef.current, {
            pixelRatio: 2,
          });
          const base64 = dataUrl.split(",")[1];
          zip.file(`${String(i + 1).padStart(3, "0")}_${safeName}_${code}.png`, base64, {
            base64: true,
          });
        } else if (exportFormat === "zip_pdf") {
          const blob = await renderElementToPdfBlob(renderCanvasRef.current, orientation);
          zip.file(`${String(i + 1).padStart(3, "0")}_${safeName}_${code}.pdf`, blob);
        } else {
          const dataUrl = await renderElementToPngDataUrl(renderCanvasRef.current, {
            pixelRatio: 2,
          });
          if (!mergedPdf) {
            mergedPdf = new jsPDF({
              orientation,
              unit: "mm",
              format: "a4",
              compress: true,
            });
          } else {
            mergedPdf.addPage("a4", orientation);
          }
          const pageW = mergedPdf.internal.pageSize.getWidth();
          const pageH = mergedPdf.internal.pageSize.getHeight();
          mergedPdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
        }

        setProgress({ current: i + 1, total: mapped.length });
      }

      const safeBatch = batchName.replace(/[^a-z0-9-_]+/gi, "_") || "Certificate_Batch";
      if (exportFormat === "merged_pdf" && mergedPdf) {
        mergedPdf.save(`${safeBatch}.pdf`);
      } else {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${safeBatch}.zip`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }

      setStatusMsg(
        serverIssued.length > 0
          ? `Successfully generated & officially verified ${mapped.length} certificates in "${batchName}"!`
          : `Successfully generated ${mapped.length} sample certificates in "${batchName}"!`
      );
    } finally {
      setActiveRenderRow(null);
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Batch Issuance &amp; Cohort Export
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Bulk Excel / CSV Certificate Generator
          </h1>
          <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
            Upload Excel (`.xlsx`) or CSV rosters, map columns visually, preview live, and export
            every credential in one ZIP or combined print PDF with unique QR codes.
          </p>
        </div>
        <div className="flex gap-2">
          <SafeNavLink
            href="/certificate-builder/new"
            className="rounded-xl border border-[var(--fcs-border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            ← Visual Studio
          </SafeNavLink>
          <SafeNavLink
            href="/verify"
            className="rounded-xl border border-[var(--fcs-border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--fcs-surface-muted)]"
          >
            Verify Registry
          </SafeNavLink>
        </div>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-2xl border border-red-500/40 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT CONFIGURATION */}
        <div className="space-y-5 lg:col-span-5">
          {/* Step 1: Upload Roster */}
          <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 text-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <FileSpreadsheet className="h-4 w-4 text-teal-600" />
              1. Upload CSV / Excel Recipient List
            </h2>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">
                <Upload className="h-3.5 w-3.5" />
                Choose .CSV / .XLSX File
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSpreadsheetUpload(f);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setHeaders(["Recipient Name", "Course Name", "Issue Date", "Description"]);
                  setRows(SAMPLE_COHORT_ROWS);
                  setColRecipient("Recipient Name");
                  setColCourse("Course Name");
                  setColDate("Issue Date");
                  setColDesc("Description");
                  setStatusMsg("Loaded 3 sample recipients cleanly.");
                }}
                className="rounded-xl border border-[var(--fcs-border)] px-3 py-2 font-semibold hover:bg-[var(--fcs-surface-muted)]"
              >
                Load Sample 3-Row Roster
              </button>
            </div>
            <p className="text-[11px] text-[var(--fcs-ink-muted)]">
              Loaded <strong>{rows.length}</strong> rows with columns:{" "}
              <span className="font-mono">{headers.join(", ")}</span>
            </p>

            {/* Column Mapping */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="mb-1 block font-semibold">Recipient Name Column *</label>
                <select
                  value={colRecipient}
                  onChange={(e) => setColRecipient(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                >
                  <option value="">Select column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Course / Achievement Column</label>
                <select
                  value={colCourse}
                  onChange={(e) => setColCourse(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                >
                  <option value="">Use default</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Issue Date Column</label>
                <select
                  value={colDate}
                  onChange={(e) => setColDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                >
                  <option value="">Use today&apos;s date</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Description Column</label>
                <select
                  value={colDesc}
                  onChange={(e) => setColDesc(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                >
                  <option value="">None</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Template & Export */}
          <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 text-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-teal-600" />
              2. Design Template &amp; Output Format
            </h2>

            <div>
              <label className="mb-1 block font-semibold">Batch Title</label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Certificate Template</label>
              <select
                value={templateSlug}
                onChange={(e) => setTemplateSlug(e.target.value)}
                className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
              >
                {templates.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name} ({t.orientation})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-semibold">Certificate Title</label>
                <input
                  type="text"
                  value={certificateTitle}
                  onChange={(e) => setCertificateTitle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Issuing Organization</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Designation</label>
                <input
                  type="text"
                  value={signatoryDesignation}
                  onChange={(e) => setSignatoryDesignation(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                />
              </div>
            </div>

            {hasApprovedIssuer ? (
              <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-3 dark:bg-emerald-950/30">
                <label className="block font-bold text-emerald-900 dark:text-emerald-200">
                  Approved Organization for Verification
                </label>
                <select
                  value={selectedIssuerId}
                  onChange={(e) => {
                    setSelectedIssuerId(e.target.value);
                    const matched = approvedIssuers.find((i) => i.id === e.target.value);
                    if (matched) setOrganizationName(matched.organization_name);
                  }}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                >
                  {approvedIssuers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.organization_name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
                  <input
                    type="checkbox"
                    checked={publishOfficial}
                    onChange={(e) => setPublishOfficial(e.target.checked)}
                    className="accent-teal-700"
                  />
                  Register every certificate on public QR Verification Registry
                </label>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/70 p-3 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Running in <strong>Sample Bulk Mode</strong>. For officially verified batch
                credentials, apply at{" "}
                <SafeNavLink href="/verify" className="font-bold underline">
                  /verify
                </SafeNavLink>
                .
              </div>
            )}

            <div>
              <label className="mb-1 block font-semibold">Output Package Format</label>
              <select
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as "zip_png" | "zip_pdf" | "merged_pdf")
                }
                className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 font-semibold"
              >
                <option value="zip_png">ZIP Archive of Individual High-Res PNGs</option>
                <option value="zip_pdf">ZIP Archive of Individual A4 PDFs</option>
                <option value="merged_pdf">Single Combined Multi-Page Print PDF</option>
              </select>
            </div>

            <button
              type="button"
              disabled={generating || rows.length === 0}
              onClick={handleGenerateBatch}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rendering {progress.current} of {progress.total} Certificates...
                </>
              ) : (
                <>
                  {hasApprovedIssuer && publishOfficial ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Generate &amp; Download {rows.length} Certificates
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT LIVE PREVIEW */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Live Row #1 / Render Preview ({orientation})
            </h2>
            <span className="font-mono text-xs text-[var(--fcs-ink-muted)]">
              {previewRowData.code}
            </span>
          </div>

          <div className="overflow-auto rounded-2xl border border-[var(--fcs-border)] bg-slate-200/70 p-4 dark:bg-slate-900/60">
            <div
              className="origin-top-left"
              style={{
                transform: "scale(0.56)",
                width: `${(orientation === "landscape" ? 1123 : 794) * 0.56}px`,
                height: `${(orientation === "landscape" ? 794 : 1123) * 0.56}px`,
              }}
            >
              <CertificateCanvas
                ref={renderCanvasRef}
                certificateCode={previewRowData.code}
                title={previewRowData.title}
                recipientName={previewRowData.recipientName}
                courseOrAchievement={previewRowData.course}
                organizationName={organizationName}
                description={previewRowData.description}
                issueDate={previewRowData.issueDate}
                expiryDate=""
                signatoryName={signatoryName}
                signatoryDesignation={signatoryDesignation}
                orientation={orientation}
                elements={elements}
                style={styleConfig}
                isVerified={hasApprovedIssuer && publishOfficial}
                isSample={!hasApprovedIssuer || !publishOfficial}
              />
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <h3 className="mb-2 text-xs font-bold">
              Recipient Preview (Showing first {Math.min(8, rows.length)} of {rows.length})
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--fcs-border)] text-[var(--fcs-ink-muted)]">
                <tr>
                  <th className="py-1.5 pr-3">#</th>
                  <th className="py-1.5 pr-3">Recipient</th>
                  <th className="py-1.5 pr-3">Course / Achievement</th>
                  <th className="py-1.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, idx) => (
                  <tr key={idx} className="border-b border-[var(--fcs-border)]/50">
                    <td className="py-1.5 pr-3 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-1.5 pr-3 font-semibold">{r[colRecipient] || "—"}</td>
                    <td className="py-1.5 pr-3">{(colCourse && r[colCourse]) || "Default"}</td>
                    <td className="py-1.5 font-mono text-[11px]">
                      {(colDate && r[colDate]) || "Today"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
