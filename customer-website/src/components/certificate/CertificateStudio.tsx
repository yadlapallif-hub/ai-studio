"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  analyzeCertificateDesign,
  createDecorativeSampleStampSvg,
  generateCertificateCode,
  type CertificateCanvasElement,
  type CertificateStyleConfig,
} from "@francis/shared";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  Download,
  FileDown,
  ImagePlus,
  Loader2,
  Printer,
  QrCode,
  Save,
  ShieldCheck,
  Sparkles,
  Stamp,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CertificateCanvas } from "./CertificateCanvas";
import { PhotoEditorModal, type EditedPhotoResult } from "../studio/PhotoEditorModal";
import {
  exportElementAsA4Pdf,
  exportElementAsPng,
  logDocumentExport,
} from "@/lib/exportHelpers";

interface CertTemplateOption {
  id: string;
  slug: string;
  name: string;
  category: string;
  orientation: "landscape" | "portrait";
  layout_config: Record<string, unknown>;
}

interface CertificateStudioProps {
  initialCertId: string | null;
  initialCertificateCode: string;
  initialTemplateSlug: string;
  initialTitle: string;
  initialRecipientName: string;
  initialCourse: string;
  initialOrganization: string;
  initialDescription: string;
  initialIssueDate: string;
  initialExpiryDate: string;
  initialSignatoryName: string;
  initialSignatoryDesignation: string;
  initialOrientation: "landscape" | "portrait";
  initialElements: CertificateCanvasElement[];
  initialStyle: CertificateStyleConfig;
  initialVerificationStatus: string;
  templates: CertTemplateOption[];
  approvedIssuers: Array<{ id: string; organization_name: string }>;
  isAuthenticated: boolean;
}

