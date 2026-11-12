"use client";

import React, { useState } from "react";
import { CheckCircle2, Flag, Loader2, X } from "lucide-react";

export function ReportCertificateButton({
  certificateCode: initialCode = "",
}: {
  certificateCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<
    | "counterfeit_claim"
    | "unauthorized_institution"
    | "altered_details"
    | "spam_or_abuse"
    | "other"
  >("counterfeit_claim");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/verify/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificate_code: code.trim().toUpperCase(),
          reporter_email: email.trim() || undefined,
          reason,
          details: details.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "Could not submit report.");
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSent(false);
          setErrorMsg(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-50/70 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300"
      >
        <Flag className="h-3.5 w-3.5" /> Report Invalid / Forged Certificate
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--fcs-border)] pb-3">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Flag className="h-4 w-4 text-red-600" /> Report Suspicious Credential
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--fcs-surface-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sent ? (
              <div className="mt-5 space-y-3 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="text-sm font-bold">Report Logged for Admin Review</p>
                <p className="text-xs text-[var(--fcs-ink-muted)]">
                  Thank you for protecting credential integrity. Our Trust &amp; Compliance Admins
                  will investigate Certificate ID{" "}
                  <span className="font-mono font-semibold">{code}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
                {errorMsg && (
                  <div className="rounded-xl border border-red-500/30 bg-red-50 p-2.5 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {errorMsg}
                  </div>
                )}
                <div>
                  <label className="mb-1 block font-semibold">Certificate ID *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FCS-2026-AB12CD"
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Issue Category *</label>
                  <select
                    value={reason}
                    onChange={(e) =>
                      setReason(
                        e.target.value as
                          | "counterfeit_claim"
                          | "unauthorized_institution"
                          | "altered_details"
                          | "spam_or_abuse"
                          | "other"
                      )
                    }
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                  >
                    <option value="counterfeit_claim">Suspected Counterfeit / Forged Claim</option>
                    <option value="unauthorized_institution">Unauthorized Organization / Stamp</option>
                    <option value="altered_details">Altered Name / Date / Grade</option>
                    <option value="spam_or_abuse">Use of Revoked / Spam Credential</option>
                    <option value="other">Other Integrity Concern</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Your Email (optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional for status follow-up"
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Details / Evidence *</label>
                  <textarea
                    required
                    minLength={8}
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe why this certificate appears invalid or unauthorized..."
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-2.5"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-[var(--fcs-border)] px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
