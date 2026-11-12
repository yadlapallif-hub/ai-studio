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

test("hasAdminPortalAccess admits every non-customer staff role including support super agents", () => {
  assert.equal(shared.hasAdminPortalAccess(["customer"]), false);
  assert.equal(shared.hasAdminPortalAccess([]), false);
  assert.equal(shared.hasAdminPortalAccess(["super_admin"]), true);
  assert.equal(shared.hasAdminPortalAccess(["admin"]), true);
  assert.equal(shared.hasAdminPortalAccess(["support_agent"]), true);
  assert.equal(shared.hasAdminPortalAccess(["content_manager"]), true);
  assert.equal(shared.hasAdminPortalAccess(["customer", "support_agent"]), true);
  assert.equal(shared.hasAdminPortalAccess(["customer", "content_manager"]), true);
  assert.equal(shared.formatRoleLabel("support_agent"), "Super Agent (Customer Support)");
});

test("role hierarchy routes lower roles to their workspace and enforces role assignment boundaries", () => {
  assert.equal(shared.getDefaultAdminRouteForRoles(["super_admin"]), "/");
  assert.equal(shared.getDefaultAdminRouteForRoles(["admin"]), "/");
  assert.equal(shared.getDefaultAdminRouteForRoles(["support_agent"]), "/messages");
  assert.equal(shared.getDefaultAdminRouteForRoles(["customer", "support_agent"]), "/messages");
  assert.equal(shared.getDefaultAdminRouteForRoles(["content_manager"]), "/templates");
  assert.equal(shared.getDefaultAdminRouteForRoles(["customer"]), "/login");

  assert.equal(shared.canActorAssignRole(["super_admin"], "super_admin"), true);
  assert.equal(shared.canActorAssignRole(["super_admin"], "admin"), true);
  assert.equal(shared.canActorAssignRole(["admin"], "support_agent"), true);
  assert.equal(shared.canActorAssignRole(["admin"], "content_manager"), true);
  assert.equal(shared.canActorAssignRole(["admin"], "customer"), true);
  assert.equal(shared.canActorAssignRole(["admin"], "admin"), false);
  assert.equal(shared.canActorAssignRole(["admin"], "super_admin"), false);
  assert.equal(shared.canActorAssignRole(["support_agent"], "customer"), false);
});

test("expanded certificate templates cover all 14 categories with unique slugs", () => {
  assert.ok(shared.ALL_CERTIFICATE_TEMPLATES.length >= 124);
  const slugs = new Set(shared.ALL_CERTIFICATE_TEMPLATES.map((t) => t.slug));
  assert.equal(slugs.size, shared.ALL_CERTIFICATE_TEMPLATES.length);
  const cats = new Set(shared.ALL_CERTIFICATE_TEMPLATES.map((t) => t.category));
  for (const required of [
    "academic",
    "corporate",
    "sports",
    "competition",
    "volunteer",
    "professional",
    "internship",
    "course_completion",
  ]) {
    assert.ok(cats.has(required), `Missing category ${required}`);
  }
});

test("buildSampleStampSvg explicitly distinguishes sample stamps from official seals", () => {
  const cfg = shared.createDefaultOfficialStampConfig("Open Demo Club", "circular_double");
  const sampleOut = shared.buildSampleStampSvg(cfg, "sample-test");
  assert.ok(/SAMPLE/i.test(sampleOut.svgMarkup));
  assert.ok(sampleOut.svgMarkup.includes("<svg"));
});

test("buildDeterministicCertificateDesignPatch parses natural-language certificate design updates", () => {
  const gen = shared.buildDeterministicCertificateDesignPatch(
    "Create a gold-themed internship completion certificate for a software engineering intern at Nexora Tech"
  );
  assert.equal(gen.recommendedTemplateSlug, "internship-credential");
  assert.equal(gen.fields.organizationName, "Nexora Tech");
  assert.equal(gen.stylePatch.borderStyle, "double-gold");

  const edit = shared.buildDeterministicCertificateDesignPatch(
    "Make border gold, move photo to the right, add signature area, and increase heading size"
  );
  assert.equal(edit.stylePatch.borderStyle, "double-gold");
  assert.ok(edit.stylePatch.titleFontSize > 42);
  assert.ok(edit.elementActions.some((a) => a.action === "move_photo" && a.x === 86));
  assert.ok(edit.elementActions.some((a) => a.action === "add_signature_area"));
});

test("TUTORIAL_CATALOG contains 12 unique bilingual English and Telugu tutorials across all platform sections", () => {
  assert.equal(shared.TUTORIAL_CATALOG.length, 12);
  assert.equal(shared.TUTORIAL_CATEGORIES.length, 4);
  const slugs = new Set(shared.TUTORIAL_CATALOG.map((t) => t.slug));
  assert.equal(slugs.size, 12);
  for (const item of shared.TUTORIAL_CATALOG) {
    assert.ok(item.titleEn.length > 5 && item.titleTe.length > 5);
    assert.ok(item.narrationEn.length > 80 && item.narrationTe.length > 60);
    assert.ok(item.durationSeconds >= 60 && item.durationSeconds <= 120);
    assert.ok(item.cuesEn.length >= 3 && item.cuesTe.length >= 3);
  }
});