export function CertificateStudio(props: CertificateStudioProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [certId, setCertId] = useState<string | null>(props.initialCertId);
  const [certificateCode, setCertificateCode] = useState(props.initialCertificateCode);
  const [templateSlug, setTemplateSlug] = useState(props.initialTemplateSlug);
  const [title, setTitle] = useState(props.initialTitle);
  const [recipientName, setRecipientName] = useState(props.initialRecipientName);
  const [courseOrAchievement, setCourseOrAchievement] = useState(props.initialCourse);
  const [organizationName, setOrganizationName] = useState(props.initialOrganization);
  const [description, setDescription] = useState(props.initialDescription);
  const [issueDate, setIssueDate] = useState(props.initialIssueDate);
  const [expiryDate, setExpiryDate] = useState(props.initialExpiryDate);
  const [signatoryName, setSignatoryName] = useState(props.initialSignatoryName);
  const [signatoryDesignation, setSignatoryDesignation] = useState(
    props.initialSignatoryDesignation
  );
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    props.initialOrientation
  );
  const [elements, setElements] = useState<CertificateCanvasElement[]>(props.initialElements);
  const [style, setStyle] = useState<CertificateStyleConfig>(props.initialStyle);
  const [verificationStatus, setVerificationStatus] = useState(props.initialVerificationStatus);
  const [selectedIssuerId, setSelectedIssuerId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"details" | "design" | "stamps" | "ai">("details");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    props.initialElements[0]?.id ?? null
  );
  const [authorizedConfirm, setAuthorizedConfirm] = useState(false);
  const [zoom, setZoom] = useState(orientation === "landscape" ? 0.64 : 0.72);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedElementId) ?? null,
    [elements, selectedElementId]
  );

  const designReview = useMemo(
    () =>
      analyzeCertificateDesign({
        title,
        recipientName,
        courseName: courseOrAchievement,
        organizationName,
        signatoryName,
        elements,
        style,
      }),
    [title, recipientName, courseOrAchievement, organizationName, signatoryName, elements, style]
  );

  const applyTemplate = (slug: string) => {
    setTemplateSlug(slug);
    const tpl = props.templates.find((t) => t.slug === slug);
    if (!tpl) return;
    setOrientation(tpl.orientation);
    setZoom(tpl.orientation === "landscape" ? 0.64 : 0.72);
    const cfg = tpl.layout_config as Record<string, string>;
    setStyle((prev) => ({
      ...prev,
      backgroundColor: cfg.background || prev.backgroundColor,
      primaryColor: cfg.primaryColor || prev.primaryColor,
      accentColor: cfg.accentColor || prev.accentColor,
      fontDisplay: cfg.fontDisplay || prev.fontDisplay,
      fontBody: cfg.fontBody || prev.fontBody,
      borderStyle: (cfg.borderStyle as CertificateStyleConfig["borderStyle"]) || prev.borderStyle,
    }));
    if (cfg.titleDefault) setTitle(cfg.titleDefault);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    if (!props.isAuthenticated) {
      localStorage.setItem(
        "fcs-unsaved-certificate",
        JSON.stringify({
          certificateCode,
          templateSlug,
          title,
          recipientName,
          courseOrAchievement,
          organizationName,
          description,
          issueDate,
          expiryDate,
          signatoryName,
          signatoryDesignation,
          orientation,
          elements,
          style,
        })
      );
      setStatusMsg("Certificate saved locally in browser. Sign in to save & enable QR verification.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const hasOnlySampleStamps = elements
        .filter((e) => e.type === "stamp" || e.type === "seal" || e.type === "decorative_badge")
        .every((e) => e.isSampleDecorative);

      const authorizationType = selectedIssuerId
        ? "authorized_issuer"
        : hasOnlySampleStamps
          ? "sample_preview"
          : "self_issued_draft";

      const payload = {
        user_id: user.id,
        template_slug: templateSlug,
        issuer_id: selectedIssuerId || null,
        certificate_code: certificateCode,
        title: title.trim() || "Certificate",
        recipient_name: recipientName.trim() || "Recipient",
        course_or_achievement: courseOrAchievement.trim() || "Achievement",
        organization_name: organizationName.trim() || "Organization",
        description: description.trim() || null,
        issue_date: issueDate,
        expiry_date: expiryDate || null,
        signatory_name: signatoryName.trim() || null,
        signatory_designation: signatoryDesignation.trim() || null,
        orientation,
        canvas_elements: elements,
        style_config: style,
        authorization_type: authorizationType,
      };

      let savedCertId = certId;
      if (certId) {
        const { error } = await supabase
          .from("fcs_certificates")
          .update(payload)
          .eq("id", certId)
          .eq("user_id", user.id);
        if (error) {
          setErrorMsg(error.message);
          return;
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("fcs_certificates")
          .insert(payload)
          .select("id")
          .single();
        if (error || !inserted) {
          setErrorMsg(error?.message || "Failed saving certificate.");
          return;
        }
        savedCertId = inserted.id;
        setCertId(savedCertId);
      }

      // Sync public verification record (never sets 'verified' on client!)
      if (savedCertId) {
        await supabase.from("fcs_certificate_verifications").upsert(
          {
            certificate_id: savedCertId,
            certificate_code: certificateCode,
            issuer_id: selectedIssuerId || null,
            recipient_name: payload.recipient_name,
            certificate_title: payload.title,
            course_or_achievement: payload.course_or_achievement,
            issuing_organization: payload.organization_name,
            issue_date: payload.issue_date,
            expiry_date: payload.expiry_date,
            verification_status:
              verificationStatus === "verified" ? "verified" : "unverified_draft",
          },
          { onConflict: "certificate_id" }
        );
      }

      setStatusMsg("Certificate and QR registry record saved.");
      if (!certId && savedCertId) {
        router.replace(`/certificate-builder/${savedCertId}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForVerification = async () => {
    if (!certId || !props.isAuthenticated) {
      setErrorMsg("Save the certificate to your account first before requesting verification.");
      return;
    }
    setSubmittingVerify(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/certificates/submit-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificateId: certId,
          issuerId: selectedIssuerId || null,
        }),
      });
      const json = (await res.json()) as {
        verificationStatus?: string;
        error?: string;
      };
      if (!res.ok) {
        setErrorMsg(json.error || "Unable to submit verification.");
        return;
      }
      setVerificationStatus(json.verificationStatus || "pending_approval");
      setStatusMsg(
        json.verificationStatus === "verified"
          ? "Officially verified under your Approved Authorized Issuer account."
          : "Submitted for official verification review by an administrator."
      );
    } finally {
      setSubmittingVerify(false);
    }
  };

  const addCanvasAssetUpload = async (
    file: File,
    type: "logo" | "stamp" | "seal" | "signature" | "custom_image",
    inkStyle: CertificateCanvasElement["inkStyle"] = "default"
  ) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Upload PNG, JPG, WEBP, or SVG images.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File must be under 10 MB.");
      return;
    }

    if ((type === "stamp" || type === "seal" || type === "signature") && !authorizedConfirm) {
      setErrorMsg(
        "Confirm that you are authorized to upload this organizational stamp, seal, or signature."
      );
      return;
    }

    setErrorMsg(null);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

    if (props.isAuthenticated) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const path = `${user.id}/${type}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("fcs-vault").upload(path, file);
        if (!upErr) {
          const assetType =
            type === "logo"
              ? "organization_logo"
              : type === "custom_image"
                ? "other"
                : type;
          await supabase.from("fcs_uploaded_assets").insert({
            user_id: user.id,
            asset_type: assetType,
            file_name: file.name,
            storage_bucket: "fcs-vault",
            storage_path: path,
            mime_type: file.type,
            file_size: file.size,
            is_sample_decorative: false,
          });
        }
      }
    }

    const newEl: CertificateCanvasElement = {
      id: `el-${Date.now()}`,
      type,
      label: file.name,
      src: dataUrl,
      x: type === "logo" ? 45 : type === "signature" ? 42 : 76,
      y: type === "logo" ? 4 : type === "signature" ? 72 : 66,
      width: type === "signature" ? 150 : 110,
      height: type === "signature" ? 60 : 110,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      shape: type === "stamp" || type === "seal" ? "circle" : "rectangle",
      inkStyle,
      isSampleDecorative: false,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
    setStatusMsg(`${type.toUpperCase()} added — drag on the canvas to position.`);
  };

  const addSampleDecorativeStamp = (
    variant: "round_sample" | "gold_seal_sample" | "rect_draft_stamp"
  ) => {
    const preset = createDecorativeSampleStampSvg(variant);
    const newEl: CertificateCanvasElement = {
      id: `sample-${Date.now()}`,
      type: "decorative_badge",
      label: preset.label,
      src: preset.svgDataUrl,
      x: 76,
      y: 65,
      width: variant === "rect_draft_stamp" ? 175 : 116,
      height: variant === "rect_draft_stamp" ? 78 : 116,
      rotation: variant === "rect_draft_stamp" ? -8 : 0,
      opacity: 0.9,
      zIndex: elements.length + 1,
      shape: preset.shape,
      inkStyle: preset.inkStyle,
      isSampleDecorative: true,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const handleApplyRecipientPhoto = async (res: EditedPhotoResult) => {
    const newEl: CertificateCanvasElement = {
      id: `photo-${Date.now()}`,
      type: "recipient_photo",
      label: "Recipient Photo",
      src: res.dataUrl,
      x: 8,
      y: 26,
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      shape: res.shape,
      inkStyle: "default",
      isSampleDecorative: false,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const addCustomTextBlock = () => {
    const newEl: CertificateCanvasElement = {
      id: `txt-${Date.now()}`,
      type: "text_block",
      label: "Custom Text",
      text: "Cohort 2026 • Honors",
      x: 42,
      y: 86,
      width: 220,
      height: 40,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      fontSize: 15,
      color: style.primaryColor,
      align: "center",
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const updateSelectedElement = (patch: Partial<CertificateCanvasElement>) => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...patch } : el))
    );
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const safe = `${certificateCode}_${recipientName.replace(/[^a-z0-9-_]+/gi, "_")}.pdf`;
      await exportElementAsA4Pdf(canvasRef.current, safe, orientation);
      if (certId) await logDocumentExport("certificate", certId, "pdf");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const safe = `${certificateCode}_${recipientName.replace(/[^a-z0-9-_]+/gi, "_")}.png`;
      await exportElementAsPng(canvasRef.current, safe);
      if (certId) await logDocumentExport("certificate", certId, "png");
    } finally {
      setExporting(false);
    }
  };

  const runAiCertificateAssist = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "certificate_assist",
          contextPage: "Certificate Studio",
          contextData: { title, courseOrAchievement, organizationName, description },
          messages: [
            {
              role: "user",
              content:
                "Suggest clear, formal, balanced wording for this certificate's description and recommend ideal typography & color pairing.",
            },
          ],
        }),
      });
      const json = (await res.json()) as { reply?: string; message?: string };
      setAiAdvice(json.reply || json.message || "AI provider is not configured.");
    } finally {
      setAiLoading(false);
    }
  };

  const baseW = orientation === "landscape" ? 1123 : 794;
  const baseH = orientation === "landscape" ? 794 : 1123;

  return (
    <div className="min-h-screen bg-[var(--fcs-bg)]">
      {/* Studio Toolbar */}
      <div className="no-print border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/certificate-builder"
              className="rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
            >
              ← Gallery
            </Link>
            <select
              value={templateSlug}
              onChange={(e) => applyTemplate(e.target.value)}
              aria-label="Certificate template"
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold"
            >
              {props.templates.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={orientation}
              onChange={(e) => {
                const next = e.target.value as "landscape" | "portrait";
                setOrientation(next);
                setZoom(next === "landscape" ? 0.64 : 0.72);
              }}
              aria-label="Certificate orientation"
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="landscape">A4 Landscape</option>
              <option value="portrait">A4 Portrait</option>
            </select>
            <span className="rounded bg-[var(--fcs-surface-muted)] px-2.5 py-1 font-mono text-[11px]">
              {certificateCode}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {props.isAuthenticated ? "Save" : "Save Draft"}
            </button>
            {props.isAuthenticated && certId && (
              <button
                type="button"
                onClick={handleSubmitForVerification}
                disabled={submittingVerify || verificationStatus === "verified"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600/40 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {verificationStatus === "verified"
                  ? "Officially Verified"
                  : verificationStatus === "pending_approval"
                    ? "Pending Review"
                    : "Request Official Verification"}
              </button>
            )}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> PNG
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] px-3 py-1.5 text-xs font-semibold"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>
      </div>

      {(statusMsg || errorMsg) && (
        <div className="no-print mx-auto mt-3 max-w-[1550px] px-4 sm:px-6">
          {statusMsg && (
            <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto grid max-w-[1550px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* LEFT EDITOR PANEL */}
        <div className="no-print space-y-4 lg:col-span-4">
          <div className="flex rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1 text-xs font-semibold">
            {[
              { id: "details", label: "Details" },
              { id: "design", label: "Design & Layers" },
              { id: "stamps", label: "Stamps & Seals" },
              { id: "ai", label: "AI Review" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as never)}
                className={`flex-1 rounded-lg py-2 transition ${
                  activeTab === tab.id
                    ? "bg-teal-700 text-white"
                    : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "details" && (
            <div className="space-y-3 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold">Certificate Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Course / Achievement Name</label>
                <input
                  type="text"
                  value={courseOrAchievement}
                  onChange={(e) => setCourseOrAchievement(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Issuing Organization</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>
              {props.approvedIssuers.length > 0 ? (
                <div>
                  <label className="mb-1 block font-semibold">
                    Link Approved Authorized Issuer (Optional)
                  </label>
                  <select
                    value={selectedIssuerId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedIssuerId(nextId);
                      const matched = props.approvedIssuers.find((i) => i.id === nextId);
                      if (matched) setOrganizationName(matched.organization_name);
                    }}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                  >
                    <option value="">Personal / Self-Created Draft</option>
                    {props.approvedIssuers.map((iss) => (
                      <option key={iss.id} value={iss.id}>
                        {iss.organization_name} (Approved Issuer)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                  Want official Verified QR status?{" "}
                  <Link href="/verify" className="font-semibold text-teal-700 hover:underline dark:text-teal-400">
                    Register your organization →
                  </Link>
                </p>
              )}
              <div>
                <label className="mb-1 block font-semibold">Description / Citation</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold">Authorized Signatory</label>
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={certificateCode}
                  onChange={(e) => setCertificateCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setCertificateCode(generateCertificateCode())}
                  className="rounded-lg border border-[var(--fcs-border)] px-3 py-2 font-semibold"
                >
                  Regenerate ID
                </button>
              </div>
            </div>
          )}

          {activeTab === "design" && (
            <div className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold">Display Font</label>
                  <select
                    value={style.fontDisplay}
                    onChange={(e) => setStyle({ ...style, fontDisplay: e.target.value })}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                  >
                    {["Cormorant Garamond", "Playfair Display", "Cinzel", "Space Grotesk", "IBM Plex Sans"].map(
                      (f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Body Font</label>
                  <select
                    value={style.fontBody}
                    onChange={(e) => setStyle({ ...style, fontBody: e.target.value })}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                  >
                    {["Plus Jakarta Sans", "Inter", "DM Sans", "IBM Plex Sans", "Source Serif 4"].map(
                      (f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-semibold">Background</label>
                  <input
                    type="color"
                    value={style.backgroundColor}
                    onChange={(e) => setStyle({ ...style, backgroundColor: e.target.value })}
                    className="h-8 w-full cursor-pointer rounded border border-[var(--fcs-border)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Ink Primary</label>
                  <input
                    type="color"
                    value={style.primaryColor}
                    onChange={(e) => setStyle({ ...style, primaryColor: e.target.value })}
                    className="h-8 w-full cursor-pointer rounded border border-[var(--fcs-border)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Accent / Border</label>
                  <input
                    type="color"
                    value={style.accentColor}
                    onChange={(e) => setStyle({ ...style, accentColor: e.target.value })}
                    className="h-8 w-full cursor-pointer rounded border border-[var(--fcs-border)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold">Border Style</label>
                  <select
                    value={style.borderStyle}
                    onChange={(e) =>
                      setStyle({
                        ...style,
                        borderStyle: e.target.value as CertificateStyleConfig["borderStyle"],
                      })
                    }
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1.5"
                  >
                    <option value="double-gold">Double Gold Classic</option>
                    <option value="architectural">Architectural</option>
                    <option value="filigree">Filigree</option>
                    <option value="modern-frame">Modern Frame</option>
                    <option value="prestige-navy">Prestige Navy</option>
                    <option value="editorial-warm">Editorial Warm</option>
                    <option value="clean-grid">Clean Grid</option>
                    <option value="board-crest">Board Crest</option>
                    <option value="academic-crest">Academic Crest</option>
                    <option value="none">Borderless</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={style.showQrCode}
                      onChange={(e) => setStyle({ ...style, showQrCode: e.target.checked })}
                      className="accent-teal-700"
                    />
                    Show QR Code
                  </label>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={style.showBorder}
                      onChange={(e) => setStyle({ ...style, showBorder: e.target.checked })}
                      className="accent-teal-700"
                    />
                    Show Border Frame
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-[var(--fcs-border)] pt-3">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 text-[11px] font-semibold hover:border-teal-600/50"
                >
                  <Camera className="h-4 w-4 text-teal-600" />
                  Recipient Photo
                </button>
                <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 text-[11px] font-semibold hover:border-teal-600/50">
                  <ImagePlus className="h-4 w-4 text-teal-600" />
                  Org Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) addCanvasAssetUpload(f, "logo");
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={addCustomTextBlock}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 text-[11px] font-semibold hover:border-teal-600/50"
                >
                  <Type className="h-4 w-4 text-teal-600" />
                  Add Text
                </button>
              </div>

              {/* Selected Element Inspector */}
              {selectedElement && (
                <div className="space-y-2.5 rounded-xl border border-teal-600/30 bg-[var(--fcs-surface-muted)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Layer: {selectedElement.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedElement({ zIndex: (selectedElement.zIndex || 1) + 1 })
                        }
                        title="Bring forward"
                        className="rounded p-1 hover:bg-[var(--fcs-surface)]"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedElement({
                            zIndex: Math.max(0, (selectedElement.zIndex || 1) - 1),
                          })
                        }
                        title="Send backward"
                        className="rounded p-1 hover:bg-[var(--fcs-surface)]"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setElements((prev) => prev.filter((x) => x.id !== selectedElement.id));
                          setSelectedElementId(null);
                        }}
                        title="Delete layer"
                        className="rounded p-1 text-red-600 hover:bg-[var(--fcs-surface)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {selectedElement.type === "text_block" && (
                    <input
                      type="text"
                      value={selectedElement.text || ""}
                      onChange={(e) => updateSelectedElement({ text: e.target.value })}
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span>Width ({selectedElement.width}px)</span>
                      <input
                        type="range"
                        min={40}
                        max={360}
                        value={selectedElement.width}
                        onChange={(e) =>
                          updateSelectedElement({
                            width: Number(e.target.value),
                            height:
                              selectedElement.shape === "circle"
                                ? Number(e.target.value)
                                : selectedElement.height,
                          })
                        }
                        className="w-full accent-teal-700"
                      />
                    </div>
                    <div>
                      <span>Rotation ({selectedElement.rotation}°)</span>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={selectedElement.rotation}
                        onChange={(e) =>
                          updateSelectedElement({ rotation: Number(e.target.value) })
                        }
                        className="w-full accent-teal-700"
                      />
                    </div>
                  </div>

                  <div>
                    <span>Opacity ({Math.round((selectedElement.opacity ?? 1) * 100)}%)</span>
                    <input
                      type="range"
                      min={0.15}
                      max={1}
                      step={0.05}
                      value={selectedElement.opacity ?? 1}
                      onChange={(e) => updateSelectedElement({ opacity: Number(e.target.value) })}
                      className="w-full accent-teal-700"
                    />
                  </div>
                </div>
              )}

              {/* Layer List */}
              {elements.length > 0 && (
                <div>
                  <p className="mb-1.5 font-semibold text-[var(--fcs-ink-muted)]">
                    Canvas Layers ({elements.length})
                  </p>
                  <ul className="space-y-1">
                    {elements.map((el) => (
                      <li key={el.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedElementId(el.id)}
                          className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left ${
                            selectedElementId === el.id
                              ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/40"
                              : "border-[var(--fcs-border)]"
                          }`}
                        >
                          <span className="truncate font-medium">{el.label}</span>
                          {el.isSampleDecorative && (
                            <span className="ml-2 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase">
                              Sample Only
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "stamps" && (
            <div className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
              <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Authorization Integrity Policy
                </p>
                <p className="mt-1">
                  Decorative sample stamps are marked <strong>PREVIEW ONLY</strong>. Never upload or
                  fabricate seals or signatures belonging to organizations you are not authorized to
                  represent.
                </p>
              </div>

              <div>
                <p className="mb-2 font-bold">Decorative Sample Stamps (Preview Only)</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => addSampleDecorativeStamp("gold_seal_sample")}
                    className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 font-medium hover:border-amber-600/50"
                  >
                    <span>Gold Embossed Sample Seal</span>
                    <span className="text-[10px] uppercase text-amber-700">Decorative</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addSampleDecorativeStamp("round_sample")}
                    className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 font-medium hover:border-blue-600/50"
                  >
                    <span>Blue Circular Sample Stamp</span>
                    <span className="text-[10px] uppercase text-blue-700">Decorative</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addSampleDecorativeStamp("rect_draft_stamp")}
                    className="flex items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 font-medium hover:border-red-600/50"
                  >
                    <span>Red Rectangular Draft Stamp</span>
                    <span className="text-[10px] uppercase text-red-700">Decorative</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 border-t border-[var(--fcs-border)] pt-3">
                <p className="font-bold">Upload Genuine Organizational Stamp, Seal or Signature</p>
                <label className="flex items-start gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={authorizedConfirm}
                    onChange={(e) => setAuthorizedConfirm(e.target.checked)}
                    className="mt-0.5 accent-teal-700"
                  />
                  <span>
                    I confirm I am authorized by the issuing organization to upload and apply its
                    official stamp, seal, or signature (transparent PNG supported).
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 font-semibold hover:border-teal-600/50">
                    <Stamp className="h-3.5 w-3.5 text-blue-600" />
                    Blue Ink Stamp
                    <input
                      type="file"
                      accept="image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) addCanvasAssetUpload(f, "stamp", "blue_ink");
                      }}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 font-semibold hover:border-teal-600/50">
                    <Stamp className="h-3.5 w-3.5 text-red-600" />
                    Red Ink Stamp
                    <input
                      type="file"
                      accept="image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) addCanvasAssetUpload(f, "stamp", "red_ink");
                      }}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 font-semibold hover:border-teal-600/50">
                    <Upload className="h-3.5 w-3.5 text-amber-600" />
                    Gold Seal PNG
                    <input
                      type="file"
                      accept="image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) addCanvasAssetUpload(f, "seal", "gold_embossed");
                      }}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 font-semibold hover:border-teal-600/50">
                    <Upload className="h-3.5 w-3.5 text-teal-600" />
                    Signature PNG
                    <input
                      type="file"
                      accept="image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) addCanvasAssetUpload(f, "signature", "default");
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 text-xs">
              <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3">
                <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                  Certificate Layout & Readability Score
                </p>
                <p className="mt-1 text-2xl font-bold text-teal-700 dark:text-teal-400">
                  {designReview.readabilityScore}/100
                </p>
              </div>

              {[
                { title: "Alignment & Proportions", items: designReview.alignmentNotes },
                { title: "Font Recommendations", items: designReview.fontRecommendations },
                { title: "Color Contrast", items: designReview.colorRecommendations },
                { title: "Wording Suggestions", items: designReview.wordingSuggestions },
                { title: "Seal & Stamp Notes", items: designReview.sealPlacementNotes },
              ]
                .filter((g) => g.items.length > 0)
                .map((grp) => (
                  <div key={grp.title}>
                    <p className="font-bold">{grp.title}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-[var(--fcs-ink-muted)]">
                      {grp.items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}

              <button
                type="button"
                disabled={aiLoading}
                onClick={runAiCertificateAssist}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Ask FRANCIS AI for Wording & Design Advice
              </button>

              {aiAdvice && (
                <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 whitespace-pre-wrap text-[11px] leading-relaxed">
                  {aiAdvice}
                </div>
              )}

              <div className="border-t border-[var(--fcs-border)] pt-3">
                <Link
                  href={`/verify/${certificateCode}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline dark:text-teal-400"
                >
                  <QrCode className="h-3.5 w-3.5" /> Open Public Verification Page →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT LIVE INTERACTIVE CANVAS */}
        <div className="lg:col-span-8">
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--fcs-ink-muted)]">
                Drag stamps, logos & photos directly on canvas
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-0.5 text-[11px] font-medium">
                {verificationStatus === "verified" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-teal-600" /> Verified
                  </>
                ) : (
                  verificationStatus.replace(/_/g, " ")
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[0.5, 0.64, 0.72, 0.85].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                    zoom === z
                      ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                      : "border-[var(--fcs-border)]"
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--fcs-border)] bg-slate-200/70 p-4 dark:bg-slate-900/60">
            <div
              className="origin-top-left transition-transform"
              style={{
                transform: `scale(${zoom})`,
                width: `${baseW * zoom}px`,
                height: `${baseH * zoom}px`,
              }}
            >
              <CertificateCanvas
                ref={canvasRef}
                certificateCode={certificateCode}
                title={title}
                recipientName={recipientName}
                courseOrAchievement={courseOrAchievement}
                organizationName={organizationName}
                description={description}
                issueDate={issueDate}
                expiryDate={expiryDate}
                signatoryName={signatoryName}
                signatoryDesignation={signatoryDesignation}
                orientation={orientation}
                elements={elements}
                style={style}
                selectedElementId={selectedElementId}
                interactive={true}
                onSelectElement={setSelectedElementId}
                onUpdateElementPosition={(id, x, y) =>
                  setElements((prev) =>
                    prev.map((el) => (el.id === id ? { ...el, x, y } : el))
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      <PhotoEditorModal
        open={photoModalOpen}
        initialShape="circle"
        onClose={() => setPhotoModalOpen(false)}
        onApply={handleApplyRecipientPhoto}
        title="Certificate Recipient Photo Editor"
      />
    </div>
  );
}
