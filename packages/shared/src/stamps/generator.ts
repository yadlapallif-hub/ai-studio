import type {
  OfficialStampConfig,
  StampColorFinish,
  StampEmblem,
  StampFontStyle,
  StampPresetId,
} from "../types/index";

export const STAMP_PRESETS: Array<{
  id: StampPresetId;
  label: string;
  subtitle: string;
  defaultKind: "stamp" | "seal";
  defaultShape: "circle" | "rectangle" | "square" | "scalloped";
}> = [
  {
    id: "circular_double",
    label: "Circular Double-Ring Stamp",
    subtitle: "Classic arched organization name & verified center",
    defaultKind: "stamp",
    defaultShape: "circle",
  },
  {
    id: "circular_seal",
    label: "Embossed Foil Seal",
    subtitle: "24-tooth scalloped foil crest for formal awards",
    defaultKind: "seal",
    defaultShape: "scalloped",
  },
  {
    id: "rectangular_official",
    label: "Rectangular Ink Stamp",
    subtitle: "Registrar rubber stamp with date & ID block",
    defaultKind: "stamp",
    defaultShape: "rectangle",
  },
  {
    id: "square_notary",
    label: "Square Notary Crest",
    subtitle: "Double-framed institutional seal with corner ticks",
    defaultKind: "seal",
    defaultShape: "square",
  },
  {
    id: "oval_registry",
    label: "Oval Registry Stamp",
    subtitle: "Traditional academy & board verification stamp",
    defaultKind: "stamp",
    defaultShape: "rectangle",
  },
  {
    id: "ribbon_badge",
    label: "Honor Crest + Ribbons",
    subtitle: "Circular emblem seal with twin lower award ribbons",
    defaultKind: "seal",
    defaultShape: "circle",
  },
];

export const STAMP_FINISH_OPTIONS: Array<{
  id: StampColorFinish;
  label: string;
  hex: string;
}> = [
  { id: "blue_ink", label: "Royal Blue Ink", hex: "#1D4ED8" },
  { id: "red_ink", label: "Crimson Ink", hex: "#B91C1C" },
  { id: "teal_ink", label: "Emerald Teal Ink", hex: "#0F766E" },
  { id: "black_ink", label: "Archival Black Ink", hex: "#1E293B" },
  { id: "gold_embossed", label: "Gold Embossed Foil", hex: "#B45309" },
  { id: "custom", label: "Custom Color", hex: "#4338CA" },
];

export const STAMP_EMBLEM_OPTIONS: Array<{ id: StampEmblem; label: string }> = [
  { id: "shield", label: "Shield" },
  { id: "star", label: "Star" },
  { id: "check", label: "Checkmark" },
  { id: "laurel", label: "Laurel" },
  { id: "crest", label: "Crest" },
  { id: "none", label: "Text Only" },
];

function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeHex(hex?: string): string {
  const clean = (hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) return clean;
  return "#1D4ED8";
}

function getFontFamily(style: StampFontStyle): string {
  if (style === "serif") return "Georgia, 'Times New Roman', serif";
  if (style === "mono") return "'Courier New', ui-monospace, monospace";
  return "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
}

function getColors(finish: StampColorFinish, customHex?: string) {
  if (finish === "red_ink") {
    return { stroke: "#B91C1C", text: "#991B1B", soft: "#FEE2E2", isGold: false };
  }
  if (finish === "teal_ink") {
    return { stroke: "#0F766E", text: "#115E59", soft: "#CCFBF1", isGold: false };
  }
  if (finish === "black_ink") {
    return { stroke: "#1E293B", text: "#0F172A", soft: "#E2E8F0", isGold: false };
  }
  if (finish === "gold_embossed") {
    return { stroke: "#78350F", text: "#451A03", soft: "#FEF3C7", isGold: true };
  }
  if (finish === "custom") {
    const hex = normalizeHex(customHex);
    return { stroke: hex, text: hex, soft: `${hex}22`, isGold: false };
  }
  return { stroke: "#1D4ED8", text: "#1E40AF", soft: "#DBEAFE", isGold: false };
}

