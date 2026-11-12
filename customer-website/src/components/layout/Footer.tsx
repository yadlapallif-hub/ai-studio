import React from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { CreatorStudioLogo } from "../brand/CreatorStudioLogo";
import { ReplayIntroButton } from "../brand/ReplayIntroButton";

export function Footer({
  footerContent,
  githubUrl,
}: {
  footerContent: {
    credit: string;
    license: string;
    githubUrl: string;
    contactEmail: string;
    disclaimer: string;
  };
  githubUrl: string;
}) {
  return (
    <footer className="no-print border-t border-[var(--fcs-border)] bg-[var(--fcs-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <CreatorStudioLogo size={28} className="shrink-0" />
              <p className="text-sm font-bold tracking-wide uppercase">CREATOR STUDIO</p>
            </div>
            <p className="mt-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
              Create Your Future. Design Your Identity.
            </p>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              Free, open-source AI Resume Builder, Certificate Studio with official QR verification,
              and Document Vault. Zero paywalls, zero paid exports, zero hidden fees.
            </p>
            <p className="mt-3 text-[11px] text-[var(--fcs-ink-muted)]">
              {footerContent.disclaimer}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-[var(--fcs-ink-muted)]">
              Studios & Tools
            </p>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <SafeNavLink href="/resume-builder" className="hover:text-teal-700 dark:hover:text-teal-400">
                  AI Resume Studio
                </SafeNavLink>
              </li>
              <li>
                <SafeNavLink
                  href="/certificate-builder"
                  className="hover:text-teal-700 dark:hover:text-teal-400"
                >
                  Certificate Design Studio
                </SafeNavLink>
              </li>
              <li>
                <SafeNavLink href="/verify" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Public Certificate Verification
                </SafeNavLink>
              </li>
              <li>
                <SafeNavLink href="/assistant" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Creator AI &amp; Intelligence
                </SafeNavLink>
              </li>
              <li>
                <SafeNavLink href="/support" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Live Support & Tickets
                </SafeNavLink>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-[var(--fcs-ink-muted)]">
              Open Source & Contact
            </p>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <SafeNavLink
                  href={footerContent.githubUrl || githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-teal-700 dark:hover:text-teal-400"
                >
                  GitHub Repository
                </SafeNavLink>
              </li>
              <li>
                <SafeNavLink
                  href={`mailto:${footerContent.contactEmail}`}
                  className="hover:text-teal-700 dark:hover:text-teal-400"
                >
                  {footerContent.contactEmail}
                </SafeNavLink>
              </li>
              <li className="text-[var(--fcs-ink-muted)]">{footerContent.license}</li>
              <li className="pt-2 font-semibold text-[var(--fcs-ink)]">
                {footerContent.credit}
              </li>
              <li className="pt-1">
                <ReplayIntroButton />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
