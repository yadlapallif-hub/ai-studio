"use client";

import React from "react";
import { Phone } from "lucide-react";

export const COUNTRY_CODES = [
  { code: "+91", label: "IN (+91)" },
  { code: "+1", label: "US/CA (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+65", label: "SG (+65)" },
  { code: "+49", label: "DE (+49)" },
  { code: "+81", label: "JP (+81)" },
  { code: "custom", label: "Other (+)" },
];

export function normalizeE164Phone(countryCode: string, rawNumber: string): string {
  const trimmed = rawNumber.trim().replace(/[\s()-]/g, "");
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  const digits = trimmed.replace(/\D/g, "").replace(/^0+/, "");
  const prefix = countryCode === "custom" ? "+" : countryCode;
  return `${prefix}${digits}`;
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function MobileNumberField({
  countryCode,
  onCountryCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  id = "phone-input",
}: {
  countryCode: string;
  onCountryCodeChange: (v: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (v: string) => void;
  id?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold" htmlFor={id}>
        Mobile Number
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className="w-28 shrink-0 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-2.5 py-2 text-xs font-medium outline-none focus:border-teal-600"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Phone className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
          <input
            id={id}
            type="tel"
            required
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(e.target.value)}
            placeholder={countryCode === "custom" ? "+919876543210" : "98765 43210"}
            className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
          />
        </div>
      </div>
      <p className="mt-1 text-[10px] text-[var(--fcs-ink-muted)]">
        Normalized to E.164 format (e.g. +919876543210). You can also type a full +code directly.
      </p>
    </div>
  );
}