function renderEmblem(emblem: StampEmblem, cx: number, cy: number, color: string, scale = 1): string {
  if (emblem === "none") return "";
  const gStart = `<g transform="translate(${cx},${cy}) scale(${scale})">`;
  const gEnd = `</g>`;
  if (emblem === "shield") {
    return `${gStart}<path d="M0 -14 L12 -9 V2 C12 9 6 13 0 16 C-6 13 -12 9 -12 2 V-9 Z" fill="none" stroke="${color}" stroke-width="2.2"/><path d="M-5 1 L-1 5 L6 -3" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${gEnd}`;
  }
  if (emblem === "star") {
    return `${gStart}<path d="M0 -14 L3.8 -4.8 L13.8 -4.2 L6 2.2 L8.6 12 L0 6.5 L-8.6 12 L-6 2.2 L-13.8 -4.2 L-3.8 -4.8 Z" fill="${color}" fill-opacity="0.9"/>${gEnd}`;
  }
  if (emblem === "check") {
    return `${gStart}<circle cx="0" cy="0" r="12" fill="none" stroke="${color}" stroke-width="2"/><path d="M-5.5 0.5 L-1.5 4.5 L6 -4" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${gEnd}`;
  }
  if (emblem === "laurel") {
    return `${gStart}<path d="M-12 8 C-16 0 -13 -10 -4 -13 M12 8 C16 0 13 -10 4 -13" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/><circle cx="0" cy="-2" r="4" fill="${color}" fill-opacity="0.85"/><path d="M-6 11 L0 7 L6 11" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>${gEnd}`;
  }
  // crest
  return `${gStart}<path d="M-11 -6 L-6 -12 L0 -7 L6 -12 L11 -6 L9 5 H-9 Z" fill="none" stroke="${color}" stroke-width="2.1" stroke-linejoin="round"/><line x1="-8" y1="9" x2="8" y2="9" stroke="${color}" stroke-width="2" stroke-linecap="round"/>${gEnd}`;
}

function buildScallopedPath(cx: number, cy: number, outerR: number, innerR: number, teeth = 24): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (Math.PI * i) / teeth;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `${pts.join(" ")} Z`;
}

export function createDefaultOfficialStampConfig(
  organizationName: string,
  preset: StampPresetId = "circular_double"
): OfficialStampConfig {
  const cleanOrg = organizationName.trim() || "Authorized Organization";
  const slugHint = cleanOrg
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  const year = String(new Date().getFullYear());
  const today = new Date().toISOString().slice(0, 10);

  return {
    preset,
    organizationName: cleanOrg,
    centerTitle: preset === "circular_seal" ? "OFFICIAL SEAL" : "VERIFIED",
    bottomText: `AUTHORIZED ISSUER • ${year}`,
    subCode: `REG • ${slugHint || "FCS"}`,
    emblem: preset === "circular_seal" ? "laurel" : "shield",
    colorFinish: preset === "circular_seal" ? "gold_embossed" : "blue_ink",
    customHex: "#1D4ED8",
    fontStyle: preset === "circular_seal" || preset === "square_notary" ? "serif" : "sans",
    borderWeight: "medium",
    distressedInk: preset === "circular_double" || preset === "rectangular_official",
    showDateLine: preset === "rectangular_official",
    dateText: today,
  };
}

export function stampSvgToDataUrl(svgMarkup: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;
}

export function buildOfficialStampSvg(
  config: OfficialStampConfig,
  uniqueKey?: string
): {
  svgMarkup: string;
  dataUrl: string;
  stampKind: "stamp" | "seal";
  shape: "circle" | "rectangle" | "square" | "scalloped";
  inkStyle: "blue_ink" | "red_ink" | "teal_ink" | "black_ink" | "gold_embossed" | "custom";
  width: number;
  height: number;
} {
  return buildStampSvgInternal(config, uniqueKey, false);
}

