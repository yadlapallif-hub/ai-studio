"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Copy,
  Download,
  FileSpreadsheet,
  Hash,
  Layers,
  Loader2,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { CertificateCanvas } from "./CertificateCanvas";
import { renderElementToPdfBlob, renderElementToPngDataUrl } from "@/lib/exportHelpers";

export const BULK_STUDIO_PRESET_KEY = "fcs-bulk-studio-preset";

interface StudioPresetPayload {
  certificateCode?: string;
  templateSlug?: string;
  title?: string;
  recipientName?: string;
  courseOrAchievement?: string;
  organizationName?: string;
  description?: string;
  issueDate?: string;
  expiryDate?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  orientation?: "landscape" | "portrait";
  elements?: CertificateCanvasElement[];
  style?: CertificateStyleConfig;
  savedAt?: string;
}

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

interface PlannedCertificateRow {
  recipientName: string;
  courseOrAchievement: string;
  title: string;
  issueDate: string;
  expiryDate: string;
  description: string;
  certificateCode: string;
}

const QUANTITY_PRESETS = [5, 10, 25, 50, 100, 250, 500] as const;

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

function clampQuantity(val: number): number {
  if (!Number.isFinite(val)) return 1;
  return Math.max(1, Math.min(500, Math.round(val)));
}

