"use client";

import React from "react";
import type { ResumeData, ResumeSectionKey, ResumeStyleConfig } from "@francis/shared";

interface ResumeRendererProps {
  data: ResumeData;
  style: ResumeStyleConfig;
  templateSlug: string;
}

const FONT_MAP: Record<string, string> = {
  Inter: "'Inter', system-ui, sans-serif",
  "Plus Jakarta Sans": "var(--font-sans), system-ui, sans-serif",
  Merriweather: "Georgia, 'Merriweather', serif",
  "Source Serif 4": "var(--font-serif), Georgia, serif",
  "IBM Plex Sans": "'IBM Plex Sans', system-ui, sans-serif",
  "DM Sans": "'DM Sans', system-ui, sans-serif",
  "Space Grotesk": "'Space Grotesk', system-ui, sans-serif",
};

const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "Professional Summary",
  careerObjective: "Career Objective",
  experience: "Work Experience",
  internships: "Internships",
  projects: "Projects",
  education: "Education",
  technicalSkills: "Technical Skills",
  softSkills: "Soft Skills",
  certifications: "Certifications",
  achievements: "Achievements",
  languages: "Languages",
  references: "References",
};

export const ResumeRenderer = React.forwardRef<HTMLDivElement, ResumeRendererProps>(
  function ResumeRenderer({ data, style, templateSlug }, ref) {
    const accent = style.accentColor || "#0F766E";
    const fontCss = FONT_MAP[style.fontFamily] || FONT_MAP["Plus Jakarta Sans"];
    const baseTextSize =
      style.fontSize === "compact"
        ? "11px"
        : style.fontSize === "comfortable"
          ? "13px"
          : "12px";
    const lineHeight =
      style.lineSpacing === "tight"
        ? "1.38"
        : style.lineSpacing === "relaxed"
          ? "1.62"
          : "1.48";

    const isTwoColumn =
      templateSlug === "modern-studio" ||
      templateSlug === "minimal-swiss" ||
      templateSlug === "creative-folio";

    const isCenteredHeader = templateSlug === "academic-cv";
    const isCreative = templateSlug === "creative-folio";

    const visibleSections = (style.sectionOrder || []).filter(
      (key) => !(style.hiddenSections || []).includes(key)
    );

    const sidebarKeys = new Set<ResumeSectionKey>([
      "technicalSkills",
      "softSkills",
      "languages",
      "certifications",
      "achievements",
    ]);

    const hasContent = (key: ResumeSectionKey): boolean => {
      switch (key) {
        case "summary":
          return Boolean(data.summary?.trim());
        case "careerObjective":
          return Boolean(data.careerObjective?.trim());
        case "experience":
          return data.experience.length > 0;
        case "internships":
          return data.internships.length > 0;
        case "projects":
          return data.projects.length > 0;
        case "education":
          return data.education.length > 0;
        case "technicalSkills":
          return data.technicalSkills.length > 0;
        case "softSkills":
          return data.softSkills.length > 0;
        case "certifications":
          return data.certifications.length > 0;
        case "achievements":
          return data.achievements.length > 0;
        case "languages":
          return data.languages.length > 0;
        case "references":
          return data.references.length > 0;
      }
    };

    const renderSectionTitle = (label: string) => {
      if (templateSlug === "technical-spec") {
        return (
          <h2
            className="mb-2 border-b pb-1 font-mono text-[11px] font-bold tracking-wider uppercase"
            style={{ borderColor: accent, color: accent }}
          >
            {label}
          </h2>
        );
      }
      if (templateSlug === "executive-serif" || templateSlug === "academic-cv") {
        return (
          <h2
            className="mb-2 border-b border-slate-300 pb-1 font-serif text-[13px] font-bold tracking-wide uppercase"
            style={{ color: accent }}
          >
            {label}
          </h2>
        );
      }
      if (isCreative) {
        return (
          <h2
            className="mb-2 inline-block rounded px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-white uppercase"
            style={{ backgroundColor: accent }}
          >
            {label}
          </h2>
        );
      }
      return (
        <h2
          className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-bold tracking-widest uppercase"
          style={{ color: accent }}
        >
          {label}
        </h2>
      );
    };

    const renderSectionBody = (key: ResumeSectionKey) => {
      if (!hasContent(key)) return null;
      return (
        <section key={key} className="mb-4 break-inside-avoid">
          {renderSectionTitle(SECTION_LABELS[key])}
          {key === "summary" && (
            <p className="whitespace-pre-line text-slate-700">{data.summary}</p>
          )}
          {key === "careerObjective" && (
            <p className="whitespace-pre-line text-slate-700">{data.careerObjective}</p>
          )}
          {key === "experience" && (
            <div className="space-y-3">
              {data.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      {exp.role || "Role"} —{" "}
                      <span className="font-semibold" style={{ color: accent }}>
                        {exp.company || "Company"}
                      </span>
                    </p>
                    <span className="text-[10.5px] text-slate-500">
                      {[exp.location, [exp.startDate, exp.current ? "Present" : exp.endDate].filter(Boolean).join(" – ")]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </div>
                  {exp.bullets.filter(Boolean).length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">
                      {exp.bullets.filter(Boolean).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
          {key === "internships" && (
            <div className="space-y-2.5">
              {data.internships.map((item) => (
                <div key={item.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      {item.role} —{" "}
                      <span className="font-semibold" style={{ color: accent }}>
                        {item.organization}
                      </span>
                    </p>
                    <span className="text-[10.5px] text-slate-500">
                      {[item.location, item.duration].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                  {item.highlights.filter(Boolean).length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">
                      {item.highlights.filter(Boolean).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
          {key === "projects" && (
            <div className="space-y-2.5">
              {data.projects.map((proj) => (
                <div key={proj.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      {proj.name}
                      {proj.role ? (
                        <span className="font-normal text-slate-600"> — {proj.role}</span>
                      ) : null}
                    </p>
                    {proj.url && (
                      <span className="font-mono text-[10px] text-slate-500">{proj.url}</span>
                    )}
                  </div>
                  {proj.techStack.length > 0 && (
                    <p className="text-[10.5px] font-medium" style={{ color: accent }}>
                      Stack: {proj.techStack.join(", ")}
                    </p>
                  )}
                  {proj.description && <p className="mt-0.5 text-slate-700">{proj.description}</p>}
                  {proj.highlights.filter(Boolean).length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">
                      {proj.highlights.filter(Boolean).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
          {key === "education" && (
            <div className="space-y-2">
              {data.education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ""}
                    </p>
                    <p className="text-slate-700">
                      {edu.institution}
                      {edu.gpa ? ` • GPA: ${edu.gpa}` : ""}
                    </p>
                    {edu.highlights && (
                      <p className="text-[10.5px] text-slate-600">{edu.highlights}</p>
                    )}
                  </div>
                  <span className="text-[10.5px] text-slate-500">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                  </span>
                </div>
              ))}
            </div>
          )}
          {key === "technicalSkills" && (
            <div className="flex flex-wrap gap-1.5">
              {data.technicalSkills.map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          {key === "softSkills" && (
            <p className="text-slate-700">{data.softSkills.join(" • ")}</p>
          )}
          {key === "certifications" && (
            <ul className="space-y-1 text-slate-700">
              {data.certifications.map((cert) => (
                <li key={cert.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    <strong className="text-slate-900">{cert.name}</strong> — {cert.issuer}
                    {cert.credentialId ? ` (${cert.credentialId})` : ""}
                  </span>
                  <span className="text-[10.5px] text-slate-500">{cert.date}</span>
                </li>
              ))}
            </ul>
          )}
          {key === "achievements" && (
            <ul className="space-y-1 text-slate-700">
              {data.achievements.map((ach) => (
                <li key={ach.id}>
                  <strong className="text-slate-900">{ach.title}</strong>
                  {ach.issuer ? ` — ${ach.issuer}` : ""}
                  {ach.date ? ` (${ach.date})` : ""}
                  {ach.description ? `: ${ach.description}` : ""}
                </li>
              ))}
            </ul>
          )}
          {key === "languages" && (
            <ul className="space-y-0.5 text-slate-700">
              {data.languages.map((lang) => (
                <li key={lang.id}>
                  <strong className="text-slate-900">{lang.language}</strong>
                  {lang.proficiency ? ` — ${lang.proficiency}` : ""}
                </li>
              ))}
            </ul>
          )}
          {key === "references" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.references.map((r) => (
                <div key={r.id} className="rounded border border-slate-200 p-2 text-[10.5px]">
                  <p className="font-bold text-slate-900">{r.name}</p>
                  <p className="text-slate-600">
                    {[r.title, r.organization].filter(Boolean).join(", ")}
                  </p>
                  {(r.email || r.phone) && (
                    <p className="text-slate-500">
                      {[r.email, r.phone].filter(Boolean).join(" • ")}
                    </p>
                  )}
                  {r.note && <p className="mt-0.5 text-slate-500">{r.note}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      );
    };

    const p = data.personalInfo;
    const photo = data.profilePhoto;
    const showPhoto = Boolean(style.showPhoto && photo?.url);

    const contactItems = [
      p.email,
      p.phone,
      p.location,
      p.website,
      p.linkedin,
      p.github,
    ].filter(Boolean);

    const renderPhotoElement = () =>
      showPhoto ? (
        <div
          className={`shrink-0 overflow-hidden border border-slate-200 bg-slate-100 ${
            photo.shape === "circle" ? "rounded-full" : "rounded-lg"
          }`}
          style={{ width: 84, height: 84 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={p.fullName || "Profile photo"}
            className="h-full w-full object-cover"
            style={{
              filter: `brightness(${photo.brightness ?? 100}%) contrast(${photo.contrast ?? 100}%)`,
              transform: `rotate(${photo.rotation ?? 0}deg) scale(${photo.zoom ?? 1})`,
            }}
          />
        </div>
      ) : null;

    return (
      <div
        ref={ref}
        className="print-only-canvas mx-auto w-[794px] min-h-[1123px] bg-white p-10 text-slate-900 shadow-lg"
        style={{ fontFamily: fontCss, fontSize: baseTextSize, lineHeight }}
      >
        {/* HEADER */}
        <header
          className={`mb-6 border-b-2 pb-4 ${
            isCenteredHeader
              ? "text-center"
              : photo.position === "left"
                ? "flex flex-row-reverse items-center justify-between gap-6"
                : photo.position === "top"
                  ? "flex flex-col items-center gap-3 text-center"
                  : "flex items-center justify-between gap-6"
          }`}
          style={{ borderColor: accent }}
        >
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {p.fullName || "Your Full Name"}
            </h1>
            {p.headline && (
              <p className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>
                {p.headline}
              </p>
            )}
            {contactItems.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-600">
                {contactItems.map((item, idx) => (
                  <span key={idx}>{item}</span>
                ))}
              </p>
            )}
          </div>
          {renderPhotoElement()}
        </header>

        {/* BODY */}
        {isTwoColumn ? (
          <div className="grid grid-cols-12 gap-7">
            <aside className="col-span-4 border-r border-slate-200 pr-5">
              {visibleSections
                .filter((k) => sidebarKeys.has(k))
                .map((k) => renderSectionBody(k))}
            </aside>
            <div className="col-span-8">
              {visibleSections
                .filter((k) => !sidebarKeys.has(k))
                .map((k) => renderSectionBody(k))}
            </div>
          </div>
        ) : (
          <div>{visibleSections.map((k) => renderSectionBody(k))}</div>
        )}
      </div>
    );
  }
);
