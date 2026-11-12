"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useRouter } from "next/navigation";
import {
  analyzeCertificateDesign,
  buildSampleStampSvg,
  createDefaultOfficialStampConfig,
  generateCertificateCode,
  STAMP_FINISH_OPTIONS,
  STAMP_PRESETS,
  type CertificateAiDesignPatch,
  type CertificateCanvasElement,
  type CertificateStyleConfig,
  type OfficialStampConfig,
  type OrganizationStampRecord,
  type StampLibraryRecord,
} from "@francis/shared";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileDown,
  FileSpreadsheet,
  FolderPlus,
  Grid,
  History,
  ImagePlus,
  Loader2,
  Lock,
  Magnet,
  PenTool,
  Printer,
  QrCode,
  Redo2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Stamp,
  Trash2,
  Type,
  Unlock,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CertificateCanvas } from "./CertificateCanvas";
import { OrganizationStampStudio } from "./OrganizationStampStudio";
import { SignatureDrawerModal, type CreatedSignaturePayload } from "./SignatureDrawerModal";
import { PhotoEditorModal, type EditedPhotoResult } from "../studio/PhotoEditorModal";
import {
  exportElementToJpeg,
  exportElementToPdf,
  exportElementToPng,
} from "@/lib/exportHelpers";

interface CertTemplateOption {
  id: string;
  slug: string;
  name: string;
  category: string;
  orientation: "landscape" | "portrait";
  layout_config: Record<string, unknown>;
}

interface StudioSnapshot {
  title: string;
  recipientName: string;
  courseOrAchievement: string;
  organizationName: string;
  description: string;
  orientation: "landscape" | "portrait";
  elements: CertificateCanvasElement[];
  style: CertificateStyleConfig;
}

interface RevisionItem {
  id: string;
  version_number: number;
  note: string | null;
  created_at: string;
  snapshot: Record<string, unknown>;
}

interface CertificateStudioProps {
  initialCertId: string | null;
  initialProjectId?: string | null;
  initialIssuerId?: string;
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
  initialTab?: "details" | "design" | "stamps" | "ai";
  templates: CertTemplateOption[];
  approvedIssuers: Array<{ id: string; organization_name: string }>;
  organizationApplications?: Array<{
    id: string;
    organization_name: string;
    verification_status: string;
    notes: string | null;
  }>;
  initialOrganizationStamps?: OrganizationStampRecord[];
  initialSampleStamps?: StampLibraryRecord[];
  isAuthenticated: boolean;
}

const CANVAS_PRESETS = [
  { id: "a4_landscape", label: "A4 Landscape (1123×794)", w: 1123, h: 794, orient: "landscape" as const },
  { id: "a4_portrait", label: "A4 Portrait (794×1123)", w: 794, h: 1123, orient: "portrait" as const },
  { id: "letter_landscape", label: "US Letter Landscape (1056×816)", w: 1056, h: 816, orient: "landscape" as const },
  { id: "letter_portrait", label: "US Letter Portrait (816×1056)", w: 816, h: 1056, orient: "portrait" as const },
  { id: "square_social", label: "Square Social (1080×1080)", w: 1080, h: 1080, orient: "landscape" as const },
  { id: "hd_widescreen", label: "Widescreen 16:9 (1280×720)", w: 1280, h: 720, orient: "landscape" as const },
];

const AI_QUICK_PROMPTS = [
  "Luxury gold and obsidian executive certificate",
  "Corporate royal navy blue prestige style",
  "Modern minimalist teal tech startup design",
  "Academic crimson university honors layout",
  "Festive emerald & gold award design",
];

