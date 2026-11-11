import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const shared = require("../.test-dist/index.js");

test("createEmptyResumeData produces all 14 editable sections safely", () => {
  const empty = shared.createEmptyResumeData();
  assert.equal(empty.personalInfo.fullName, "");
  assert.deepEqual(empty.education, []);
  assert.deepEqual(empty.experience, []);
  assert.deepEqual(empty.technicalSkills, []);
  assert.deepEqual(empty.softSkills, []);
  assert.deepEqual(empty.projects, []);
  assert.deepEqual(empty.internships, []);
  assert.deepEqual(empty.certifications, []);
  assert.deepEqual(empty.languages, []);
  assert.deepEqual(empty.achievements, []);
  assert.deepEqual(empty.references, []);
});

test("analyzeResumeQuality scores strong starter resume higher than empty resume and includes ATS disclaimer", () => {
  const emptyReport = shared.analyzeResumeQuality(shared.createEmptyResumeData());
  const sampleReport = shared.analyzeResumeQuality(
    shared.createSampleStarterResumeData(),
    { showPhoto: false },
    "Looking for TypeScript Next.js PostgreSQL developer with Docker and REST API experience"
  );

  assert.ok(sampleReport.overallScore > emptyReport.overallScore);
  assert.ok(sampleReport.atsReadiness >= 60);
  assert.ok(sampleReport.keywordMatches && sampleReport.keywordMatches.matched.length > 0);
  assert.match(sampleReport.disclaimer, /does not guarantee|guarantees/i);
});

test("analyzeCareerRecommendations derives paths without fabricating live job postings", () => {
  const rec = shared.analyzeCareerRecommendations(
    shared.createSampleStarterResumeData(),
    "Full-Stack Engineer"
  );
  assert.ok(rec.careerPaths.length >= 1);
  assert.ok(rec.learningRoadmap.length === 3);
  assert.match(rec.disclaimer, /never fabricated|never invented/i);
});

test("createDefaultCertificateElements starts clean with no decorative sample stamps", () => {
  const defaults = shared.createDefaultCertificateElements();
  assert.deepEqual(defaults, []);
  assert.equal(typeof shared.createDecorativeSampleStampSvg, "undefined");
});

test("generateCertificateCode returns valid FCS-YYYY-XXXXXX format", () => {
  const code = shared.generateCertificateCode();
  assert.match(code, /^FCS-\d{4}-[A-Z0-9]{6}$/);
});

test("analyzeCertificateDesign warns when background matches primary ink color", () => {
  const review = shared.analyzeCertificateDesign({
    title: "Certificate of Excellence",
    recipientName: "Jordan Taylor",
    courseName: "Systems Architecture",
    organizationName: "Open Engineering Guild",
    signatoryName: "Dr. Morgan",
    elements: shared.createDefaultCertificateElements(),
    style: shared.createDefaultCertificateStyle({
      backgroundColor: "#FFFFFF",
      primaryColor: "#FFFFFF",
    }),
  });
  assert.ok(review.readabilityScore < 75);
  assert.ok(review.colorRecommendations.some((c) => /match/i.test(c)));
});

test("Zod schemas reject invalid inputs and accept valid records", () => {
  assert.equal(
    shared.resumeSaveSchema.safeParse({
      title: "",
      template_slug: "ats-clean",
      data: {},
      style_config: {},
    }).success,
    false
  );

  assert.equal(
    shared.certificateSaveSchema.safeParse({
      template_slug: "course-completion",
      certificate_code: "FCS-2026-AB12CD",
      title: "Certificate of Completion",
      recipient_name: "Jordan Taylor",
      course_or_achievement: "Web Engineering",
      organization_name: "Open Guild",
      issue_date: "2026-11-11",
      orientation: "landscape",
      canvas_elements: [],
      style_config: {},
    }).success,
    true
  );

  assert.equal(
    shared.supportTicketCreateSchema.safeParse({
      subject: "Hi",
      description: "x",
      category: "invalid_category",
    }).success,
    false
  );
});

test("template catalogs provide 100 unique resume templates and 100 unique certificate templates", () => {
  assert.equal(shared.RESUME_TEMPLATE_CATALOG.length, 100);
  assert.equal(shared.CERTIFICATE_TEMPLATE_CATALOG.length, 100);

  const resumeSlugs = new Set(shared.RESUME_TEMPLATE_CATALOG.map((t) => t.slug));
  const certSlugs = new Set(shared.CERTIFICATE_TEMPLATE_CATALOG.map((t) => t.slug));
  assert.equal(resumeSlugs.size, 100);
  assert.equal(certSlugs.size, 100);

  assert.equal(shared.RESUME_TEMPLATE_CATALOG[0].slug, "ats-clean");
  assert.equal(shared.CERTIFICATE_TEMPLATE_CATALOG[0].slug, "course-completion");
});

test("buildOfficialStampSvg generates valid non-sample SVG stamps for all presets and escapes XML", () => {
  const presets = [
    "circular_double",
    "circular_seal",
    "rectangular_official",
    "square_notary",
    "oval_registry",
    "ribbon_badge",
  ];

  for (const preset of presets) {
    const cfg = shared.createDefaultOfficialStampConfig("Nexora & Guild <Academy>", preset);
    const out = shared.buildOfficialStampSvg(cfg, `test-${preset}`);
    assert.ok(out.svgMarkup.includes("<svg"));
    assert.ok(out.svgMarkup.includes("NEXORA &amp; GUILD &lt;ACADEMY&gt;"));
    assert.ok(!/SAMPLE|PREVIEW ONLY/i.test(out.svgMarkup));
    assert.ok(out.dataUrl.startsWith("data:image/svg+xml;utf8,"));
  }

  const customOut = shared.buildOfficialStampSvg(
    {
      ...shared.createDefaultOfficialStampConfig("Org", "circular_double"),
      colorFinish: "custom",
      customHex: "#6D28D9",
      distressedInk: false,
    },
    "custom1"
  );
  assert.ok(customOut.svgMarkup.includes("#6D28D9"));
});