function buildRandomToken(len = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function BulkGeneratorClient({
  isAuthenticated,
  approvedIssuers,
  templates,
  defaultStampElement = null,
}: BulkGeneratorClientProps) {
  const hasApprovedIssuer = isAuthenticated && approvedIssuers.length > 0;
  const renderCanvasRef = useRef<HTMLDivElement | null>(null);
  const cancelBatchRef = useRef(false);

  const [batchMode, setBatchMode] = useState<"quantity" | "spreadsheet">("quantity");
  const [batchName, setBatchName] = useState(
    `Same Certificate Batch ${new Date().toISOString().slice(0, 10)}`
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
  const [exportFormat, setExportFormat] = useState<"zip_png" | "zip_pdf" | "merged_pdf">(
    "merged_pdf"
  );

  // Quantity Mode Controls (Same Certificate × N)
  const [quantity, setQuantity] = useState<number>(25);
  const [recipientMode, setRecipientMode] = useState<"same" | "blank" | "numbered">("same");
  const [sharedRecipientName, setSharedRecipientName] = useState("Valued Participant");
  const [numberedStart, setNumberedStart] = useState<number>(1);
  const [sharedCourse, setSharedCourse] = useState("Full-Stack AI & Cloud Engineering");
  const [sharedIssueDate, setSharedIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [sharedExpiryDate, setSharedExpiryDate] = useState("");
  const [sharedDescription, setSharedDescription] = useState(
    "Awarded in recognition of successful completion and active excellence."
  );
  const [copyIdentityMode, setCopyIdentityMode] = useState<"unique" | "identical">("unique");
  const [codeStrategy, setCodeStrategy] = useState<"auto" | "prefix">("auto");
  const [customCodePrefix, setCustomCodePrefix] = useState("FCS-2026-");
  const [sharedIdenticalCode, setSharedIdenticalCode] = useState(() => generateCertificateCode());

  // Optional Style & Studio Preset Overrides
  const [studioPresetAvailable, setStudioPresetAvailable] = useState(false);
  const [customElements, setCustomElements] = useState<CertificateCanvasElement[] | null>(null);
  const [styleOverrides, setStyleOverrides] = useState<Partial<CertificateStyleConfig>>({});
  const [orientationOverride, setOrientationOverride] = useState<"landscape" | "portrait" | null>(
    null
  );

  // Spreadsheet Mode Controls
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
    expiryDate: string;
    description: string;
  } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStudioPreset = React.useCallback((announce = true) => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(BULK_STUDIO_PRESET_KEY);
      if (!raw) return;
      const preset = JSON.parse(raw) as StudioPresetPayload;
      if (preset.templateSlug) setTemplateSlug(preset.templateSlug);
      if (preset.title) setCertificateTitle(preset.title);
      if (preset.recipientName) {
        setRecipientMode("same");
        setSharedRecipientName(preset.recipientName);
      }
      if (preset.courseOrAchievement) setSharedCourse(preset.courseOrAchievement);
      if (preset.organizationName) setOrganizationName(preset.organizationName);
      if (preset.description !== undefined) setSharedDescription(preset.description);
      if (preset.issueDate) setSharedIssueDate(preset.issueDate);
      if (preset.expiryDate !== undefined) setSharedExpiryDate(preset.expiryDate);
      if (preset.signatoryName !== undefined) setSignatoryName(preset.signatoryName);
      if (preset.signatoryDesignation !== undefined)
        setSignatoryDesignation(preset.signatoryDesignation);
      if (preset.orientation) setOrientationOverride(preset.orientation);
      if (Array.isArray(preset.elements)) setCustomElements(preset.elements);
      if (preset.style) setStyleOverrides(preset.style);
      if (preset.certificateCode) setSharedIdenticalCode(preset.certificateCode);
      if (announce) {
        setStatusMsg(
          `Imported your custom Certificate Studio design (${preset.elements?.length ?? 0} canvas layers). Enter how many copies you want and click Generate!`
        );
      }
    } catch {
      // ignore malformed preset
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const fromParam = params.get("from");
    if (modeParam === "csv" || modeParam === "spreadsheet") {
      setBatchMode("spreadsheet");
    } else if (modeParam === "quantity") {
      setBatchMode("quantity");
    }
    const hasSaved = Boolean(window.localStorage.getItem(BULK_STUDIO_PRESET_KEY));
    setStudioPresetAvailable(hasSaved);
    if (fromParam === "studio" && hasSaved) {
      loadStudioPreset(false);
    }
  }, [loadStudioPreset]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.slug === templateSlug) || templates[0],
    [templates, templateSlug]
  );

  const styleConfig = useMemo<CertificateStyleConfig>(() => {
    const cfg = (selectedTemplate?.layout_config ?? {}) as Record<string, string>;
    const baseStyle = createDefaultCertificateStyle({
      backgroundColor: cfg.background || "#FFFDF7",
      primaryColor: cfg.primaryColor || "#0F4C5C",
      accentColor: cfg.accentColor || "#C59B27",
      borderStyle: (cfg.borderStyle as CertificateStyleConfig["borderStyle"]) || "double-gold",
      fontDisplay: cfg.fontDisplay || "Cormorant Garamond",
      fontBody: cfg.fontBody || "Plus Jakarta Sans",
    });
    return {
      ...baseStyle,
      ...styleOverrides,
    };
  }, [selectedTemplate, styleOverrides]);

  const orientation = orientationOverride || selectedTemplate?.orientation || "landscape";

  const elements = useMemo<CertificateCanvasElement[]>(() => {
    if (customElements !== null) return customElements;
    return defaultStampElement ? [defaultStampElement] : [];
  }, [customElements, defaultStampElement]);

  const isOfficialActive = hasApprovedIssuer && publishOfficial;
  const effectiveCopyMode = isOfficialActive ? "unique" : copyIdentityMode;

  const quantityPreviewRows = useMemo<PlannedCertificateRow[]>(() => {
    const count = clampQuantity(quantity);
    const padLen = Math.max(3, String(count + numberedStart).length);
    const cleanPrefix = (customCodePrefix.trim() || "FCS-2026-").toUpperCase();
    const issueDate = sharedIssueDate || new Date().toISOString().slice(0, 10);

    return Array.from({ length: count }, (_, idx) => {
      const seqNum = numberedStart + idx;
      const seqPadded = String(seqNum).padStart(padLen, "0");
      const recipient =
        recipientMode === "blank"
          ? "______________________________"
          : recipientMode === "numbered"
            ? `${sharedRecipientName.trim() || "Participant"} #${seqPadded}`
            : sharedRecipientName.trim() || "Valued Participant";

      const code =
        effectiveCopyMode === "identical"
          ? sharedIdenticalCode || "FCS-CERT-BATCH"
          : codeStrategy === "prefix"
            ? `${cleanPrefix}${seqPadded}`
            : `FCS-AUTO-${seqPadded}`;

      return {
        recipientName: recipient,
        courseOrAchievement: sharedCourse.trim() || "Program Completion",
        title: certificateTitle.trim() || "Certificate of Completion",
        issueDate,
        expiryDate: sharedExpiryDate || "",
        description: sharedDescription,
        certificateCode: code,
      };
    });
  }, [
    quantity,
    numberedStart,
    customCodePrefix,
    sharedIssueDate,
    sharedExpiryDate,
    recipientMode,
    sharedRecipientName,
    effectiveCopyMode,
    sharedIdenticalCode,
    codeStrategy,
    sharedCourse,
    certificateTitle,
    sharedDescription,
  ]);

  const activeCount = batchMode === "quantity" ? clampQuantity(quantity) : rows.length;

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
      const normalized = rawJson.slice(0, 500).map((r) => {
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
      setColCourse(
        guessColumn(hdrs, ["course", "program", "event", "track", "achievement"]) || hdrs[1] || ""
      );
      setColTitle(guessColumn(hdrs, ["title", "award"]));
      setColDate(guessColumn(hdrs, ["date", "issued"]));
      setColDesc(guessColumn(hdrs, ["desc", "citation", "note"]));
      setBatchMode("spreadsheet");
      setStatusMsg(`Loaded ${normalized.length} recipient rows from "${file.name}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not parse spreadsheet.");
    }
  };

  const previewRowData = useMemo(() => {
    if (activeRenderRow) return activeRenderRow;
    if (batchMode === "quantity") {
      const firstQ = quantityPreviewRows[0];
      return {
        code:
          effectiveCopyMode === "identical"
            ? sharedIdenticalCode
            : codeStrategy === "prefix"
              ? firstQ?.certificateCode || "FCS-2026-001"
              : "FCS-CERT-PREVIEW",
        recipientName: firstQ?.recipientName || "Valued Participant",
        course: firstQ?.courseOrAchievement || "Program Completion",
        title: firstQ?.title || certificateTitle,
        issueDate: firstQ?.issueDate || new Date().toISOString().slice(0, 10),
        expiryDate: firstQ?.expiryDate || "",
        description: firstQ?.description || "",
      };
    }
    const first = rows[0] || SAMPLE_COHORT_ROWS[0];
    return {
      code: "FCS-CERT-PREVIEW",
      recipientName: (colRecipient && first[colRecipient]) || "Recipient Name",
      course: (colCourse && first[colCourse]) || "Course Achievement",
      title: (colTitle && first[colTitle]) || certificateTitle,
      issueDate: (colDate && first[colDate]) || new Date().toISOString().slice(0, 10),
      expiryDate: "",
      description: (colDesc && first[colDesc]) || "",
    };
  }, [
    activeRenderRow,
    batchMode,
    quantityPreviewRows,
    effectiveCopyMode,
    sharedIdenticalCode,
    codeStrategy,
    certificateTitle,
    rows,
    colRecipient,
    colCourse,
    colTitle,
    colDate,
    colDesc,
  ]);

  const waitForNextFramePaint = async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 65));
  };

  const handleGenerateBatch = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    cancelBatchRef.current = false;

    const count = clampQuantity(quantity);
    let mapped: PlannedCertificateRow[] = [];

    if (batchMode === "quantity") {
      const padLen = Math.max(3, String(count + numberedStart).length);
      const cleanPrefix = (customCodePrefix.trim() || "FCS-2026-").toUpperCase();
      const batchToken = buildRandomToken(4);
      const issueDate = sharedIssueDate || new Date().toISOString().slice(0, 10);

      mapped = Array.from({ length: count }, (_, idx) => {
        const seqNum = numberedStart + idx;
        const seqPadded = String(seqNum).padStart(padLen, "0");
        const recipient =
          recipientMode === "blank"
            ? "______________________________"
            : recipientMode === "numbered"
              ? `${sharedRecipientName.trim() || "Participant"} #${seqPadded}`
              : sharedRecipientName.trim() || "Valued Participant";

        let certificateCode: string;
        if (effectiveCopyMode === "identical") {
          certificateCode = sharedIdenticalCode || generateCertificateCode();
        } else if (codeStrategy === "prefix") {
          // Include a short batch token when registering officially so repeated batches never collide on unique DB codes
          certificateCode = isOfficialActive
            ? `${cleanPrefix}${batchToken}-${seqPadded}`
            : `${cleanPrefix}${seqPadded}`;
        } else {
          certificateCode = generateCertificateCode();
        }

        return {
          recipientName: recipient,
          courseOrAchievement: sharedCourse.trim() || "Program Completion",
          title: certificateTitle.trim() || "Certificate of Completion",
          issueDate,
          expiryDate: sharedExpiryDate || "",
          description: sharedDescription,
          certificateCode,
        };
      });
    } else {
      if (rows.length === 0) {
        setErrorMsg("Upload a CSV/Excel file or switch to Same Certificate × Number mode.");
        return;
      }
      if (!colRecipient) {
        setErrorMsg("Select which spreadsheet column contains Recipient Names.");
        return;
      }

      mapped = rows
        .map((r) => ({
          recipientName: (r[colRecipient] || "").trim(),
          courseOrAchievement: (colCourse && r[colCourse]) || "Program Completion",
          title: (colTitle && r[colTitle]) || certificateTitle,
          issueDate: (colDate && r[colDate]) || new Date().toISOString().slice(0, 10),
          expiryDate: "",
          description: (colDesc && r[colDesc]) || "",
          certificateCode: generateCertificateCode(),
        }))
        .filter((item) => Boolean(item.recipientName));

      if (mapped.length === 0) {
        setErrorMsg("No non-empty recipient rows found for the mapped Name column.");
        return;
      }
    }

    setGenerating(true);
    try {
      let serverIssued: Array<{
        id: string;
        recipient_name: string;
        certificate_code: string;
      }> = [];

      if (isOfficialActive) {
        const res = await fetch("/api/certificates/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchName,
            batchMode,
            issuerId: selectedIssuerId || approvedIssuers[0].id,
            templateSlug,
            orientation,
            canvasWidth: styleConfig.canvasWidth || (orientation === "landscape" ? 1123 : 794),
            canvasHeight: styleConfig.canvasHeight || (orientation === "landscape" ? 794 : 1123),
            issueOfficial: true,
            columnMapping:
              batchMode === "quantity"
                ? {
                    mode: "quantity",
                    count: String(mapped.length),
                    recipientMode,
                  }
                : {
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
              expiryDate: m.expiryDate || "",
              organizationName,
              certificateTitle: m.title,
              description: m.description,
              signatoryName,
              signatoryDesignation,
              certificateCode: m.certificateCode,
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

      const baseDims = {
        width: Number(styleConfig.canvasWidth) || (orientation === "landscape" ? 1123 : 794),
        height: Number(styleConfig.canvasHeight) || (orientation === "landscape" ? 794 : 1123),
      };
      const isCustomRatio =
        Math.abs(baseDims.width / baseDims.height - 1123 / 794) > 0.08 &&
        Math.abs(baseDims.width / baseDims.height - 794 / 1123) > 0.08;

      setProgress({ current: 0, total: mapped.length });
      const zip = new JSZip();
      let mergedPdf: jsPDF | null = null;
      const safeBatch = batchName.replace(/[^a-z0-9-_]+/gi, "_") || "Certificate_Batch";

      // ULTRA-FAST IDENTICAL CLONE PATH (renders canvas ONCE, copies N times in milliseconds!)
      const isIdenticalCloneBatch =
        batchMode === "quantity" &&
        effectiveCopyMode === "identical" &&
        recipientMode !== "numbered" &&
        !isOfficialActive;

      if (isIdenticalCloneBatch) {
        const master = mapped[0];
        setActiveRenderRow({
          code: master.certificateCode,
          recipientName: master.recipientName,
          course: master.courseOrAchievement,
          title: master.title,
          issueDate: master.issueDate,
          expiryDate: master.expiryDate,
          description: master.description,
        });
        await waitForNextFramePaint();

        if (!renderCanvasRef.current) {
          setErrorMsg("Preview canvas not ready. Please try again.");
          return;
        }

        const safeName =
          master.recipientName.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40) || "Certificate";

        if (exportFormat === "zip_png") {
          const dataUrl = await renderElementToPngDataUrl(renderCanvasRef.current, {
            pixelRatio: 2,
          });
          const base64 = dataUrl.split(",")[1];
          for (let i = 0; i < mapped.length; i += 1) {
            if (cancelBatchRef.current) break;
            zip.file(
              `${String(i + 1).padStart(3, "0")}_${safeName}_${master.certificateCode}.png`,
              base64,
              { base64: true }
            );
            if ((i + 1) % 25 === 0 || i + 1 === mapped.length) {
              setProgress({ current: i + 1, total: mapped.length });
            }
          }
        } else if (exportFormat === "zip_pdf") {
          const pdfBlob = await renderElementToPdfBlob(
            renderCanvasRef.current,
            orientation,
            baseDims
          );
          const pdfBytes = await pdfBlob.arrayBuffer();
          for (let i = 0; i < mapped.length; i += 1) {
            if (cancelBatchRef.current) break;
            zip.file(
              `${String(i + 1).padStart(3, "0")}_${safeName}_${master.certificateCode}.pdf`,
              pdfBytes
            );
            if ((i + 1) % 25 === 0 || i + 1 === mapped.length) {
              setProgress({ current: i + 1, total: mapped.length });
            }
          }
        } else {
          const dataUrl = await renderElementToPngDataUrl(renderCanvasRef.current, {
            pixelRatio: 2,
          });
          const wMm = Math.round(baseDims.width * 0.264583 * 10) / 10;
          const hMm = Math.round(baseDims.height * 0.264583 * 10) / 10;
          mergedPdf = isCustomRatio
            ? new jsPDF({
                orientation: wMm >= hMm ? "landscape" : "portrait",
                unit: "mm",
                format: [wMm, hMm],
                compress: true,
              })
            : new jsPDF({
                orientation,
                unit: "mm",
                format: "a4",
                compress: true,
              });

          const pageW = mergedPdf.internal.pageSize.getWidth();
          const pageH = mergedPdf.internal.pageSize.getHeight();
          for (let i = 0; i < mapped.length; i += 1) {
            if (cancelBatchRef.current) break;
            if (i > 0) {
              if (isCustomRatio) {
                mergedPdf.addPage([wMm, hMm], wMm >= hMm ? "landscape" : "portrait");
              } else {
                mergedPdf.addPage("a4", orientation);
              }
            }
            // Fixed image alias shares XObject across all N pages -> tiny PDF & near-instant generation!
            mergedPdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, "SHARED_CERT_IMG", "FAST");
            if ((i + 1) % 25 === 0 || i + 1 === mapped.length) {
              setProgress({ current: i + 1, total: mapped.length });
            }
          }
        }
      } else {
        // UNIQUE QR / PER-ROW RENDERING PATH
        const wMm = Math.round(baseDims.width * 0.264583 * 10) / 10;
        const hMm = Math.round(baseDims.height * 0.264583 * 10) / 10;

        for (let i = 0; i < mapped.length; i += 1) {
          if (cancelBatchRef.current) break;
          const item = mapped[i];
          const code = serverIssued[i]?.certificate_code || item.certificateCode;
          setActiveRenderRow({
            code,
            recipientName: item.recipientName,
            course: item.courseOrAchievement,
            title: item.title,
            issueDate: item.issueDate,
            expiryDate: item.expiryDate,
            description: item.description,
          });

          await waitForNextFramePaint();
          if (!renderCanvasRef.current || cancelBatchRef.current) continue;

          const safeName =
            item.recipientName.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40) || `Row_${i + 1}`;

          if (exportFormat === "zip_png") {
            const dataUrl = await renderElementToPngDataUrl(renderCanvasRef.current, {
              pixelRatio: 2,
            });
            const base64 = dataUrl.split(",")[1];
            zip.file(`${String(i + 1).padStart(3, "0")}_${safeName}_${code}.png`, base64, {
              base64: true,
            });
          } else if (exportFormat === "zip_pdf") {
            const blob = await renderElementToPdfBlob(
              renderCanvasRef.current,
              orientation,
              baseDims
            );
            zip.file(`${String(i + 1).padStart(3, "0")}_${safeName}_${code}.pdf`, blob);
          } else {
            const dataUrl = await renderElementToPngDataUrl(renderCanvasRef.current, {
              pixelRatio: 2,
            });
            if (!mergedPdf) {
              mergedPdf = isCustomRatio
                ? new jsPDF({
                    orientation: wMm >= hMm ? "landscape" : "portrait",
                    unit: "mm",
                    format: [wMm, hMm],
                    compress: true,
                  })
                : new jsPDF({
                    orientation,
                    unit: "mm",
                    format: "a4",
                    compress: true,
                  });
            } else if (isCustomRatio) {
              mergedPdf.addPage([wMm, hMm], wMm >= hMm ? "landscape" : "portrait");
            } else {
              mergedPdf.addPage("a4", orientation);
            }
            const pageW = mergedPdf.internal.pageSize.getWidth();
            const pageH = mergedPdf.internal.pageSize.getHeight();
            mergedPdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
          }

          setProgress({ current: i + 1, total: mapped.length });
        }
      }

      if (cancelBatchRef.current) {
        setStatusMsg("Batch export canceled cleanly.");
        return;
      }

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
          : `Successfully generated & downloaded ${mapped.length} certificates in "${batchName}"!`
      );
    } finally {
      setActiveRenderRow(null);
      setGenerating(false);
    }
  };

  const progressPct =
    progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            Batch Issuance &amp; Cohort Export
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Bulk Certificate Generator
          </h1>
          <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
            Generate any exact number of the same certificate (1 to 500 copies with unique or
            identical QR IDs), or upload an Excel/CSV roster for custom cohorts.
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

      {studioPresetAvailable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-600/30 bg-teal-50/70 px-4 py-3 text-xs dark:bg-teal-950/35">
          <div className="flex items-center gap-2 font-medium text-teal-900 dark:text-teal-200">
            <Layers className="h-4 w-4 shrink-0 text-teal-600" />
            <span>
              {customElements !== null
                ? "Certificate Studio design loaded — every copy below inherits your exact layout, colors, and layers."
                : "Want to bulk print your latest Certificate Studio design (colors, logos, stamps, signatures)?"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadStudioPreset(true)}
              className="cursor-pointer rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white hover:bg-teal-800"
            >
              {customElements !== null ? "Re-sync Studio Design" : "Load Studio Design"}
            </button>
            {customElements !== null && (
              <button
                type="button"
                onClick={() => {
                  setCustomElements(null);
                  setStyleOverrides({});
                  setOrientationOverride(null);
                  setStatusMsg("Reset to clean bulk template defaults.");
                }}
                className="cursor-pointer rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3 py-1.5 font-semibold"
              >
                Reset Defaults
              </button>
            )}
          </div>
        </div>
      )}

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
          {/* Step 1: Mode Switcher + Inputs */}
          <div className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">1. Choose Batch Method</h2>
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                {activeCount} {activeCount === 1 ? "Certificate" : "Certificates"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-1 font-semibold">
              <button
                type="button"
                onClick={() => setBatchMode("quantity")}
                className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                  batchMode === "quantity"
                    ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                    : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                <Hash className="h-3.5 w-3.5 text-teal-600" />
                Same Cert &times; Number
              </button>
              <button
                type="button"
                onClick={() => setBatchMode("spreadsheet")}
                className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                  batchMode === "spreadsheet"
                    ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                    : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
                CSV / Excel Roster
              </button>
            </div>

            {batchMode === "quantity" ? (
              <div className="space-y-4">
                {/* Quantity Number Input + Quick Presets */}
                <div className="rounded-xl border border-teal-600/25 bg-teal-50/40 p-3.5 dark:bg-teal-950/20">
                  <label className="mb-2 block font-bold text-[var(--fcs-ink)]">
                    How Many Certificates to Generate? (1 – 500)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity((q) => clampQuantity(q - 5))}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] font-bold hover:border-teal-600/50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value || "1", 10);
                        setQuantity(Number.isNaN(raw) ? 1 : Math.max(1, Math.min(500, raw)));
                      }}
                      className="h-10 flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3 text-center font-mono text-base font-bold outline-none focus:border-teal-600"
                    />
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQuantity((q) => clampQuantity(q + 5))}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] font-bold hover:border-teal-600/50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {QUANTITY_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
                          quantity === preset
                            ? "border-teal-600 bg-teal-700 text-white"
                            : "border-[var(--fcs-border)] bg-[var(--fcs-surface)] text-[var(--fcs-ink-muted)] hover:border-teal-600/40 hover:text-[var(--fcs-ink)]"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Name Strategy */}
                <div className="space-y-2">
                  <label className="block font-semibold">Recipient Name on All {quantity} Copies</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "same", label: "Same Text" },
                      { id: "blank", label: "Blank Line" },
                      { id: "numbered", label: "Auto #001" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setRecipientMode(opt.id as "same" | "blank" | "numbered")
                        }
                        className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                          recipientMode === opt.id
                            ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                            : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {recipientMode === "blank" ? (
                    <p className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-[11px] text-[var(--fcs-ink-muted)]">
                      Prints a clean blank signature line (<code>______________________________</code>) on all{" "}
                      <strong>{quantity}</strong> copies for handwritten names.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div className={recipientMode === "numbered" ? "col-span-2" : "col-span-3"}>
                        <input
                          type="text"
                          value={sharedRecipientName}
                          onChange={(e) => setSharedRecipientName(e.target.value)}
                          placeholder={
                            recipientMode === "numbered"
                              ? "Base label (e.g. Participant)"
                              : "Recipient name (e.g. Valued Participant)"
                          }
                          className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                        />
                      </div>
                      {recipientMode === "numbered" && (
                        <div>
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            value={numberedStart}
                            onChange={(e) =>
                              setNumberedStart(Math.max(1, parseInt(e.target.value || "1", 10) || 1))
                            }
                            aria-label="Start serial number"
                            placeholder="Start #"
                            className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Shared Course, Dates & Citation */}
                <div>
                  <label className="mb-1 block font-semibold">Course / Achievement</label>
                  <input
                    type="text"
                    value={sharedCourse}
                    onChange={(e) => setSharedCourse(e.target.value)}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block font-semibold">Issue Date</label>
                    <input
                      type="date"
                      value={sharedIssueDate}
                      onChange={(e) => setSharedIssueDate(e.target.value)}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      value={sharedExpiryDate}
                      onChange={(e) => setSharedExpiryDate(e.target.value)}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-semibold">Description / Citation</label>
                  <textarea
                    rows={2}
                    value={sharedDescription}
                    onChange={(e) => setSharedDescription(e.target.value)}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5"
                  />
                </div>

                {/* Unique Serial vs Exact Identical Clone */}
                <div className="space-y-2 border-t border-[var(--fcs-border)] pt-3">
                  <label className="block font-semibold">Certificate Code &amp; QR Behavior</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCopyIdentityMode("unique")}
                      className={`flex cursor-pointer flex-col items-start rounded-xl border p-2.5 text-left transition ${
                        effectiveCopyMode === "unique"
                          ? "border-teal-600 bg-teal-50/80 dark:bg-teal-950/40"
                          : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
                      }`}
                    >
                      <span className="flex items-center gap-1 font-bold">
                        <QrCode className="h-3.5 w-3.5 text-teal-600" />
                        Unique ID &amp; QR
                      </span>
                      <span className="mt-0.5 text-[10px] text-[var(--fcs-ink-muted)]">
                        Distinct verifiable code per copy
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isOfficialActive}
                      onClick={() => setCopyIdentityMode("identical")}
                      className={`flex cursor-pointer flex-col items-start rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        effectiveCopyMode === "identical"
                          ? "border-teal-600 bg-teal-50/80 dark:bg-teal-950/40"
                          : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
                      }`}
                    >
                      <span className="flex items-center gap-1 font-bold">
                        <Copy className="h-3.5 w-3.5 text-teal-600" />
                        Exact Identical
                      </span>
                      <span className="mt-0.5 text-[10px] text-[var(--fcs-ink-muted)]">
                        Instant 1-render clone &times; {quantity}
                      </span>
                    </button>
                  </div>

                  {isOfficialActive && (
                    <p className="text-[10px] text-[var(--fcs-ink-muted)]">
                      Public QR Registry verification requires a unique ID per copy. Uncheck
                      registry registration below if you want identical clones.
                    </p>
                  )}

                  {effectiveCopyMode === "unique" ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCodeStrategy("auto")}
                          className={`flex-1 cursor-pointer rounded-lg border py-1.5 text-[11px] font-semibold ${
                            codeStrategy === "auto"
                              ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                              : "border-[var(--fcs-border)]"
                          }`}
                        >
                          Auto Random IDs
                        </button>
                        <button
                          type="button"
                          onClick={() => setCodeStrategy("prefix")}
                          className={`flex-1 cursor-pointer rounded-lg border py-1.5 text-[11px] font-semibold ${
                            codeStrategy === "prefix"
                              ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                              : "border-[var(--fcs-border)]"
                          }`}
                        >
                          Custom Prefix + #
                        </button>
                      </div>
                      {codeStrategy === "prefix" && (
                        <input
                          type="text"
                          value={customCodePrefix}
                          onChange={(e) => setCustomCodePrefix(e.target.value.toUpperCase())}
                          placeholder="e.g. FCS-2026-"
                          className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 font-mono"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={sharedIdenticalCode}
                        onChange={(e) => setSharedIdenticalCode(e.target.value.toUpperCase())}
                        className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setSharedIdenticalCode(generateCertificateCode())}
                        className="cursor-pointer rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 font-semibold"
                      >
                        New ID
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* CSV / Excel Upload Mode */
              <div className="space-y-3">
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
                    className="cursor-pointer rounded-xl border border-[var(--fcs-border)] px-3 py-2 font-semibold hover:bg-[var(--fcs-surface-muted)]"
                  >
                    Load Sample 3-Row Roster
                  </button>
                </div>
                <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                  Loaded <strong>{rows.length}</strong> rows (max 500) with columns:{" "}
                  <span className="font-mono">{headers.join(", ")}</span>
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
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
            )}
          </div>

          {/* Step 2: Template, Style & Export */}
          <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 text-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-teal-600" />
              2. Template, Style &amp; Output Format
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
                onChange={(e) => {
                  setTemplateSlug(e.target.value);
                  setOrientationOverride(null);
                  setStyleOverrides({});
                }}
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

            {/* Quick Colors, Border & QR */}
            <div className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Quick Style &amp; Borders</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium">
                  <input
                    type="checkbox"
                    checked={styleConfig.showQrCode}
                    onChange={(e) =>
                      setStyleOverrides((prev) => ({ ...prev, showQrCode: e.target.checked }))
                    }
                    className="accent-teal-700"
                  />
                  Show QR Code
                </label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-[var(--fcs-ink-muted)]">
                    Paper
                  </label>
                  <input
                    type="color"
                    value={styleConfig.backgroundColor}
                    onChange={(e) =>
                      setStyleOverrides((prev) => ({ ...prev, backgroundColor: e.target.value }))
                    }
                    className="h-7 w-full cursor-pointer rounded border border-[var(--fcs-border)]"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-[var(--fcs-ink-muted)]">
                    Ink
                  </label>
                  <input
                    type="color"
                    value={styleConfig.primaryColor}
                    onChange={(e) =>
                      setStyleOverrides((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="h-7 w-full cursor-pointer rounded border border-[var(--fcs-border)]"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-[var(--fcs-ink-muted)]">
                    Accent
                  </label>
                  <input
                    type="color"
                    value={styleConfig.accentColor}
                    onChange={(e) =>
                      setStyleOverrides((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="h-7 w-full cursor-pointer rounded border border-[var(--fcs-border)]"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-[var(--fcs-ink-muted)]">
                    Frame
                  </label>
                  <select
                    value={styleConfig.borderStyle}
                    onChange={(e) =>
                      setStyleOverrides((prev) => ({
                        ...prev,
                        borderStyle: e.target.value as CertificateStyleConfig["borderStyle"],
                      }))
                    }
                    className="h-7 w-full rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-1 text-[10px]"
                  >
                    <option value="double-gold">Gold</option>
                    <option value="architectural">Arch</option>
                    <option value="filigree">Filigree</option>
                    <option value="prestige-navy">Navy</option>
                    <option value="modern-frame">Modern</option>
                    <option value="academic-crest">Crest</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              {elements.length > 0 && (
                <p className="text-[10px] text-teal-800 dark:text-teal-300">
                  Active graphic layers on every copy:{" "}
                  <strong>{elements.map((e) => e.label).join(", ")}</strong>
                </p>
              )}
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
                <label className="flex cursor-pointer items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
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
                Running in <strong>Sample Bulk Mode</strong> (up to 500 certificates free!). For
                officially verified batch credentials, apply at{" "}
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
                <option value="merged_pdf">
                  Single Combined Multi-Page Print PDF ({activeCount} Pages)
                </option>
                <option value="zip_png">
                  ZIP Archive of {activeCount} High-Res PNGs
                </option>
                <option value="zip_pdf">
                  ZIP Archive of {activeCount} Individual A4 PDFs
                </option>
              </select>
            </div>

            {generating && progress.total > 0 && (
              <div className="space-y-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span>
                    Generating {progress.current} of {progress.total}
                  </span>
                  <span className="font-mono text-teal-700 dark:text-teal-400">
                    {progressPct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--fcs-border)]">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all duration-150"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={generating || activeCount === 0}
                onClick={handleGenerateBatch}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rendering {progress.current} / {progress.total}...
                  </>
                ) : (
                  <>
                    {isOfficialActive ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Generate &amp; Download {activeCount} Certificates
                  </>
                )}
              </button>
              {generating && (
                <button
                  type="button"
                  onClick={() => {
                    cancelBatchRef.current = true;
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-red-500/40 bg-red-50 px-3 py-3 text-xs font-bold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                >
                  <XCircle className="h-4 w-4" /> Stop
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT LIVE PREVIEW */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Live Copy #1 / Render Preview ({orientation})
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
                width: `${(Number(styleConfig.canvasWidth) || (orientation === "landscape" ? 1123 : 794)) * 0.56}px`,
                height: `${(Number(styleConfig.canvasHeight) || (orientation === "landscape" ? 794 : 1123)) * 0.56}px`,
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
                expiryDate={previewRowData.expiryDate}
                signatoryName={signatoryName}
                signatoryDesignation={signatoryDesignation}
                orientation={orientation}
                elements={elements}
                style={styleConfig}
                isVerified={isOfficialActive}
                isSample={!isOfficialActive}
              />
            </div>
          </div>

          {/* Preview Schedule Table */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold">
                Batch Schedule Preview (Showing first {Math.min(8, activeCount)} of {activeCount})
              </h3>
              <span className="font-mono text-[10px] text-[var(--fcs-ink-muted)]">
                {batchMode === "quantity"
                  ? effectiveCopyMode === "identical"
                    ? "Exact Identical Clones"
                    : "Unique Serials + QR"
                  : "CSV / Excel Rows"}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--fcs-border)] text-[var(--fcs-ink-muted)]">
                <tr>
                  <th className="py-1.5 pr-3">#</th>
                  <th className="py-1.5 pr-3">Recipient</th>
                  <th className="py-1.5 pr-3">Course / Achievement</th>
                  <th className="py-1.5 pr-3">Certificate ID</th>
                  <th className="py-1.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {batchMode === "quantity"
                  ? quantityPreviewRows.slice(0, 8).map((r, idx) => (
                      <tr key={idx} className="border-b border-[var(--fcs-border)]/50">
                        <td className="py-1.5 pr-3 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-1.5 pr-3 font-semibold">{r.recipientName}</td>
                        <td className="py-1.5 pr-3">{r.courseOrAchievement}</td>
                        <td className="py-1.5 pr-3 font-mono text-[11px]">{r.certificateCode}</td>
                        <td className="py-1.5 font-mono text-[11px]">{r.issueDate}</td>
                      </tr>
                    ))
                  : rows.slice(0, 8).map((r, idx) => (
                      <tr key={idx} className="border-b border-[var(--fcs-border)]/50">
                        <td className="py-1.5 pr-3 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-1.5 pr-3 font-semibold">{r[colRecipient] || "—"}</td>
                        <td className="py-1.5 pr-3">{(colCourse && r[colCourse]) || "Default"}</td>
                        <td className="py-1.5 pr-3 font-mono text-[11px]">AUTO-QR</td>
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
