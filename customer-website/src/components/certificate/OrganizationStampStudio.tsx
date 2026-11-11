"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildOfficialStampSvg,
  createDefaultOfficialStampConfig,
  STAMP_EMBLEM_OPTIONS,
  STAMP_FINISH_OPTIONS,
  STAMP_PRESETS,
  type CertificateCanvasElement,
  type OfficialStampConfig,
  type OrganizationStampRecord,
  type StampColorFinish,
  type StampEmblem,
  type StampFontStyle,
  type StampPresetId,
} from "@francis/shared";
import {
  Award,
  Check,
  CheckCircle2,
  Download,
  Eraser,
  ImagePlus,
  Loader2,
  PenTool,
  Plus,
  Save,
  Sparkles,
  Stamp,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

interface ApprovedIssuerOption {
  id: string;
  organization_name: string;
}

interface OrganizationStampStudioProps {
  mode: "embedded" | "standalone";
  approvedIssuers: ApprovedIssuerOption[];
  selectedIssuerId?: string;
  onSelectIssuerId?: (issuerId: string) => void;
  savedStamps: OrganizationStampRecord[];
  onSavedStampsChange: React.Dispatch<React.SetStateAction<OrganizationStampRecord[]>>;
  onApplyToCertificate?: (element: Omit<CertificateCanvasElement, "id" | "zIndex">) => void;
  authorizedConfirm?: boolean;
  onAuthorizedConfirmChange?: (val: boolean) => void;
}

type StudioSubTab = "create" | "library" | "signature" | "upload";

const CENTER_QUICK_BADGES = [
  "VERIFIED",
  "CERTIFIED",
  "APPROVED",
  "OFFICIAL SEAL",
  "AUTHORIZED",
];

function triggerDataDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function processLogoAsStampPng(
  file: File,
  options: { removeWhiteBg: boolean; circularCrop: boolean }
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load selected image."));
      img.src = objectUrl;
    });

    const size = 400;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.clearRect(0, 0, size, size);
    if (options.circularCrop) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    const scale = Math.min((size - 16) / img.width, (size - 16) / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

    if (options.circularCrop) {
      ctx.restore();
    }

    if (options.removeWhiteBg) {
      const imageData = ctx.getImageData(0, 0, size, size);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const minC = Math.min(r, g, b);
        if (minC > 225) {
          d[i + 3] = 0;
        } else if (minC > 195) {
          const fade = Math.round(((225 - minC) / 30) * d[i + 3]);
          d[i + 3] = Math.min(d[i + 3], fade);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function OrganizationStampStudio({
  mode,
  approvedIssuers,
  selectedIssuerId: controlledIssuerId,
  onSelectIssuerId,
  savedStamps,
  onSavedStampsChange,
  onApplyToCertificate,
  authorizedConfirm: controlledAuthConfirm,
  onAuthorizedConfirmChange,
}: OrganizationStampStudioProps) {
  const [internalIssuerId, setInternalIssuerId] = useState(approvedIssuers[0]?.id || "");
  const activeIssuerId =
    (controlledIssuerId && approvedIssuers.some((i) => i.id === controlledIssuerId)
      ? controlledIssuerId
      : internalIssuerId) || approvedIssuers[0]?.id || "";

  const activeIssuer = useMemo(
    () => approvedIssuers.find((i) => i.id === activeIssuerId) || approvedIssuers[0] || null,
    [approvedIssuers, activeIssuerId]
  );

  const [subTab, setSubTab] = useState<StudioSubTab>("create");
  const [stampConfig, setStampConfig] = useState<OfficialStampConfig>(() =>
    createDefaultOfficialStampConfig(activeIssuer?.organization_name || "Authorized Organization")
  );
  const [stampName, setStampName] = useState(
    `${activeIssuer?.organization_name || "Organization"} Official Stamp`
  );
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Signature pad state
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [sigHasInk, setSigHasInk] = useState(false);
  const [sigInkColor, setSigInkColor] = useState("#0F172A");
  const [sigLineWidth, setSigLineWidth] = useState(3);
  const [sigName, setSigName] = useState("Authorized Signatory");

  // Logo-as-stamp converter state
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoRemoveBg, setLogoRemoveBg] = useState(true);
  const [logoCircular, setLogoCircular] = useState(true);
  const [logoInkFilter, setLogoInkFilter] =
    useState<CertificateCanvasElement["inkStyle"]>("blue_ink");
  const [logoStampName, setLogoStampName] = useState("Organization Logo Stamp");

  // Keep org name synced when activeIssuer switches
  const prevIssuerRef = useRef<string | null>(activeIssuer?.id || null);
  useEffect(() => {
    if (activeIssuer && activeIssuer.id !== prevIssuerRef.current) {
      prevIssuerRef.current = activeIssuer.id;
      const slugHint = activeIssuer.organization_name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 8);
      setStampConfig((prev) => ({
        ...prev,
        organizationName: activeIssuer.organization_name,
        subCode: `REG • ${slugHint || "FCS"}`,
      }));
      setStampName(`${activeIssuer.organization_name} Official Stamp`);
    }
  }, [activeIssuer]);

  const builtPreview = useMemo(
    () => buildOfficialStampSvg(stampConfig, "live-preview"),
    [stampConfig]
  );

  const issuerStamps = useMemo(
    () => savedStamps.filter((s) => !activeIssuer || s.issuer_id === activeIssuer.id),
    [savedStamps, activeIssuer]
  );

  const handleIssuerChange = (nextId: string) => {
    setInternalIssuerId(nextId);
    onSelectIssuerId?.(nextId);
  };

  const applyCreatedToCertificate = () => {
    if (!onApplyToCertificate) return;
    const built = buildOfficialStampSvg(stampConfig, `apply-${Date.now().toString(36)}`);
    onApplyToCertificate({
      type: built.stampKind,
      label: stampName.trim() || `${stampConfig.organizationName} ${stampConfig.centerTitle}`,
      src: built.dataUrl,
      x: 74,
      y: 64,
      width: built.width,
      height: built.height,
      rotation: stampConfig.preset === "rectangular_official" ? -6 : 0,
      opacity: 0.94,
      shape: built.shape === "scalloped" ? "circle" : built.shape,
      inkStyle: built.inkStyle === "custom" ? "default" : built.inkStyle,
      isSampleDecorative: false,
    });
    setMsg("Official organization stamp applied to certificate canvas.");
    setErr(null);
  };

  const handleSaveCreatedStamp = async () => {
    if (!activeIssuer) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/issuers/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "created",
          issuerId: activeIssuer.id,
          name: stampName.trim() || `${activeIssuer.organization_name} Official Stamp`,
          isDefault: saveAsDefault,
          config: stampConfig,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        stamp?: OrganizationStampRecord;
      };
      if (!res.ok || !json.stamp) {
        setErr(json.error || "Unable to save organization stamp.");
        return;
      }

      onSavedStampsChange((prev) => {
        const cleaned = saveAsDefault
          ? prev.map((item) =>
              item.issuer_id === activeIssuer.id ? { ...item, is_default: false } : item
            )
          : prev;
        return [json.stamp!, ...cleaned];
      });
      setMsg(
        `Saved "${json.stamp.name}" to ${activeIssuer.organization_name}'s official stamp library.`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSetDefault = async (stamp: OrganizationStampRecord) => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/issuers/stamps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stamp.id, isDefault: !stamp.is_default }),
      });
      const json = (await res.json()) as { ok?: boolean; stamp?: OrganizationStampRecord; error?: string };
      if (!res.ok || !json.stamp) {
        setErr(json.error || "Could not update default stamp.");
        return;
      }
      onSavedStampsChange((prev) =>
        prev.map((item) => {
          if (item.id === stamp.id) return json.stamp!;
          if (json.stamp!.is_default && item.issuer_id === stamp.issuer_id) {
            return { ...item, is_default: false };
          }
          return item;
        })
      );
      setMsg(
        json.stamp.is_default
          ? `"${stamp.name}" set as default stamp for new certificates.`
          : `"${stamp.name}" removed from default slot.`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteStamp = async (stamp: OrganizationStampRecord) => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/issuers/stamps?id=${encodeURIComponent(stamp.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErr(json.error || "Failed deleting stamp.");
        return;
      }
      onSavedStampsChange((prev) => prev.filter((item) => item.id !== stamp.id));
      setMsg(`Deleted "${stamp.name}" from organization library.`);
    } finally {
      setBusy(false);
    }
  };

  const handleApplySavedStamp = (stamp: OrganizationStampRecord) => {
    if (!onApplyToCertificate || !stamp.preview_url) return;
    const isRect = stamp.shape === "rectangle";
    const isSig = stamp.stamp_kind === "signature";
    onApplyToCertificate({
      type:
        stamp.stamp_kind === "signature"
          ? "signature"
          : stamp.stamp_kind === "seal"
            ? "seal"
            : "stamp",
      label: stamp.name,
      src: stamp.preview_url,
      x: isSig ? 42 : 74,
      y: isSig ? 72 : 64,
      width: isSig ? 160 : isRect ? 184 : 122,
      height: isSig ? 64 : isRect ? 92 : 122,
      rotation: 0,
      opacity: 0.95,
      shape:
        stamp.shape === "scalloped"
          ? "circle"
          : stamp.shape === "square"
            ? "square"
            : stamp.shape,
      inkStyle:
        stamp.ink_style === "custom" ? "default" : stamp.ink_style,
      isSampleDecorative: false,
    });
    setMsg(`Applied "${stamp.name}" to certificate canvas.`);
  };

  // Signature drawing handlers
  const getSigPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startSigDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getSigPoint(e);
    ctx.strokeStyle = sigInkColor;
    ctx.lineWidth = sigLineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    drawingRef.current = true;
    setSigHasInk(true);
  };

  const moveSigDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !sigCanvasRef.current) return;
    const ctx = sigCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const pt = getSigPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const endSigDraw = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setSigHasInk(false);
  };

  const applyOrSaveSignature = async (saveToOrg: boolean) => {
    const canvas = sigCanvasRef.current;
    if (!canvas || !sigHasInk) {
      setErr("Draw your signature in the pad first.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    setErr(null);

    if (onApplyToCertificate && !saveToOrg) {
      onApplyToCertificate({
        type: "signature",
        label: sigName.trim() || "Authorized Signature",
        src: dataUrl,
        x: 41,
        y: 72,
        width: 168,
        height: 68,
        rotation: 0,
        opacity: 1,
        shape: "rectangle",
        inkStyle: "default",
        isSampleDecorative: false,
      });
      setMsg("Drawn signature added to certificate.");
      return;
    }

    if (saveToOrg && activeIssuer) {
      setBusy(true);
      try {
        const res = await fetch("/api/issuers/stamps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "data_url",
            issuerId: activeIssuer.id,
            name: sigName.trim() || "Authorized Signature",
            stampKind: "signature",
            shape: "rectangle",
            inkStyle: "default",
            dataUrl,
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          stamp?: OrganizationStampRecord;
          error?: string;
        };
        if (!res.ok || !json.stamp) {
          setErr(json.error || "Unable to save signature.");
          return;
        }
        onSavedStampsChange((prev) => [json.stamp!, ...prev]);
        if (onApplyToCertificate) {
          onApplyToCertificate({
            type: "signature",
            label: json.stamp.name,
            src: json.stamp.preview_url || dataUrl,
            x: 41,
            y: 72,
            width: 168,
            height: 68,
            rotation: 0,
            opacity: 1,
            shape: "rectangle",
            inkStyle: "default",
            isSampleDecorative: false,
          });
        }
        setMsg(`Signature "${json.stamp.name}" saved to organization library.`);
      } finally {
        setBusy(false);
      }
    }
  };

  // Logo-as-stamp regeneration when file or toggles change
  useEffect(() => {
    if (!logoFile) return;
    let active = true;
    processLogoAsStampPng(logoFile, {
      removeWhiteBg: logoRemoveBg,
      circularCrop: logoCircular,
    })
      .then((url) => {
        if (active) setLogoPreviewUrl(url);
      })
      .catch((e) => {
        if (active) setErr(e instanceof Error ? e.message : "Failed processing image.");
      });
    return () => {
      active = false;
    };
  }, [logoFile, logoRemoveBg, logoCircular]);

  const applyOrSaveLogoStamp = async (saveToOrg: boolean) => {
    if (!logoPreviewUrl || !activeIssuer) {
      setErr("Choose an image or logo first.");
      return;
    }
    setErr(null);

    if (onApplyToCertificate && !saveToOrg) {
      onApplyToCertificate({
        type: "stamp",
        label: logoStampName.trim() || "Organization Emblem Stamp",
        src: logoPreviewUrl,
        x: 75,
        y: 65,
        width: 118,
        height: 118,
        rotation: 0,
        opacity: 0.92,
        shape: logoCircular ? "circle" : "square",
        inkStyle: logoInkFilter,
        isSampleDecorative: false,
      });
      setMsg("Logo converted & placed as official stamp on canvas.");
      return;
    }

    if (saveToOrg) {
      setBusy(true);
      try {
        const res = await fetch("/api/issuers/stamps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "data_url",
            issuerId: activeIssuer.id,
            name: logoStampName.trim() || "Organization Logo Stamp",
            stampKind: "emblem_stamp",
            shape: logoCircular ? "circle" : "square",
            inkStyle: logoInkFilter || "default",
            dataUrl: logoPreviewUrl,
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          stamp?: OrganizationStampRecord;
          error?: string;
        };
        if (!res.ok || !json.stamp) {
          setErr(json.error || "Failed saving logo stamp.");
          return;
        }
        onSavedStampsChange((prev) => [json.stamp!, ...prev]);
        if (onApplyToCertificate) {
          onApplyToCertificate({
            type: "stamp",
            label: json.stamp.name,
            src: json.stamp.preview_url || logoPreviewUrl,
            x: 75,
            y: 65,
            width: 118,
            height: 118,
            rotation: 0,
            opacity: 0.92,
            shape: logoCircular ? "circle" : "square",
            inkStyle: logoInkFilter,
            isSampleDecorative: false,
          });
        }
        setMsg(`Saved "${json.stamp.name}" to ${activeIssuer.organization_name}'s library.`);
      } finally {
        setBusy(false);
      }
    }
  };

  const handleDirectUploadAndSave = async (
    file: File,
    stampKind: "stamp" | "seal" | "signature",
    inkStyle: CertificateCanvasElement["inkStyle"]
  ) => {
    if (!activeIssuer) return;
    if (onAuthorizedConfirmChange && !controlledAuthConfirm) {
      setErr("Confirm that you represent this organization to upload official stamps or seals.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("issuerId", activeIssuer.id);
      form.append("name", file.name.replace(/\.[^.]+$/, ""));
      form.append("stampKind", stampKind);
      form.append("shape", stampKind === "signature" ? "rectangle" : "circle");
      form.append("inkStyle", inkStyle || "default");

      const res = await fetch("/api/issuers/stamps", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        stamp?: OrganizationStampRecord;
        error?: string;
      };
      if (!res.ok || !json.stamp) {
        setErr(json.error || "Failed uploading stamp.");
        return;
      }
      onSavedStampsChange((prev) => [json.stamp!, ...prev]);
      if (onApplyToCertificate && json.stamp.preview_url) {
        handleApplySavedStamp(json.stamp);
      } else {
        setMsg(`Uploaded & saved "${json.stamp.name}" to organization library.`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!activeIssuer) return null;

  return (
    <div className="space-y-4">
      {/* Organization Header & Approved Status */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-3 text-xs text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold">Authorized Organization Stamp Access Unlocked</p>
              <p className="text-[11px] opacity-85">
                Create official stamps, embossed seals, signatures & logo stamps for{" "}
                <strong>{activeIssuer.organization_name}</strong>.
              </p>
            </div>
          </div>

          {approvedIssuers.length > 1 && (
            <select
              value={activeIssuer.id}
              onChange={(e) => handleIssuerChange(e.target.value)}
              className="rounded-lg border border-emerald-600/30 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100"
            >
              {approvedIssuers.map((iss) => (
                <option key={iss.id} value={iss.id}>
                  {iss.organization_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-1 text-[11px] font-semibold sm:grid-cols-4">
        {[
          { id: "create", label: "Create Stamp", icon: Sparkles },
          { id: "library", label: `Org Stamps (${issuerStamps.length})`, icon: Stamp },
          { id: "signature", label: "Draw Signature", icon: PenTool },
          { id: "upload", label: "Logo & Uploads", icon: Upload },
        ].map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id as StudioSubTab)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 transition ${
                active
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {msg && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-3 py-2 text-[11px] text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      )}

      {/* TAB 1: CREATE OFFICIAL STAMP */}
      {subTab === "create" && (
        <div
          className={
            mode === "standalone" ? "grid gap-6 lg:grid-cols-12" : "space-y-4"
          }
        >
          {/* Live Preview */}
          <div
            className={`rounded-2xl border border-[var(--fcs-border)] bg-[#FFFDF7] p-4 text-center ${
              mode === "standalone" ? "lg:col-span-5 lg:order-2 flex flex-col justify-between" : ""
            }`}
          >
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                Live Official Stamp Preview • {activeIssuer.organization_name}
              </p>
              <div className="my-4 flex min-h-44 items-center justify-center rounded-xl border border-dashed border-amber-900/20 bg-white/80 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={builtPreview.dataUrl}
                  alt={stampName}
                  className="max-h-40 w-auto object-contain"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {onApplyToCertificate && (
                  <button
                    type="button"
                    onClick={applyCreatedToCertificate}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    <Plus className="h-3.5 w-3.5" /> Apply to Certificate
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSaveCreatedStamp()}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                    onApplyToCertificate
                      ? "border border-teal-700/40 bg-teal-50 text-teal-900 hover:bg-teal-100"
                      : "bg-teal-700 text-white hover:bg-teal-800"
                  }`}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Org Stamp
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-700">
                <label className="flex items-center gap-1.5 font-medium">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                    className="accent-teal-700"
                  />
                  Set as default stamp for new certificates
                </label>
                <button
                  type="button"
                  onClick={() =>
                    triggerDataDownload(
                      builtPreview.dataUrl,
                      `${(stampName || "org-stamp").replace(/[^a-z0-9-_]+/gi, "_")}.svg`
                    )
                  }
                  className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline"
                >
                  <Download className="h-3 w-3" /> SVG
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            className={`space-y-3 text-xs ${
              mode === "standalone" ? "lg:col-span-7 lg:order-1" : ""
            }`}
          >
            <div>
              <label className="mb-1.5 block font-bold">Stamp Style</label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {STAMP_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setStampConfig((prev) => ({
                        ...prev,
                        preset: preset.id as StampPresetId,
                        colorFinish:
                          preset.id === "circular_seal" && prev.colorFinish === "blue_ink"
                            ? "gold_embossed"
                            : prev.colorFinish,
                      }))
                    }
                    className={`rounded-xl border p-2 text-left transition ${
                      stampConfig.preset === preset.id
                        ? "border-teal-600 bg-teal-50/70 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                        : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] hover:border-teal-600/40"
                    }`}
                  >
                    <p className="font-semibold leading-tight">{preset.label}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--fcs-ink-muted)] line-clamp-1">
                      {preset.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-semibold">Saved Stamp Name</label>
                <input
                  type="text"
                  value={stampName}
                  onChange={(e) => setStampName(e.target.value)}
                  placeholder="e.g. Official Registrar Stamp"
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Organization Text</label>
                <input
                  type="text"
                  value={stampConfig.organizationName}
                  onChange={(e) =>
                    setStampConfig({ ...stampConfig, organizationName: e.target.value })
                  }
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-semibold">Center Label</label>
                <div className="flex flex-wrap gap-1">
                  {CENTER_QUICK_BADGES.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => setStampConfig({ ...stampConfig, centerTitle: badge })}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        stampConfig.centerTitle === badge
                          ? "bg-teal-700 text-white"
                          : "bg-[var(--fcs-surface-muted)] text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                      }`}
                    >
                      {badge}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={stampConfig.centerTitle}
                onChange={(e) =>
                  setStampConfig({ ...stampConfig, centerTitle: e.target.value })
                }
                className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-semibold">Bottom Ring / Footer Text</label>
                <input
                  type="text"
                  value={stampConfig.bottomText}
                  onChange={(e) =>
                    setStampConfig({ ...stampConfig, bottomText: e.target.value })
                  }
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Registration / ID Code</label>
                <input
                  type="text"
                  value={stampConfig.subCode}
                  onChange={(e) => setStampConfig({ ...stampConfig, subCode: e.target.value })}
                  placeholder="e.g. REG • NEXORA"
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-semibold">Ink / Foil Finish</label>
              <div className="flex flex-wrap items-center gap-2">
                {STAMP_FINISH_OPTIONS.map((fin) => (
                  <button
                    key={fin.id}
                    type="button"
                    onClick={() =>
                      setStampConfig({
                        ...stampConfig,
                        colorFinish: fin.id as StampColorFinish,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                      stampConfig.colorFinish === fin.id
                        ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/50"
                        : "border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)]"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/15"
                      style={{ backgroundColor: fin.hex }}
                    />
                    {fin.label}
                  </button>
                ))}
                {stampConfig.colorFinish === "custom" && (
                  <input
                    type="color"
                    value={stampConfig.customHex || "#4338CA"}
                    onChange={(e) =>
                      setStampConfig({ ...stampConfig, customHex: e.target.value })
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-[var(--fcs-border)]"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block font-semibold">Emblem</label>
                <select
                  value={stampConfig.emblem}
                  onChange={(e) =>
                    setStampConfig({
                      ...stampConfig,
                      emblem: e.target.value as StampEmblem,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1.5"
                >
                  {STAMP_EMBLEM_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Typography</label>
                <select
                  value={stampConfig.fontStyle}
                  onChange={(e) =>
                    setStampConfig({
                      ...stampConfig,
                      fontStyle: e.target.value as StampFontStyle,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1.5"
                >
                  <option value="sans">Modern Sans</option>
                  <option value="serif">Classic Serif</option>
                  <option value="mono">Registry Mono</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Border Weight</label>
                <select
                  value={stampConfig.borderWeight}
                  onChange={(e) =>
                    setStampConfig({
                      ...stampConfig,
                      borderWeight: e.target.value as OfficialStampConfig["borderWeight"],
                    })
                  }
                  className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1.5"
                >
                  <option value="thin">Thin</option>
                  <option value="medium">Medium</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 font-medium">
                <input
                  type="checkbox"
                  checked={stampConfig.distressedInk}
                  onChange={(e) =>
                    setStampConfig({ ...stampConfig, distressedInk: e.target.checked })
                  }
                  className="accent-teal-700"
                />
                Authentic Rubber Ink Texture
              </label>
              <label className="flex items-center gap-1.5 font-medium">
                <input
                  type="checkbox"
                  checked={stampConfig.showDateLine}
                  onChange={(e) =>
                    setStampConfig({ ...stampConfig, showDateLine: e.target.checked })
                  }
                  className="accent-teal-700"
                />
                Include Date Stamp
              </label>
              {stampConfig.showDateLine && (
                <input
                  type="text"
                  value={stampConfig.dateText}
                  onChange={(e) =>
                    setStampConfig({ ...stampConfig, dateText: e.target.value })
                  }
                  className="w-28 rounded border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2 py-1 text-[11px]"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAVED ORGANIZATION STAMPS LIBRARY */}
      {subTab === "library" && (
        <div className="space-y-3">
          {issuerStamps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-6 text-center text-xs text-[var(--fcs-ink-muted)]">
              <Award className="mx-auto h-7 w-7 text-teal-600" />
              <p className="mt-2 font-semibold text-[var(--fcs-ink)]">
                No saved stamps for {activeIssuer.organization_name} yet
              </p>
              <p className="mt-1">
                Create a custom vector stamp, draw an official signature, or convert a logo in the
                tabs above and save it here for instant 1-click reuse.
              </p>
              <button
                type="button"
                onClick={() => setSubTab("create")}
                className="mt-3 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Create First Organization Stamp
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-3 ${
                mode === "standalone" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
              }`}
            >
              {issuerStamps.map((st) => (
                <div
                  key={st.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-3 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{st.name}</span>
                      {st.is_default && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                          <Star className="h-2.5 w-2.5 fill-amber-600 text-amber-600" /> Default
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase text-[var(--fcs-ink-muted)]">
                      {st.stamp_kind.replace(/_/g, " ")} • {st.shape}
                    </p>
                    <div className="my-2.5 flex h-28 items-center justify-center rounded-lg border border-black/5 bg-[#FFFDF7] p-2">
                      {st.preview_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={st.preview_url}
                          alt={st.name}
                          className="max-h-24 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">No preview</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {onApplyToCertificate && st.preview_url && (
                      <button
                        type="button"
                        onClick={() => handleApplySavedStamp(st)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-teal-700 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-800"
                      >
                        <Check className="h-3 w-3" /> Apply
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSetDefault(st)}
                      title="Set as default stamp for new certificates"
                      className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium ${
                        st.is_default
                          ? "border-amber-500/40 bg-amber-50 text-amber-800"
                          : "border-[var(--fcs-border)] bg-[var(--fcs-surface)] hover:border-teal-600/40"
                      }`}
                    >
                      {st.is_default ? "Default" : "Set Default"}
                    </button>
                    {st.preview_url && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerDataDownload(
                            st.preview_url,
                            `${st.name.replace(/[^a-z0-9-_]+/gi, "_")}.${
                              st.svg_markup ? "svg" : "png"
                            }`
                          )
                        }
                        title="Download stamp"
                        className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 hover:bg-[var(--fcs-surface-muted)]"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDeleteStamp(st)}
                      title="Delete stamp"
                      className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DRAW AUTHORIZED SIGNATURE PAD */}
      {subTab === "signature" && (
        <div className="space-y-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">Draw Official Signatory Signature</p>
            <div className="flex items-center gap-2">
              {[
                { label: "Black", hex: "#0F172A" },
                { label: "Blue Ink", hex: "#1D4ED8" },
                { label: "Teal", hex: "#0F766E" },
              ].map((ink) => (
                <button
                  key={ink.hex}
                  type="button"
                  onClick={() => setSigInkColor(ink.hex)}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${
                    sigInkColor === ink.hex
                      ? "border-teal-600 bg-white dark:bg-slate-800"
                      : "border-[var(--fcs-border)]"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ink.hex }}
                  />
                  {ink.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-dashed border-slate-400 bg-white">
            <canvas
              ref={sigCanvasRef}
              width={520}
              height={160}
              onPointerDown={startSigDraw}
              onPointerMove={moveSigDraw}
              onPointerUp={endSigDraw}
              onPointerLeave={endSigDraw}
              className="h-36 w-full cursor-crosshair touch-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium">Pen Weight</span>
              <input
                type="range"
                min={1.5}
                max={6}
                step={0.5}
                value={sigLineWidth}
                onChange={(e) => setSigLineWidth(Number(e.target.value))}
                className="w-24 accent-teal-700"
              />
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1 text-[11px] font-semibold"
            >
              <Eraser className="h-3 w-3" /> Clear Pad
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <input
              type="text"
              value={sigName}
              onChange={(e) => setSigName(e.target.value)}
              placeholder="Signature label (e.g. Director Signature)"
              className="rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-2 sm:col-span-3"
            />
            {onApplyToCertificate && (
              <button
                type="button"
                disabled={!sigHasInk}
                onClick={() => void applyOrSaveSignature(false)}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Apply to Canvas
              </button>
            )}
            <button
              type="button"
              disabled={!sigHasInk || busy}
              onClick={() => void applyOrSaveSignature(true)}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 font-semibold disabled:opacity-50 ${
                onApplyToCertificate
                  ? "border border-teal-700/40 bg-teal-50 text-teal-900 hover:bg-teal-100 sm:col-span-2"
                  : "bg-teal-700 text-white hover:bg-teal-800 sm:col-span-3"
              }`}
            >
              <Save className="h-3.5 w-3.5" /> Save Signature to Organization Library
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: CONVERT LOGO AS STAMP + DIRECT STAMP FILE UPLOADS */}
      {subTab === "upload" && (
        <div className="space-y-4 text-xs">
          {/* Logo / Image as Stamp */}
          <div className="space-y-3 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-bold">
                <ImagePlus className="h-4 w-4 text-teal-600" />
                Use Organization Logo / Emblem as Stamp
              </p>
              <label className="cursor-pointer rounded-lg bg-teal-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-800">
                Choose Image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setLogoFile(f);
                      setLogoStampName(f.name.replace(/\.[^.]+$/, "") || "Organization Stamp");
                    }
                  }}
                />
              </label>
            </div>

            {logoPreviewUrl && (
              <div className="space-y-3 border-t border-[var(--fcs-border)] pt-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-black/10 bg-[#FFFDF7] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreviewUrl}
                      alt="Logo stamp preview"
                      className={`h-full w-full object-contain ${
                        logoCircular ? "rounded-full object-cover" : ""
                      }`}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={logoStampName}
                      onChange={(e) => setLogoStampName(e.target.value)}
                      placeholder="Stamp name..."
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5"
                    />
                    <div className="flex flex-wrap gap-3 text-[11px]">
                      <label className="flex items-center gap-1.5 font-medium">
                        <input
                          type="checkbox"
                          checked={logoRemoveBg}
                          onChange={(e) => setLogoRemoveBg(e.target.checked)}
                          className="accent-teal-700"
                        />
                        Remove White Background
                      </label>
                      <label className="flex items-center gap-1.5 font-medium">
                        <input
                          type="checkbox"
                          checked={logoCircular}
                          onChange={(e) => setLogoCircular(e.target.checked)}
                          className="accent-teal-700"
                        />
                        Circular Stamp Crop
                      </label>
                    </div>
                    <select
                      value={logoInkFilter}
                      onChange={(e) =>
                        setLogoInkFilter(
                          e.target.value as CertificateCanvasElement["inkStyle"]
                        )
                      }
                      className="w-full rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] px-2.5 py-1.5 text-[11px]"
                    >
                      <option value="default">Original Full Color</option>
                      <option value="blue_ink">Royal Blue Ink Tint</option>
                      <option value="red_ink">Crimson Ink Tint</option>
                      <option value="teal_ink">Emerald Teal Ink Tint</option>
                      <option value="gold_embossed">Gold Embossed Finish</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {onApplyToCertificate && (
                    <button
                      type="button"
                      onClick={() => void applyOrSaveLogoStamp(false)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800"
                    >
                      <Plus className="h-3.5 w-3.5" /> Apply as Stamp
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void applyOrSaveLogoStamp(true)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-teal-700/40 bg-teal-50 px-3 py-2 font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" /> Save to Org Stamps
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct PNG/SVG Stamp & Seal File Uploads */}
          <div className="space-y-2.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-4">
            <p className="font-bold">Direct Upload Stamp, Seal or Signature File (Saved to Org)</p>
            {onAuthorizedConfirmChange && (
              <label className="flex items-start gap-2 rounded-lg border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={Boolean(controlledAuthConfirm)}
                  onChange={(e) => onAuthorizedConfirmChange(e.target.checked)}
                  className="mt-0.5 accent-teal-700"
                />
                <span>
                  I represent <strong>{activeIssuer.organization_name}</strong> and am authorized to
                  upload and apply its official stamps, seals, or signatures.
                </span>
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] py-2.5 font-semibold hover:border-teal-600/50">
                <Stamp className="h-3.5 w-3.5 text-blue-600" />
                Blue Ink Stamp
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleDirectUploadAndSave(f, "stamp", "blue_ink");
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] py-2.5 font-semibold hover:border-teal-600/50">
                <Stamp className="h-3.5 w-3.5 text-red-600" />
                Red Ink Stamp
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleDirectUploadAndSave(f, "stamp", "red_ink");
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] py-2.5 font-semibold hover:border-teal-600/50">
                <Upload className="h-3.5 w-3.5 text-amber-600" />
                Gold Seal PNG/SVG
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleDirectUploadAndSave(f, "seal", "gold_embossed");
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] py-2.5 font-semibold hover:border-teal-600/50">
                <Upload className="h-3.5 w-3.5 text-teal-600" />
                Signature PNG/SVG
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleDirectUploadAndSave(f, "signature", "default");
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