export function buildSampleStampSvg(
  config: OfficialStampConfig,
  uniqueKey?: string
): {
  svgMarkup: string;
  dataUrl: string;
  stampKind: "stamp" | "seal";
  shape: "circle" | "rectangle" | "square" | "scalloped";
  inkStyle: "blue_ink" | "red_ink" | "teal_ink" | "black_ink" | "gold_embossed" | "custom";
  width: number;
  height: number;
} {
  return buildStampSvgInternal(config, uniqueKey, true);
}

function buildStampSvgInternal(
  config: OfficialStampConfig,
  uniqueKey?: string,
  isSampleMode = false
): {
  svgMarkup: string;
  dataUrl: string;
  stampKind: "stamp" | "seal";
  shape: "circle" | "rectangle" | "square" | "scalloped";
  inkStyle: "blue_ink" | "red_ink" | "teal_ink" | "black_ink" | "gold_embossed" | "custom";
  width: number;
  height: number;
} {
  const uid = (uniqueKey || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`).replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  );
  const colors = getColors(config.colorFinish, config.customHex);
  const fontFamily = getFontFamily(config.fontStyle);
  const strokeMult = config.borderWeight === "thin" ? 0.75 : config.borderWeight === "bold" ? 1.35 : 1;
  const opacityVal = Math.max(0.15, Math.min(1, Number(config.opacity ?? 1)));
  const textRot = Math.max(-180, Math.min(180, Number(config.textRotation ?? 0)));
  const curvature = Math.max(0.75, Math.min(1.2, Number(config.curvature ?? 1)));

  const orgRaw = (config.organizationName || (isSampleMode ? "SAMPLE ORGANIZATION" : "AUTHORIZED ORGANIZATION"))
    .trim()
    .toUpperCase()
    .slice(0, 42);
  const centerRaw = (config.centerTitle || (isSampleMode ? "SAMPLE" : "VERIFIED"))
    .trim()
    .toUpperCase()
    .slice(0, 22);
  const bottomRawBase = (config.bottomText || (isSampleMode ? "SAMPLE DESIGN STAMP" : "AUTHORIZED ISSUER"))
    .trim()
    .toUpperCase()
    .slice(0, 34);
  const bottomRaw =
    isSampleMode && !/SAMPLE/i.test(bottomRawBase)
      ? `SAMPLE • ${bottomRawBase}`.slice(0, 34)
      : bottomRawBase;
  const regPart = (config.registrationNumber || "").trim().toUpperCase().slice(0, 18);
  const subRaw = [config.subCode, regPart].filter(Boolean).join(" • ").trim().toUpperCase().slice(0, 32);
  const dateRaw = (config.dateText || "").trim().slice(0, 20);

  const org = escapeXml(orgRaw);
  const center = escapeXml(centerRaw);
  const bottom = escapeXml(bottomRaw);
  const sub = escapeXml(subRaw);
  const dateStr = escapeXml(dateRaw);
  const filterAttr = config.distressedInk ? ` filter="url(#ink-${uid})"` : "";
  const sampleBadgeTag = (cx: number, y: number) =>
    isSampleMode
      ? `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-size="7.2" font-weight="800" fill="${colors.text}" fill-opacity="0.72" letter-spacing="1.2">SAMPLE / NON-VERIFIED</text>`
      : "";
  const gAttrs = (cx: number, cy: number) =>
    ` opacity="${opacityVal.toFixed(2)}"${
      textRot !== 0 ? ` transform="rotate(${textRot} ${cx} ${cy})"` : ""
    }${filterAttr}`;
  void sub;
  void dateStr;

  const orgFontSize = orgRaw.length > 28 ? 11.5 : orgRaw.length > 20 ? 13 : 14.5;
  const centerFontSize = centerRaw.length > 14 ? 14 : centerRaw.length > 9 ? 17 : 21;
  const bottomFontSize = bottomRaw.length > 24 ? 10 : 11.5;

  const defsContent = `
    ${
      config.distressedInk
        ? `<filter id="ink-${uid}" x="-5%" y="-5%" width="110%" height="110%">
             <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" result="noise"/>
             <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
           </filter>`
        : ""
    }
    ${
      colors.isGold
        ? `<radialGradient id="gold-${uid}" cx="35%" cy="30%" r="72%">
             <stop offset="0%" stop-color="#FEF3C7"/>
             <stop offset="45%" stop-color="#F59E0B"/>
             <stop offset="85%" stop-color="#B45309"/>
             <stop offset="100%" stop-color="#78350F"/>
           </radialGradient>`
        : ""
    }
  `;

  if (config.preset === "rectangular_official") {
    const w = 280;
    const h = 128;
    const fillBg = colors.isGold ? `url(#gold-${uid})` : "none";
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
      <defs>${defsContent}</defs>
      <g${gAttrs(140, 64)}>
        <rect x="7" y="7" width="266" height="114" rx="10" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="${(4.5 * strokeMult).toFixed(2)}"/>
        <rect x="14" y="14" width="252" height="100" rx="6" fill="none" stroke="${colors.stroke}" stroke-width="${(1.6 * strokeMult).toFixed(2)}" stroke-dasharray="5 3"/>
        <text x="140" y="34" text-anchor="middle" font-family="${fontFamily}" font-size="${orgRaw.length > 24 ? 10.5 : 12}" font-weight="800" fill="${colors.text}" letter-spacing="1.8">${org}</text>
        <line x1="28" y1="42" x2="252" y2="42" stroke="${colors.stroke}" stroke-width="1.2" stroke-opacity="0.7"/>
        ${
          config.emblem !== "none"
            ? renderEmblem(config.emblem, 48, 66, colors.text, 0.85)
            : ""
        }
        <text x="${config.emblem !== "none" ? 152 : 140}" y="72" text-anchor="middle" font-family="${fontFamily}" font-size="${centerFontSize + 1}" font-weight="900" fill="${colors.text}" letter-spacing="2.8">${center}</text>
        <line x1="28" y1="86" x2="252" y2="86" stroke="${colors.stroke}" stroke-width="1.2" stroke-opacity="0.7"/>
        <text x="140" y="102" text-anchor="middle" font-family="${fontFamily}" font-size="10" font-weight="700" fill="${colors.text}" letter-spacing="1.4">${escapeXml(
          [bottomRaw, subRaw, config.showDateLine && dateRaw ? dateRaw : ""].filter(Boolean).join(" • ").slice(0, 42)
        )}</text>
        ${sampleBadgeTag(140, 118)}
      </g>
    </svg>`;
    return {
      svgMarkup,
      dataUrl: stampSvgToDataUrl(svgMarkup),
      stampKind: "stamp",
      shape: "rectangle",
      inkStyle: config.colorFinish,
      width: 190,
      height: 88,
    };
  }

  if (config.preset === "oval_registry") {
    const w = 280;
    const h = 180;
    const fillBg = colors.isGold ? `url(#gold-${uid})` : "none";
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
      <defs>${defsContent}</defs>
      <g${gAttrs(140, 90)}>
        <ellipse cx="140" cy="90" rx="130" ry="80" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="${(4.5 * strokeMult).toFixed(2)}"/>
        <ellipse cx="140" cy="90" rx="121" ry="71" fill="none" stroke="${colors.stroke}" stroke-width="${(1.5 * strokeMult).toFixed(2)}" stroke-dasharray="4 3"/>
        <ellipse cx="140" cy="90" rx="92" ry="44" fill="none" stroke="${colors.stroke}" stroke-width="1.2" stroke-opacity="0.75"/>
        <text x="140" y="36" text-anchor="middle" font-family="${fontFamily}" font-size="${orgRaw.length > 24 ? 10 : 11.5}" font-weight="800" fill="${colors.text}" letter-spacing="1.6">${org}</text>
        ${renderEmblem(config.emblem, 140, 68, colors.text, 0.72)}
        <text x="140" y="${config.emblem === "none" ? 94 : 98}" text-anchor="middle" font-family="${fontFamily}" font-size="${centerFontSize}" font-weight="900" fill="${colors.text}" letter-spacing="2.4">${center}</text>
        ${
          subRaw || (config.showDateLine && dateRaw)
            ? `<text x="140" y="118" text-anchor="middle" font-family="${fontFamily}" font-size="9.5" font-weight="700" fill="${colors.text}" letter-spacing="1.2">${escapeXml(
                [subRaw, config.showDateLine && dateRaw ? dateRaw : ""].filter(Boolean).join(" • ")
              )}</text>`
            : ""
        }
        <text x="140" y="150" text-anchor="middle" font-family="${fontFamily}" font-size="10" font-weight="800" fill="${colors.text}" letter-spacing="1.5">${bottom}</text>
        ${sampleBadgeTag(140, 165)}
      </g>
    </svg>`;
    return {
      svgMarkup,
      dataUrl: stampSvgToDataUrl(svgMarkup),
      stampKind: "stamp",
      shape: "rectangle",
      inkStyle: config.colorFinish,
      width: 176,
      height: 114,
    };
  }

  if (config.preset === "square_notary") {
    const size = 220;
    const fillBg = colors.isGold ? `url(#gold-${uid})` : "none";
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>${defsContent}</defs>
      <g${gAttrs(110, 110)}>
        <rect x="10" y="10" width="200" height="200" rx="14" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="${(4.5 * strokeMult).toFixed(2)}"/>
        <rect x="20" y="20" width="180" height="180" rx="8" fill="none" stroke="${colors.stroke}" stroke-width="${(1.6 * strokeMult).toFixed(2)}"/>
        <rect x="30" y="30" width="160" height="160" rx="4" fill="none" stroke="${colors.stroke}" stroke-width="1" stroke-dasharray="4 3"/>
        <text x="110" y="54" text-anchor="middle" font-family="${fontFamily}" font-size="${orgRaw.length > 20 ? 10 : 11.5}" font-weight="800" fill="${colors.text}" letter-spacing="1.5">${org}</text>
        <line x1="42" y1="64" x2="178" y2="64" stroke="${colors.stroke}" stroke-width="1.2"/>
        ${renderEmblem(config.emblem, 110, 96, colors.text, 1)}
        <text x="110" y="${config.emblem === "none" ? 114 : 132}" text-anchor="middle" font-family="${fontFamily}" font-size="${centerFontSize - 1}" font-weight="900" fill="${colors.text}" letter-spacing="2">${center}</text>
        ${
          subRaw || (config.showDateLine && dateRaw)
            ? `<text x="110" y="152" text-anchor="middle" font-family="${fontFamily}" font-size="9.5" font-weight="700" fill="${colors.text}" letter-spacing="1.2">${escapeXml(
                [subRaw, config.showDateLine && dateRaw ? dateRaw : ""].filter(Boolean).join(" • ")
              )}</text>`
            : ""
        }
        <line x1="42" y1="162" x2="178" y2="162" stroke="${colors.stroke}" stroke-width="1.2"/>
        <text x="110" y="180" text-anchor="middle" font-family="${fontFamily}" font-size="9.5" font-weight="800" fill="${colors.text}" letter-spacing="1.4">${bottom}</text>
        ${sampleBadgeTag(110, 197)}
      </g>
    </svg>`;
    return {
      svgMarkup,
      dataUrl: stampSvgToDataUrl(svgMarkup),
      stampKind: "seal",
      shape: "square",
      inkStyle: config.colorFinish,
      width: 122,
      height: 122,
    };
  }

  if (config.preset === "circular_seal") {
    const size = 230;
    const c = 115;
    const topR = Math.round(77 * curvature);
    const botR = Math.round(80 * curvature);
    const scallop = buildScallopedPath(c, c, 106, 98, 26);
    const fillBg = colors.isGold ? `url(#gold-${uid})` : colors.soft;
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>
        ${defsContent}
        <path id="topArc-${uid}" d="M ${c - topR},${c} A ${topR},${topR} 0 1,1 ${c + topR},${c}"/>
        <path id="botArc-${uid}" d="M ${c - botR},${c + 8} A ${botR},${botR} 0 0,0 ${c + botR},${c + 8}"/>
      </defs>
      <g${gAttrs(c, c)}>
        <path d="${scallop}" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="${(2.6 * strokeMult).toFixed(2)}"/>
        <circle cx="${c}" cy="${c}" r="88" fill="none" stroke="${colors.isGold ? "#FEF3C7" : colors.stroke}" stroke-width="1.8" stroke-dasharray="4 3"/>
        <circle cx="${c}" cy="${c}" r="60" fill="none" stroke="${colors.stroke}" stroke-width="1.8"/>
        <text font-family="${fontFamily}" font-size="${orgFontSize}" font-weight="800" fill="${colors.text}" letter-spacing="2">
          <textPath href="#topArc-${uid}" startOffset="50%" text-anchor="middle">${org}</textPath>
        </text>
        <text font-family="${fontFamily}" font-size="${bottomFontSize}" font-weight="700" fill="${colors.text}" letter-spacing="1.6">
          <textPath href="#botArc-${uid}" startOffset="50%" text-anchor="middle">${bottom}</textPath>
        </text>
        ${renderEmblem(config.emblem, c, 94, colors.text, 0.9)}
        <text x="${c}" y="${config.emblem === "none" ? 118 : 126}" text-anchor="middle" font-family="${fontFamily}" font-size="${centerFontSize - 2}" font-weight="900" fill="${colors.text}" letter-spacing="1.8">${center}</text>
        ${
          subRaw || (config.showDateLine && dateRaw)
            ? `<text x="${c}" y="146" text-anchor="middle" font-family="${fontFamily}" font-size="9" font-weight="700" fill="${colors.text}" letter-spacing="1.1">${escapeXml(
                [subRaw, config.showDateLine && dateRaw ? dateRaw : ""].filter(Boolean).join(" • ")
              )}</text>`
            : ""
        }
        ${sampleBadgeTag(c, 162)}
      </g>
    </svg>`;
    return {
      svgMarkup,
      dataUrl: stampSvgToDataUrl(svgMarkup),
      stampKind: "seal",
      shape: "scalloped",
      inkStyle: config.colorFinish,
      width: 126,
      height: 126,
    };
  }

  if (config.preset === "ribbon_badge") {
    const w = 220;
    const h = 256;
    const topR = Math.round(72 * curvature);
    const botR = Math.round(75 * curvature);
    const fillBg = colors.isGold ? `url(#gold-${uid})` : colors.soft;
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
      <defs>
        ${defsContent}
        <path id="topArc-${uid}" d="M ${110 - topR},108 A ${topR},${topR} 0 1,1 ${110 + topR},108"/>
        <path id="botArc-${uid}" d="M ${110 - botR},116 A ${botR},${botR} 0 0,0 ${110 + botR},116"/>
      </defs>
      <g${gAttrs(110, 120)}>
        <polygon points="68,164 46,246 74,230 98,248 106,172" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="2.5"/>
        <polygon points="152,164 174,246 146,230 122,248 114,172" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="2.5"/>
        <circle cx="110" cy="108" r="94" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="${(4 * strokeMult).toFixed(2)}"/>
        <circle cx="110" cy="108" r="84" fill="none" stroke="${colors.stroke}" stroke-width="1.6" stroke-dasharray="5 3"/>
        <circle cx="110" cy="108" r="56" fill="none" stroke="${colors.stroke}" stroke-width="1.6"/>
        <text font-family="${fontFamily}" font-size="${orgFontSize - 0.5}" font-weight="800" fill="${colors.text}" letter-spacing="1.8">
          <textPath href="#topArc-${uid}" startOffset="50%" text-anchor="middle">${org}</textPath>
        </text>
        <text font-family="${fontFamily}" font-size="${bottomFontSize - 0.5}" font-weight="700" fill="${colors.text}" letter-spacing="1.4">
          <textPath href="#botArc-${uid}" startOffset="50%" text-anchor="middle">${bottom}</textPath>
        </text>
        ${renderEmblem(config.emblem, 110, 92, colors.text, 0.85)}
        <text x="110" y="${config.emblem === "none" ? 112 : 120}" text-anchor="middle" font-family="${fontFamily}" font-size="${centerFontSize - 2}" font-weight="900" fill="${colors.text}" letter-spacing="1.6">${center}</text>
        ${
          subRaw || (config.showDateLine && dateRaw)
            ? `<text x="110" y="138" text-anchor="middle" font-family="${fontFamily}" font-size="8.8" font-weight="700" fill="${colors.text}" letter-spacing="1">${escapeXml(
                [subRaw, config.showDateLine && dateRaw ? dateRaw : ""].filter(Boolean).join(" • ")
              )}</text>`
            : ""
        }
        ${sampleBadgeTag(110, 152)}
      </g>
    </svg>`;
    return {
      svgMarkup,
      dataUrl: stampSvgToDataUrl(svgMarkup),
      stampKind: "seal",
      shape: "circle",
      inkStyle: config.colorFinish,
      width: 120,
      height: 140,
    };
  }

  // Default: circular_double
  const size = 220;
  const topR = Math.round(75 * curvature);
  const botR = Math.round(78 * curvature);
  const fillBg = colors.isGold ? `url(#gold-${uid})` : "none";
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <defs>
      ${defsContent}
      <path id="topArc-${uid}" d="M ${110 - topR},110 A ${topR},${topR} 0 1,1 ${110 + topR},110"/>
      <path id="botArc-${uid}" d="M ${110 - botR},118 A ${botR},${botR} 0 0,0 ${110 + botR},118"/>
    </defs>
    <g${gAttrs(110, 110)}>
      <circle cx="110" cy="110" r="100" fill="${fillBg}" stroke="${colors.stroke}" stroke-width="${(4.5 * strokeMult).toFixed(2)}"/>
      <circle cx="110" cy="110" r="91" fill="none" stroke="${colors.stroke}" stroke-width="${(1.5 * strokeMult).toFixed(2)}" stroke-dasharray="5 3"/>
      <circle cx="110" cy="110" r="58" fill="none" stroke="${colors.stroke}" stroke-width="${(1.8 * strokeMult).toFixed(2)}"/>
      <circle cx="32" cy="110" r="2.8" fill="${colors.text}"/>
      <circle cx="188" cy="110" r="2.8" fill="${colors.text}"/>
      <text font-family="${fontFamily}" font-size="${orgFontSize}" font-weight="800" fill="${colors.text}" letter-spacing="2">
        <textPath href="#topArc-${uid}" startOffset="50%" text-anchor="middle">${org}</textPath>
      </text>
      <text font-family="${fontFamily}" font-size="${bottomFontSize}" font-weight="700" fill="${colors.text}" letter-spacing="1.6">
        <textPath href="#botArc-${uid}" startOffset="50%" text-anchor="middle">${bottom}</textPath>
      </text>
      ${renderEmblem(config.emblem, 110, 90, colors.text, 0.8)}
      <text x="110" y="${config.emblem === "none" ? 114 : 118}" text-anchor="middle" font-family="${fontFamily}" font-size="${centerFontSize - 2}" font-weight="900" fill="${colors.text}" letter-spacing="1.8">${center}</text>
      ${
        subRaw || (config.showDateLine && dateRaw)
          ? `<text x="110" y="138" text-anchor="middle" font-family="${fontFamily}" font-size="8.8" font-weight="700" fill="${colors.text}" letter-spacing="1">${escapeXml(
              [subRaw, config.showDateLine && dateRaw ? dateRaw : ""].filter(Boolean).join(" • ")
            )}</text>`
          : ""
      }
      ${sampleBadgeTag(110, 152)}
    </g>
  </svg>`;

  return {
    svgMarkup,
    dataUrl: stampSvgToDataUrl(svgMarkup),
    stampKind: "stamp",
    shape: "circle",
    inkStyle: config.colorFinish,
    width: 120,
    height: 120,
  };
}