export function CertificateStudio(props: CertificateStudioProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [certId, setCertId] = useState<string | null>(props.initialCertId);
  const [projectId, setProjectId] = useState<string | null>(props.initialProjectId ?? null);
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
  const [selectedIssuerId, setSelectedIssuerId] = useState<string>(props.initialIssuerId || "");

  const hasApprovedIssuer = props.approvedIssuers.length > 0;
  const pendingApplications = (props.organizationApplications ?? []).filter(
    (app) => app.verification_status === "pending"
  );
  const blockedApplications = (props.organizationApplications ?? []).filter(
    (app) => app.verification_status !== "approved" && app.verification_status !== "pending"
  );

  const [activeTab, setActiveTab] = useState<"details" | "design" | "stamps" | "ai">(
    props.initialTab || "details"
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    props.initialElements[0]?.id ?? null
  );
  const [authorizedConfirm, setAuthorizedConfirm] = useState(hasApprovedIssuer);
  const [orgStamps, setOrgStamps] = useState<OrganizationStampRecord[]>(
    props.initialOrganizationStamps ?? []
  );
  const [sampleStamps, setSampleStamps] = useState<StampLibraryRecord[]>(
    props.initialSampleStamps ?? []
  );
  const [sampleStampConfig, setSampleStampConfig] = useState<OfficialStampConfig>(() => ({
    ...createDefaultOfficialStampConfig(props.initialOrganization || "Sample Studio"),
    centerTitle: "SAMPLE",
    bottomText: "SAMPLE DESIGN ONLY",
  }));

  const [zoom, setZoom] = useState(orientation === "landscape" ? 0.64 : 0.72);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Undo / Redo History
  const [undoStack, setUndoStack] = useState<StudioSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<StudioSnapshot[]>([]);

  // Revisions & AI Design Prompt
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const snapshotCurrent = useCallback(
    (): StudioSnapshot => ({
      title,
      recipientName,
      courseOrAchievement,
      organizationName,
      description,
      orientation,
      elements: JSON.parse(JSON.stringify(elements)) as CertificateCanvasElement[],
      style: JSON.parse(JSON.stringify(style)) as CertificateStyleConfig,
    }),
    [title, recipientName, courseOrAchievement, organizationName, description, orientation, elements, style]
  );

  const pushUndoSnapshot = useCallback(() => {
    const snap = snapshotCurrent();
    setUndoStack((prev) => [...prev.slice(-24), snap]);
    setRedoStack([]);
  }, [snapshotCurrent]);

  const applySnapshot = useCallback((snap: StudioSnapshot) => {
    setTitle(snap.title);
    setRecipientName(snap.recipientName);
    setCourseOrAchievement(snap.courseOrAchievement);
    setOrganizationName(snap.organizationName);
    setDescription(snap.description);
    setOrientation(snap.orientation);
    setElements(snap.elements);
    setStyle(snap.style);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    const current = snapshotCurrent();
    setRedoStack((prev) => [...prev.slice(-24), current]);
    setUndoStack((prev) => prev.slice(0, -1));
    applySnapshot(last);
    setStatusMsg("Undid last design change.");
  }, [undoStack, snapshotCurrent, applySnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = snapshotCurrent();
    setUndoStack((prev) => [...prev.slice(-24), current]);
    setRedoStack((prev) => prev.slice(0, -1));
    applySnapshot(next);
    setStatusMsg("Redid design change.");
  }, [redoStack, snapshotCurrent, applySnapshot]);

  // Load revisions when certId exists
  const loadRevisions = useCallback(async (id: string) => {
    setRevisionsLoading(true);
    try {
      const res = await fetch(`/api/certificates/revisions?certificateId=${encodeURIComponent(id)}`);
      const json = (await res.json()) as { revisions?: RevisionItem[] };
      if (res.ok && json.revisions) {
        setRevisions(json.revisions);
      }
    } catch {
      // ignore non-critical revision load error
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (certId && props.isAuthenticated) {
      loadRevisions(certId);
    }
  }, [certId, props.isAuthenticated, loadRevisions]);

  // Load saved sample stamps if authenticated
  useEffect(() => {
    if (!props.isAuthenticated || sampleStamps.length > 0) return;
    fetch("/api/stamps/library")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stamps?: StampLibraryRecord[] } | null) => {
        if (d?.stamps) setSampleStamps(d.stamps);
      })
      .catch(() => {});
  }, [props.isAuthenticated, sampleStamps.length]);

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

  const sampleStampPreview = useMemo(
    () => buildSampleStampSvg(sampleStampConfig, "studio-sample"),
    [sampleStampConfig]
  );

  const applyTemplate = (slug: string) => {
    pushUndoSnapshot();
    setTemplateSlug(slug);
    const tpl = props.templates.find((t) => t.slug === slug);
    if (!tpl) return;
    setOrientation(tpl.orientation);
    setZoom(tpl.orientation === "landscape" ? 0.64 : 0.72);
    const cfg = tpl.layout_config as Record<string, string>;
    setStyle((prev) => ({
      ...prev,
      canvasWidth: tpl.orientation === "landscape" ? 1123 : 794,
      canvasHeight: tpl.orientation === "landscape" ? 794 : 1123,
      backgroundColor: cfg.background || prev.backgroundColor,
      primaryColor: cfg.primaryColor || prev.primaryColor,
      accentColor: cfg.accentColor || prev.accentColor,
      fontDisplay: cfg.fontDisplay || prev.fontDisplay,
      fontBody: cfg.fontBody || prev.fontBody,
      borderStyle: (cfg.borderStyle as CertificateStyleConfig["borderStyle"]) || prev.borderStyle,
    }));
    if (cfg.titleDefault) setTitle(cfg.titleDefault);
  };

  const deleteCanvasElement = useCallback(
    (id: string) => {
      pushUndoSnapshot();
      setElements((prev) => prev.filter((el) => el.id !== id));
      setSelectedElementId((prev) => (prev === id ? null : prev));
      setStatusMsg("Removed element from certificate canvas.");
    },
    [pushUndoSnapshot]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !inInput) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (!selectedElementId || inInput) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteCanvasElement(selectedElementId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedElementId, deleteCanvasElement, handleUndo, handleRedo]);

  const handleSaveProject = async () => {
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
      setStatusMsg("Saved locally in browser! Sign in anytime to sync across devices.");
      return;
    }

    setSavingProject(true);
    try {
      const res = await fetch("/api/design-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId || undefined,
          certificate_id: certId || null,
          title: `${title || "Certificate"} — ${recipientName || "Draft"}`,
          template_slug: templateSlug,
          orientation,
          canvas_width: style.canvasWidth || (orientation === "landscape" ? 1123 : 794),
          canvas_height: style.canvasHeight || (orientation === "landscape" ? 794 : 1123),
          fields_json: {
            certificateCode,
            title,
            recipientName,
            courseOrAchievement,
            organizationName,
            description,
            issueDate,
            expiryDate,
            signatoryName,
            signatoryDesignation,
          },
          canvas_elements: elements,
          style_config: style,
          status: "in_progress",
        }),
      });
      const json = (await res.json()) as { project?: { id: string }; error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Could not save design project.");
        return;
      }
      if (json.project?.id) setProjectId(json.project.id);
      setStatusMsg("Personal Design Project saved to your Studio Workspace!");
    } finally {
      setSavingProject(false);
    }
  };

  const handleSaveRevision = async () => {
    if (!certId || !props.isAuthenticated) return;
    setErrorMsg(null);
    try {
      const res = await fetch("/api/certificates/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificateId: certId,
          note: `Snapshot ${new Date().toLocaleTimeString()}`,
          snapshot: {
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
          },
        }),
      });
      const json = (await res.json()) as { revision?: RevisionItem; error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Failed saving revision snapshot.");
        return;
      }
      if (json.revision) {
        setRevisions((prev) => [json.revision!, ...prev]);
      }
      setStatusMsg("Revision snapshot saved cleanly.");
    } catch {
      setErrorMsg("Network error saving revision.");
    }
  };

  const saveCertificate = async (publishAsVerified: boolean) => {
    setErrorMsg(null);
    setStatusMsg(null);
    if (!props.isAuthenticated || !hasApprovedIssuer) {
      await handleSaveProject();
      return;
    }

    const effectiveIssuerId = selectedIssuerId || props.approvedIssuers[0]?.id || "";
    const approvedIssuer = props.approvedIssuers.find((i) => i.id === effectiveIssuerId) ?? null;

    if (!approvedIssuer) {
      setErrorMsg("An Admin-approved Authorized Organization is required to publish official certificates.");
      return;
    }

    if (publishAsVerified) setSubmittingVerify(true);
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!selectedIssuerId) setSelectedIssuerId(approvedIssuer.id);

      const payload = {
        user_id: user.id,
        template_slug: templateSlug,
        issuer_id: approvedIssuer.id,
        certificate_code: certificateCode,
        title: title.trim() || "Certificate",
        recipient_name: recipientName.trim() || "Recipient",
        course_or_achievement: courseOrAchievement.trim() || "Achievement",
        organization_name: organizationName.trim() || approvedIssuer.organization_name,
        description: description.trim() || null,
        issue_date: issueDate,
        expiry_date: expiryDate || null,
        signatory_name: signatoryName.trim() || null,
        signatory_designation: signatoryDesignation.trim() || null,
        orientation,
        canvas_elements: elements,
        style_config: style,
        authorization_type: "authorized_issuer",
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

      const shouldVerify = publishAsVerified || verificationStatus === "verified";

      if (savedCertId && shouldVerify) {
        const res = await fetch("/api/certificates/submit-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            certificateId: savedCertId,
            issuerId: approvedIssuer.id,
          }),
        });
        const json = (await res.json()) as {
          verificationStatus?: string;
          error?: string;
        };
        if (!res.ok) {
          setErrorMsg(json.error || "Saved certificate, but verification publish failed.");
          return;
        }
        setVerificationStatus(json.verificationStatus || "verified");
        setStatusMsg(
          `Published as Officially Verified Certificate (${certificateCode}) under ${approvedIssuer.organization_name}.`
        );
      } else if (savedCertId) {
        await supabase.from("fcs_certificate_verifications").upsert(
          {
            certificate_id: savedCertId,
            certificate_code: certificateCode,
            issuer_id: approvedIssuer.id,
            recipient_name: payload.recipient_name,
            certificate_title: payload.title,
            course_or_achievement: payload.course_or_achievement,
            issuing_organization: payload.organization_name,
            issue_date: payload.issue_date,
            expiry_date: payload.expiry_date,
            verification_status: "unverified_draft",
          },
          { onConflict: "certificate_id" }
        );
        setStatusMsg("Draft saved. Click 'Publish Verified Certificate' when ready to verify publicly.");
      }

      if (!certId && savedCertId) {
        router.replace(`/certificate-builder/${savedCertId}`);
      }
    } finally {
      setSaving(false);
      setSubmittingVerify(false);
    }
  };

  const handleRevokeCertificate = async () => {
    if (!certId || !hasApprovedIssuer) return;
    setRevoking(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/certificates/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificateId: certId,
          reason: "Revoked by authorized issuer from Certificate Studio",
        }),
      });
      const json = (await res.json()) as { verificationStatus?: string; error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Could not revoke certificate.");
        return;
      }
      setVerificationStatus(json.verificationStatus || "revoked");
      setStatusMsg(`Certificate ${certificateCode} has been revoked on the public verification registry.`);
    } finally {
      setRevoking(false);
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

    if ((type === "stamp" || type === "seal") && !hasApprovedIssuer) {
      setErrorMsg(
        "Official organizational stamps require an Admin-approved Authorized Organization. Use the Sample Stamp Designer below for sample/personal designs."
      );
      return;
    }

    setErrorMsg(null);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

    pushUndoSnapshot();
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
    setStatusMsg(`${type.toUpperCase()} added — drag on canvas or resize corner handle.`);
  };

  const handleUploadCustomBackground = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Background must be PNG, JPG, or WEBP.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    pushUndoSnapshot();
    setStyle((prev) => ({
      ...prev,
      backgroundImageUrl: dataUrl,
      backgroundOpacity: prev.backgroundOpacity ?? 0.25,
      backgroundFit: prev.backgroundFit ?? "cover",
    }));
    setStatusMsg("Custom canvas background applied!");
  };

  const handleApplyRecipientPhoto = async (res: EditedPhotoResult) => {
    pushUndoSnapshot();
    const isId = res.shape === "id_card";
    const newEl: CertificateCanvasElement = {
      id: `photo-${Date.now()}`,
      type: "recipient_photo",
      label: "Recipient Photo",
      src: res.dataUrl,
      x: 8,
      y: 26,
      width: 120,
      height: isId ? 160 : 120,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      shape: res.shape,
      inkStyle: "default",
      borderWidth: res.borderWidth,
      borderColor: res.borderColor,
      shadow: res.shadow,
      brightness: res.brightness,
      contrast: res.contrast,
      saturation: res.saturation,
      isSampleDecorative: false,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
    setStatusMsg("Recipient photo placed — drag or resize on canvas.");
  };

  const handleApplySignature = async (res: CreatedSignaturePayload) => {
    pushUndoSnapshot();
    const newEl: CertificateCanvasElement = {
      id: `sig-${Date.now()}`,
      type: "signature",
      label: res.signatoryName || "Signature",
      src: res.dataUrl,
      x: 38,
      y: 72,
      width: 170,
      height: 76,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      shape: "rectangle",
      inkStyle: "default",
      signatoryName: res.signatoryName,
      signatoryDesignation: res.signatoryDesignation,
      isSampleDecorative: false,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);

    if (res.saveToLibrary && props.isAuthenticated) {
      fetch("/api/stamps/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "signature",
          signatoryName: res.signatoryName,
          signatoryDesignation: res.signatoryDesignation,
          stylePreset: res.stylePreset,
          dataUrl: res.dataUrl,
        }),
      }).catch(() => {});
    }
    setStatusMsg("Signature placed on canvas! Drag anywhere to align.");
  };

  const addSampleStampToCanvas = async (saveToLibrary = false) => {
    pushUndoSnapshot();
    const built = buildSampleStampSvg(sampleStampConfig, `${Date.now()}`);
    const newEl: CertificateCanvasElement = {
      id: `sample-stamp-${Date.now()}`,
      type: built.stampKind,
      label: `${sampleStampConfig.organizationName || "Sample"} (Sample)`,
      src: built.dataUrl,
      x: 74,
      y: 65,
      width: built.width,
      height: built.height,
      rotation: 0,
      opacity: sampleStampConfig.opacity ?? 0.92,
      zIndex: elements.length + 1,
      shape: built.shape,
      inkStyle: built.inkStyle,
      isSampleDecorative: true,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);

    if (saveToLibrary && props.isAuthenticated) {
      try {
        const res = await fetch("/api/stamps/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "stamp",
            name: `${sampleStampConfig.organizationName || "Sample"} Stamp`,
            stampCategory: "sample",
            config: sampleStampConfig,
          }),
        });
        const json = (await res.json()) as { stamp?: StampLibraryRecord };
        if (json.stamp) setSampleStamps((prev) => [json.stamp!, ...prev]);
      } catch {
        // non-blocking
      }
    }
    setStatusMsg("Sample Design Stamp placed (marked SAMPLE / NON-VERIFIED).");
  };

  const addCustomTextBlock = () => {
    pushUndoSnapshot();
    const newEl: CertificateCanvasElement = {
      id: `txt-${Date.now()}`,
      type: "text_block",
      label: "Custom Text",
      text: "With Distinction • Cohort 2026",
      x: 40,
      y: 86,
      width: 240,
      height: 44,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      fontSize: 15,
      fontWeight: "semibold",
      color: style.primaryColor,
      align: "center",
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const duplicateSelectedElement = () => {
    if (!selectedElement) return;
    pushUndoSnapshot();
    const clone: CertificateCanvasElement = {
      ...JSON.parse(JSON.stringify(selectedElement)),
      id: `${selectedElement.type}-${Date.now()}`,
      label: `${selectedElement.label} (Copy)`,
      x: Math.min(90, selectedElement.x + 3),
      y: Math.min(90, selectedElement.y + 3),
      zIndex: elements.length + 1,
      locked: false,
    };
    setElements((prev) => [...prev, clone]);
    setSelectedElementId(clone.id);
    setStatusMsg("Layer duplicated.");
  };

  const updateSelectedElement = (patch: Partial<CertificateCanvasElement>) => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...patch } : el))
    );
  };

  const handleExport = async (mode: "pdf" | "png" | "png_2k" | "png_4k" | "jpeg") => {
    if (!canvasRef.current) return;
    setExporting(mode);
    setExportMenuOpen(false);
    try {
      const slug = `${certificateCode}_${recipientName.replace(/[^a-z0-9-_]+/gi, "_") || "Certificate"}`;
      const baseDims = {
        width: Number(style.canvasWidth) || (orientation === "landscape" ? 1123 : 794),
        height: Number(style.canvasHeight) || (orientation === "landscape" ? 794 : 1123),
      };
      if (mode === "pdf") {
        await exportElementToPdf(canvasRef.current, `${slug}.pdf`, orientation, {
          documentType: "certificate",
          documentId: certId || undefined,
          dimensionsPx: baseDims,
        });
      } else if (mode === "png") {
        await exportElementToPng(canvasRef.current, `${slug}.png`, {
          documentType: "certificate",
          documentId: certId || undefined,
          resolution: "standard",
        });
      } else if (mode === "png_2k") {
        await exportElementToPng(canvasRef.current, `${slug}_2K.png`, {
          documentType: "certificate",
          documentId: certId || undefined,
          resolution: "2k",
        });
      } else if (mode === "png_4k") {
        await exportElementToPng(canvasRef.current, `${slug}_4K.png`, {
          documentType: "certificate",
          documentId: certId || undefined,
          resolution: "4k",
        });
      } else if (mode === "jpeg") {
        await exportElementToJpeg(canvasRef.current, `${slug}.jpg`, {
          documentType: "certificate",
          documentId: certId || undefined,
          backgroundColor: style.backgroundColor,
          resolution: "2k",
        });
      }
      setStatusMsg(`Exported ${mode.toUpperCase().replace("_", " ")} cleanly!`);
    } finally {
      setExporting(null);
    }
  };

  const runAiDesignPrompt = async (promptInput?: string) => {
    const prompt = (promptInput ?? aiPrompt).trim();
    if (!prompt) return;
    setAiPromptLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai/certificate-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          currentDesign: {
            title,
            recipientName,
            courseOrAchievement,
            organizationName,
            titleFontSize: style.titleFontSize,
          },
        }),
      });
      const json = (await res.json()) as {
        patch?: CertificateAiDesignPatch;
        summary?: string;
        error?: string;
      };
      if (!res.ok || !json.patch) {
        setErrorMsg(json.error || "AI design helper could not apply prompt.");
        return;
      }
      pushUndoSnapshot();
      const { stylePatch, fields, orientation: patchOrientation, summary } = json.patch;
      if (stylePatch) {
        setStyle((prev) => ({ ...prev, ...stylePatch }));
      }
      if (patchOrientation) {
        setOrientation(patchOrientation);
        setStyle((prev) => ({
          ...prev,
          canvasWidth: patchOrientation === "landscape" ? 1123 : 794,
          canvasHeight: patchOrientation === "landscape" ? 794 : 1123,
        }));
      }
      if (fields?.title) setTitle(fields.title);
      if (fields?.description) setDescription(fields.description);
      setStatusMsg(`AI Design Applied: ${summary || json.summary || prompt}`);
      if (!promptInput) setAiPrompt("");
    } finally {
      setAiPromptLoading(false);
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

  const baseW = Number(style.canvasWidth) || (orientation === "landscape" ? 1123 : 794);
  const baseH = Number(style.canvasHeight) || (orientation === "landscape" ? 794 : 1123);
  const currentDimensionPresetId =
    CANVAS_PRESETS.find((p) => p.w === baseW && p.h === baseH)?.id ?? "custom";

  return (
    <div className="min-h-screen bg-[var(--fcs-bg)]">
      {/* Studio Toolbar */}
      <div className="no-print border-b border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SafeNavLink
              href="/certificate-builder"
              className="rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
            >
              ← Gallery
            </SafeNavLink>
            <select
              value={templateSlug}
              onChange={(e) => applyTemplate(e.target.value)}
              aria-label="Certificate template"
              className="max-w-[200px] rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs font-semibold"
            >
              {props.templates.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={currentDimensionPresetId}
              onChange={(e) => {
                const preset = CANVAS_PRESETS.find((p) => p.id === e.target.value);
                if (!preset) return;
                pushUndoSnapshot();
                setOrientation(preset.orient);
                setStyle((prev) => ({ ...prev, canvasWidth: preset.w, canvasHeight: preset.h }));
                setZoom(preset.w >= preset.h ? 0.64 : 0.72);
              }}
              aria-label="Canvas dimensions"
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5 text-xs font-medium"
            >
              {CANVAS_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              {currentDimensionPresetId === "custom" && (
                <option value="custom">
                  Custom ({baseW}×{baseH}px)
                </option>
              )}
            </select>

            <div className="flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                title="Undo (Ctrl+Z)"
                className="rounded p-1 hover:bg-[var(--fcs-surface)] disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo (Ctrl+Shift+Z)"
                className="rounded p-1 hover:bg-[var(--fcs-surface)] disabled:opacity-40"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowGrid((g) => !g)}
                title="Toggle Canvas Grid"
                className={`rounded p-1 ${showGrid ? "bg-teal-700 text-white" : "hover:bg-[var(--fcs-surface)]"}`}
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSnapToGuides((s) => !s)}
                title="Toggle Smart Snap Guides"
                className={`rounded p-1 ${snapToGuides ? "bg-teal-700 text-white" : "hover:bg-[var(--fcs-surface)]"}`}
              >
                <Magnet className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SafeNavLink
              href="/bulk-generator"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] px-2.5 py-1.5 text-xs font-semibold hover:border-teal-600/40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" /> Bulk Issue
            </SafeNavLink>

            <button
              type="button"
              onClick={handleSaveProject}
              disabled={savingProject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold hover:border-teal-600/40 disabled:opacity-60"
            >
              {savingProject ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5 text-teal-600" />
              )}
              Save Project
            </button>

            {props.isAuthenticated && hasApprovedIssuer && (
              <>
                <button
                  type="button"
                  onClick={() => saveCertificate(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5 text-xs font-semibold hover:border-teal-600/40 disabled:opacity-60"
                >
                  {saving && !submittingVerify ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {verificationStatus === "verified" ? "Save Changes" : "Save Official Draft"}
                </button>
                {verificationStatus === "verified" ? (
                  <SafeNavLink
                    href={`/verify/${certificateCode}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Registry ↗
                  </SafeNavLink>
                ) : (
                  <button
                    type="button"
                    onClick={() => saveCertificate(true)}
                    disabled={saving || submittingVerify}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-60"
                  >
                    {submittingVerify ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    Publish Verified
                  </button>
                )}
              </>
            )}

            {/* Multi-Format Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((o) => !o)}
                disabled={Boolean(exporting)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export ▾
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => handleExport("pdf")}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      <FileDown className="h-3.5 w-3.5 text-red-600" /> Print-Ready PDF
                    </span>
                    <span className="text-[10px] text-[var(--fcs-ink-muted)]">300 DPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("png_2k")}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5 text-teal-600" /> PNG 2K HD
                    </span>
                    <span className="text-[10px] text-[var(--fcs-ink-muted)]">2560px</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("png_4k")}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" /> PNG 4K Ultra-HD
                    </span>
                    <span className="text-[10px] text-[var(--fcs-ink-muted)]">3840px</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("jpeg")}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5 text-indigo-600" /> High-Res JPEG
                    </span>
                    <span className="text-[10px] text-[var(--fcs-ink-muted)]">96%</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      window.print();
                    }}
                    className="flex w-full items-center justify-between rounded-lg border-t border-[var(--fcs-border)] px-3 py-2 text-left text-xs font-medium hover:bg-[var(--fcs-surface-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      <Printer className="h-3.5 w-3.5" /> System Print
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Natural-Language Design Prompt Bar */}
        <div className="mx-auto mt-2.5 flex max-w-[1600px] flex-wrap items-center gap-2 border-t border-[var(--fcs-border)] pt-2.5">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-1.5">
            <Wand2 className="h-3.5 w-3.5 shrink-0 text-teal-600" />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runAiDesignPrompt();
                }
              }}
              placeholder="AI Design Studio: e.g. 'Make it luxury black and gold' or 'Corporate navy blue prestige'..."
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
          <button
            type="button"
            disabled={aiPromptLoading || !aiPrompt.trim()}
            onClick={() => runAiDesignPrompt()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {aiPromptLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Restyle
          </button>
          <div className="hidden items-center gap-1.5 xl:flex">
            {AI_QUICK_PROMPTS.slice(0, 3).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => runAiDesignPrompt(preset)}
                className="rounded-full border border-[var(--fcs-border)] px-2.5 py-1 text-[10px] font-medium text-[var(--fcs-ink-muted)] hover:border-teal-600/50 hover:text-[var(--fcs-ink)]"
              >
                {preset.split(" ").slice(0, 3).join(" ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(statusMsg || errorMsg) && (
        <div className="no-print mx-auto mt-3 max-w-[1600px] px-4 sm:px-6">
          {statusMsg && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              <span>{statusMsg}</span>
              {verificationStatus === "verified" && (
                <SafeNavLink
                  href={`/verify/${certificateCode}`}
                  target="_blank"
                  className="font-bold underline underline-offset-2"
                >
                  Open Verification Check (/verify/{certificateCode}) →
                </SafeNavLink>
              )}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* LEFT EDITOR PANEL */}
        <div className="no-print space-y-4 lg:col-span-4">
          <div className="flex rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1 text-xs font-semibold">
            {[
              { id: "details", label: "Details" },
              { id: "design", label: "Design & Layers" },
              { id: "stamps", label: "Stamps & Ink" },
              { id: "ai", label: "AI & History" },
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
                <label className="mb-1 block font-semibold">Issuing Organization / Studio Label</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                />
              </div>

              {hasApprovedIssuer ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="mb-1 block font-semibold">
                      Admin-Approved Authorized Organization
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
                      {props.approvedIssuers.map((iss) => (
                        <option key={iss.id} value={iss.id}>
                          {iss.organization_name} (Approved by Admin)
                        </option>
                      ))}
                    </select>
                  </div>

                  {verificationStatus === "verified" ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-50 p-2.5 text-[11px] text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Officially Verified Certificate
                      </span>
                      <div className="flex items-center gap-2">
                        <SafeNavLink
                          href={`/verify/${certificateCode}`}
                          target="_blank"
                          className="font-semibold underline"
                        >
                          Verify ↗
                        </SafeNavLink>
                        {certId && (
                          <button
                            type="button"
                            onClick={handleRevokeCertificate}
                            disabled={revoking}
                            className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700"
                          >
                            <Ban className="h-2.5 w-2.5" />
                            {revoking ? "Revoking..." : "Revoke"}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : verificationStatus === "revoked" ? (
                    <div className="rounded-lg border border-red-500/40 bg-red-50 p-2.5 text-[11px] font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300">
                      Status: Revoked on public registry.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-50 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      <span>Draft — publish so /verify shows Officially Verified.</span>
                      <button
                        type="button"
                        onClick={() => saveCertificate(true)}
                        disabled={saving || submittingVerify}
                        className="rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800"
                      >
                        Publish Verified
                      </button>
                    </div>
                  )}
                </div>
              ) : pendingApplications.length > 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Sample Design Mode (Organization Pending Approval)
                  </p>
                  <p className="mt-1">
                    Design & export freely! Official QR Verification unlocks once{" "}
                    <strong>{pendingApplications.map((a) => a.organization_name).join(", ")}</strong>{" "}
                    is approved by Admin.
                  </p>
                </div>
              ) : blockedApplications.length > 0 ? (
                <div className="rounded-xl border border-red-500/30 bg-red-50 p-3 text-[11px] text-red-800 dark:bg-red-950/40 dark:text-red-200">
                  <p className="font-bold">Official Issuance Restricted — Sample Mode Active</p>
                  <SafeNavLink href="/verify" className="mt-1 inline-block font-semibold underline">
                    Review organization status at /verify →
                  </SafeNavLink>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 text-[11px] text-[var(--fcs-ink-muted)]">
                  <p className="flex items-center gap-1.5 font-semibold text-[var(--fcs-ink)]">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    Sample / Personal Design Mode
                  </p>
                  <p className="mt-1">
                    Save personal projects, draw signatures, apply sample stamps, and export PDF/2K/4K
                    PNG anytime. Want Official Verification?{" "}
                    <SafeNavLink href="/verify" className="font-semibold text-teal-700 hover:underline dark:text-teal-400">
                      Apply as Authorized Organization →
                    </SafeNavLink>
                  </p>
                </div>
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

              <button
                type="button"
                onClick={() => setSignatureModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-600/30 bg-teal-50/70 py-2 font-semibold text-teal-800 hover:bg-teal-100 dark:bg-teal-950/30 dark:text-teal-300"
              >
                <PenTool className="h-3.5 w-3.5" /> Draw / Type / Upload Signature Pad
              </button>

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
                  New ID
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
                    onChange={(e) => {
                      pushUndoSnapshot();
                      setStyle({ ...style, fontDisplay: e.target.value });
                    }}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                  >
                    {[
                      "Cormorant Garamond",
                      "Playfair Display",
                      "Cinzel",
                      "Space Grotesk",
                      "IBM Plex Sans",
                    ].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Body Font</label>
                  <select
                    value={style.fontBody}
                    onChange={(e) => {
                      pushUndoSnapshot();
                      setStyle({ ...style, fontBody: e.target.value });
                    }}
                    className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                  >
                    {[
                      "Plus Jakarta Sans",
                      "Inter",
                      "DM Sans",
                      "IBM Plex Sans",
                      "Source Serif 4",
                    ].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Canvas Dimensions */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold">Width (px)</label>
                  <input
                    type="number"
                    min={400}
                    max={2400}
                    value={baseW}
                    onChange={(e) =>
                      setStyle({
                        ...style,
                        canvasWidth: Math.max(400, Math.min(2400, Number(e.target.value) || 1123)),
                      })
                    }
                    className="w-full rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold">Height (px)</label>
                  <input
                    type="number"
                    min={400}
                    max={2400}
                    value={baseH}
                    onChange={(e) =>
                      setStyle({
                        ...style,
                        canvasHeight: Math.max(400, Math.min(2400, Number(e.target.value) || 794)),
                      })
                    }
                    className="w-full rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1"
                  />
                </div>
              </div>

              {/* Typography Sizes & Align */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium">
                    Title Size ({style.titleFontSize ?? 44}px)
                  </label>
                  <input
                    type="range"
                    min={24}
                    max={68}
                    value={style.titleFontSize ?? 44}
                    onChange={(e) => setStyle({ ...style, titleFontSize: Number(e.target.value) })}
                    className="w-full accent-teal-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium">
                    Recipient Size ({style.recipientFontSize ?? 46}px)
                  </label>
                  <input
                    type="range"
                    min={26}
                    max={72}
                    value={style.recipientFontSize ?? 46}
                    onChange={(e) =>
                      setStyle({ ...style, recipientFontSize: Number(e.target.value) })
                    }
                    className="w-full accent-teal-700"
                  />
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
                <div>
                  <label className="mb-1 block font-semibold">
                    Border Weight ({style.borderThickness ?? 4}px)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={style.borderThickness ?? 4}
                    onChange={(e) =>
                      setStyle({ ...style, borderThickness: Number(e.target.value) })
                    }
                    className="mt-2 w-full accent-teal-700"
                  />
                </div>
              </div>

              {/* Background Image Upload */}
              <div className="space-y-2 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Custom Canvas Background Image</span>
                  {style.backgroundImageUrl && (
                    <button
                      type="button"
                      onClick={() => setStyle({ ...style, backgroundImageUrl: undefined })}
                      className="text-[10px] font-semibold text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-[11px] font-semibold">
                  <ImagePlus className="h-3.5 w-3.5 text-teal-600" />
                  Upload Background Photo / Texture
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadCustomBackground(f);
                    }}
                  />
                </label>
                {style.backgroundImageUrl && (
                  <div>
                    <label className="text-[10px]">
                      Backdrop Opacity ({Math.round((style.backgroundOpacity ?? 0.25) * 100)}%)
                    </label>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={style.backgroundOpacity ?? 0.25}
                      onChange={(e) =>
                        setStyle({ ...style, backgroundOpacity: Number(e.target.value) })
                      }
                      className="w-full accent-teal-700"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 font-medium">
                  <input
                    type="checkbox"
                    checked={style.showQrCode}
                    onChange={(e) => setStyle({ ...style, showQrCode: e.target.checked })}
                    className="accent-teal-700"
                  />
                  QR Code
                </label>
                <label className="flex items-center gap-1.5 font-medium">
                  <input
                    type="checkbox"
                    checked={style.showBorder}
                    onChange={(e) => setStyle({ ...style, showBorder: e.target.checked })}
                    className="accent-teal-700"
                  />
                  Border Frame
                </label>
              </div>

              {/* Quick Add Asset Buttons */}
              <div className="grid grid-cols-4 gap-2 border-t border-[var(--fcs-border)] pt-3">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2 text-[10px] font-semibold hover:border-teal-600/50"
                >
                  <Camera className="h-4 w-4 text-teal-600" />
                  Photo
                </button>
                <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2 text-[10px] font-semibold hover:border-teal-600/50">
                  <ImagePlus className="h-4 w-4 text-teal-600" />
                  Logo
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
                  onClick={() => setSignatureModalOpen(true)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2 text-[10px] font-semibold hover:border-teal-600/50"
                >
                  <PenTool className="h-4 w-4 text-teal-600" />
                  Signature
                </button>
                <button
                  type="button"
                  onClick={addCustomTextBlock}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2 text-[10px] font-semibold hover:border-teal-600/50"
                >
                  <Type className="h-4 w-4 text-teal-600" />
                  Text
                </button>
              </div>

              {/* Selected Element Inspector */}
              {selectedElement && (
                <div className="space-y-2.5 rounded-xl border border-teal-600/30 bg-[var(--fcs-surface-muted)] p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-bold">{selectedElement.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ locked: !selectedElement.locked })}
                        title={selectedElement.locked ? "Unlock layer" : "Lock layer"}
                        className="rounded p-1 hover:bg-[var(--fcs-surface)]"
                      >
                        {selectedElement.locked ? (
                          <Lock className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={duplicateSelectedElement}
                        title="Duplicate layer"
                        className="rounded p-1 hover:bg-[var(--fcs-surface)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
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
                        onClick={() => deleteCanvasElement(selectedElement.id)}
                        title="Delete layer"
                        className="rounded p-1 text-red-600 hover:bg-[var(--fcs-surface)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {selectedElement.type === "text_block" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={selectedElement.text || ""}
                        onChange={(e) => updateSelectedElement({ text: e.target.value })}
                        className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                      />
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="number"
                          min={10}
                          max={64}
                          value={selectedElement.fontSize ?? 16}
                          onChange={(e) =>
                            updateSelectedElement({ fontSize: Number(e.target.value) || 16 })
                          }
                          className="rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1"
                        />
                        <input
                          type="color"
                          value={selectedElement.color || style.primaryColor}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          className="h-7 w-full rounded border border-[var(--fcs-border)]"
                        />
                        <select
                          value={selectedElement.align || "center"}
                          onChange={(e) =>
                            updateSelectedElement({
                              align: e.target.value as "left" | "center" | "right",
                            })
                          }
                          className="rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-1.5 py-1"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span>Width ({selectedElement.width}px)</span>
                      <input
                        type="range"
                        min={40}
                        max={480}
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
                      <li key={el.id} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedElementId(el.id)}
                          className={`flex min-w-0 flex-1 items-center justify-between rounded-lg border px-2.5 py-1.5 text-left ${
                            selectedElementId === el.id
                              ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/40"
                              : "border-[var(--fcs-border)]"
                          }`}
                        >
                          <span className="truncate font-medium">
                            {el.locked ? "🔒 " : ""}
                            {el.label}
                          </span>
                          <span className="ml-2 shrink-0 rounded bg-[var(--fcs-surface-muted)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[var(--fcs-ink-muted)]">
                            {el.type.replace(/_/g, " ")}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCanvasElement(el.id)}
                          aria-label={`Delete ${el.label}`}
                          className="shrink-0 rounded-lg border border-red-500/30 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
              {/* Active Elements on Canvas */}
              <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">Elements on Certificate ({elements.length})</p>
                  {elements.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        pushUndoSnapshot();
                        setElements([]);
                        setSelectedElementId(null);
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {elements.length === 0 ? (
                  <p className="mt-1.5 text-[11px] text-[var(--fcs-ink-muted)]">
                    No stamps or signatures placed yet. Create a Sample Stamp or Official Stamp below!
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {elements.map((el) => (
                      <li
                        key={el.id}
                        className={`flex items-center justify-between gap-2 rounded-lg border bg-[var(--fcs-surface)] px-2.5 py-1.5 ${
                          selectedElementId === el.id ? "border-teal-600" : "border-[var(--fcs-border)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedElementId(el.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          {el.src && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={el.src}
                              alt={el.label}
                              className="h-7 w-7 shrink-0 rounded border border-black/10 bg-white object-contain p-0.5"
                            />
                          )}
                          <span className="truncate font-semibold">{el.label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCanvasElement(el.id)}
                          className="rounded-lg border border-red-500/40 px-2 py-0.5 text-[10px] font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Official Organization Stamp Studio (if Admin-approved) */}
              {hasApprovedIssuer ? (
                <OrganizationStampStudio
                  mode="embedded"
                  approvedIssuers={props.approvedIssuers}
                  selectedIssuerId={selectedIssuerId}
                  onSelectIssuerId={(nextId) => {
                    setSelectedIssuerId(nextId);
                    const matched = props.approvedIssuers.find((i) => i.id === nextId);
                    if (matched) setOrganizationName(matched.organization_name);
                  }}
                  savedStamps={orgStamps}
                  onSavedStampsChange={setOrgStamps}
                  authorizedConfirm={authorizedConfirm}
                  onAuthorizedConfirmChange={setAuthorizedConfirm}
                  onApplyToCertificate={(item) => {
                    pushUndoSnapshot();
                    const newEl: CertificateCanvasElement = {
                      ...item,
                      id: `org-el-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                      zIndex: elements.length + 1,
                    };
                    setElements((prev) => [...prev, newEl]);
                    setSelectedElementId(newEl.id);
                  }}
                />
              ) : (
                <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-50/70 p-3 dark:bg-amber-950/30">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <Stamp className="h-3.5 w-3.5" /> Sample & Practice Stamp Studio
                    </p>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                      Sample Only
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90">
                    Every designer can generate custom sample stamps! Official non-sample stamps unlock
                    once your organization is approved by Admin.
                  </p>

                  <div className="flex items-center justify-center rounded-xl border border-amber-500/20 bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sampleStampPreview.dataUrl}
                      alt="Sample stamp preview"
                      className="h-24 w-auto object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={sampleStampConfig.organizationName}
                      onChange={(e) =>
                        setSampleStampConfig((c) => ({ ...c, organizationName: e.target.value }))
                      }
                      placeholder="Header text"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1.5"
                    />
                    <input
                      type="text"
                      value={sampleStampConfig.centerTitle}
                      onChange={(e) =>
                        setSampleStampConfig((c) => ({ ...c, centerTitle: e.target.value }))
                      }
                      placeholder="Center label"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={sampleStampConfig.preset}
                      onChange={(e) =>
                        setSampleStampConfig((c) => ({
                          ...c,
                          preset: e.target.value as OfficialStampConfig["preset"],
                        }))
                      }
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1.5"
                    >
                      {STAMP_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sampleStampConfig.colorFinish}
                      onChange={(e) =>
                        setSampleStampConfig((c) => ({
                          ...c,
                          colorFinish: e.target.value as OfficialStampConfig["colorFinish"],
                        }))
                      }
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2 py-1.5"
                    >
                      {STAMP_FINISH_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addSampleStampToCanvas(true)}
                      className="flex-1 rounded-lg bg-teal-700 py-2 font-semibold text-white hover:bg-teal-800"
                    >
                      Place Sample Stamp on Canvas
                    </button>
                    <SafeNavLink
                      href="/stamps"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-3 py-2 font-semibold hover:border-teal-600/40"
                    >
                      Full Studio →
                    </SafeNavLink>
                  </div>
                </div>
              )}
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
                Ask Creator AI for Wording & Design Advice
              </button>

              {aiAdvice && (
                <div className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 whitespace-pre-wrap text-[11px] leading-relaxed">
                  {aiAdvice}
                </div>
              )}

              {/* Revision History */}
              {certId && props.isAuthenticated && (
                <div className="space-y-2 border-t border-[var(--fcs-border)] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <History className="h-3.5 w-3.5 text-teal-600" />
                      Revision History ({revisions.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveRevision}
                      className="rounded-lg border border-teal-600/30 px-2.5 py-1 text-[10px] font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-400"
                    >
                      + Save Snapshot
                    </button>
                  </div>
                  {revisionsLoading ? (
                    <p className="text-[11px] text-[var(--fcs-ink-muted)]">Loading snapshots...</p>
                  ) : revisions.length === 0 ? (
                    <p className="text-[11px] text-[var(--fcs-ink-muted)]">
                      Save a snapshot to restore previous certificate states anytime.
                    </p>
                  ) : (
                    <ul className="max-h-44 space-y-1.5 overflow-y-auto">
                      {revisions.map((rev) => (
                        <li
                          key={rev.id}
                          className="flex items-center justify-between rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                        >
                          <div>
                            <p className="font-semibold">
                              v{rev.version_number} • {rev.note || "Snapshot"}
                            </p>
                            <p className="text-[10px] text-[var(--fcs-ink-muted)]">
                              {new Date(rev.created_at).toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              pushUndoSnapshot();
                              const s = rev.snapshot as Partial<StudioSnapshot>;
                              applySnapshot({
                                title: s.title || title,
                                recipientName: s.recipientName || recipientName,
                                courseOrAchievement: s.courseOrAchievement || courseOrAchievement,
                                organizationName: s.organizationName || organizationName,
                                description: s.description || description,
                                orientation: (s.orientation as "landscape" | "portrait") || orientation,
                                elements: Array.isArray(s.elements) ? s.elements : elements,
                                style: (s.style as CertificateStyleConfig) || style,
                              });
                              setStatusMsg(`Restored Revision v${rev.version_number}.`);
                            }}
                            className="rounded bg-teal-700 px-2 py-0.5 text-[10px] font-semibold text-white"
                          >
                            Restore
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="border-t border-[var(--fcs-border)] pt-3">
                <SafeNavLink
                  href={`/verify/${certificateCode}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline dark:text-teal-400"
                >
                  <QrCode className="h-3.5 w-3.5" /> Open Public Verification Page →
                </SafeNavLink>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT LIVE INTERACTIVE CANVAS */}
        <div className="lg:col-span-8">
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--fcs-ink-muted)]">
                Drag elements • Drag bottom-right teal handle to resize • Snap guides enabled
              </span>
              {selectedElement && (
                <button
                  type="button"
                  onClick={() => deleteCanvasElement(selectedElement.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                >
                  <Trash2 className="h-3 w-3" /> Delete &ldquo;{selectedElement.label}&rdquo;
                </button>
              )}
              {verificationStatus === "verified" ? (
                <SafeNavLink
                  href={`/verify/${certificateCode}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified Certificate ↗
                </SafeNavLink>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  {hasApprovedIssuer ? verificationStatus.replace(/_/g, " ") : "Sample / Personal Design"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {[0.45, 0.58, 0.64, 0.72, 0.85, 1.0].map((z) => (
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

          <div className="overflow-auto rounded-2xl border border-[var(--fcs-border)] bg-slate-200/70 p-4 dark:bg-slate-900/60">
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
                isVerified={verificationStatus === "verified"}
                isSample={!hasApprovedIssuer || verificationStatus !== "verified"}
                showGrid={showGrid}
                snapToGuides={snapToGuides}
                selectedElementId={selectedElementId}
                interactive={true}
                onSelectElement={setSelectedElementId}
                onDeleteElement={deleteCanvasElement}
                onUpdateElementPosition={(id, x, y) =>
                  setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x, y } : el)))
                }
                onUpdateElementSize={(id, width, height) =>
                  setElements((prev) =>
                    prev.map((el) => (el.id === id ? { ...el, width, height } : el))
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

      <SignatureDrawerModal
        open={signatureModalOpen}
        defaultName={signatoryName}
        defaultDesignation={signatoryDesignation}
        onClose={() => setSignatureModalOpen(false)}
        onApply={handleApplySignature}
      />
    </div>
  );
}
