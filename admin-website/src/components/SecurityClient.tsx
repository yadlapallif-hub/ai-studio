"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SecurityClient({
  isSuperAdmin,
  initialSecuritySetting,
}: {
  isSuperAdmin: boolean;
  initialSecuritySetting: {
    require_mfa_for_super_admin?: boolean;
    max_upload_bytes?: number;
    allowed_export_formats?: string[];
  };
}) {
  const [factors, setFactors] = useState<Array<{ id: string; status: string; friendly_name?: string }>>([]);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [secConfig, setSecConfig] = useState(initialSecuritySetting);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadFactors = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp as never[]) ?? []);
  };

  useEffect(() => {
    void loadFactors();
  }, []);

  const enrollTotp = async () => {
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Creator Studio Admin Authenticator",
    });
    if (error || !data) {
      setErr(error?.message || "Failed initializing TOTP enrollment.");
      return;
    }
    setEnrollFactorId(data.id);
    setQrSvg(data.totp.qr_code);
  };

  const verifyTotpEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollFactorId) return;
    setErr(null);
    const supabase = createClient();
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: enrollFactorId,
    });
    if (chErr || !challenge) {
      setErr(chErr?.message || "Challenge failed");
      return;
    }
    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code: totpCode.trim(),
    });
    if (verErr) {
      setErr(verErr.message);
      return;
    }
    setQrSvg(null);
    setEnrollFactorId(null);
    setTotpCode("");
    setMsg("Two-Factor Authenticator (TOTP) enabled on your Admin account.");
    await loadFactors();
  };

  const unenroll = async (factorId: string) => {
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId });
    await loadFactors();
    setMsg("MFA factor removed.");
  };

  const saveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "security_config", value: secConfig }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setErr(json.error || "Update failed");
      return;
    }
    setMsg("Platform security policy saved.");
  };

  return (
    <div className="space-y-6 text-xs">
      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          <CheckCircle2 className="h-4 w-4" />
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      )}

      {/* Admin MFA Enrollment */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <KeyRound className="h-4 w-4 text-teal-600" /> Admin Two-Factor Authentication (TOTP)
            </h2>
            <p className="mt-1 text-[var(--adm-ink-muted)]">
              Protect your Administrator login with an authenticator app.
            </p>
          </div>
          {!qrSvg && (
            <button
              type="button"
              onClick={enrollTotp}
              className="rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
            >
              + Enroll Authenticator
            </button>
          )}
        </div>

        {factors.length > 0 && (
          <ul className="space-y-2">
            {factors.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
              >
                <span>
                  {f.friendly_name || "Authenticator"} —{" "}
                  <strong className="uppercase">{f.status}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => void unenroll(f.id)}
                  className="text-red-600 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {qrSvg && (
          <form onSubmit={verifyTotpEnroll} className="space-y-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-4">
            <p className="font-semibold">Scan this QR code in Google Authenticator / 1Password:</p>
            <div
              className="inline-block rounded-lg bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="flex max-w-xs gap-2">
              <input
                type="text"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="flex-1 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface)] px-3 py-2 font-mono"
              />
              <button
                type="submit"
                className="rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white"
              >
                Activate
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Super Admin Security Settings */}
      <form
        onSubmit={saveSecuritySettings}
        className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-teal-600" /> Critical Platform Security Policies
          </h2>
          {!isSuperAdmin && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Super Admin Only
            </span>
          )}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!isSuperAdmin}
            checked={Boolean(secConfig.require_mfa_for_super_admin)}
            onChange={(e) =>
              setSecConfig({ ...secConfig, require_mfa_for_super_admin: e.target.checked })
            }
          />
          Require TOTP Multi-Factor Authentication for Super Admins
        </label>

        <div>
          <label className="mb-1 block font-semibold">Max Upload Size (Bytes)</label>
          <input
            type="number"
            disabled={!isSuperAdmin}
            value={secConfig.max_upload_bytes ?? 10485760}
            onChange={(e) =>
              setSecConfig({ ...secConfig, max_upload_bytes: Number(e.target.value) })
            }
            className="w-48 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
          />
        </div>

        {isSuperAdmin && (
          <button
            type="submit"
            className="rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800"
          >
            Save Security Policy
          </button>
        )}
      </form>
    </div>
  );
}
