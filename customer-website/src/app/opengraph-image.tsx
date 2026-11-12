import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Francis Creator Studio — AI Resume Builder, Certificate Studio & QR Verification";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #042f2e 0%, #0f172a 55%, #083344 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                background: "linear-gradient(135deg, #0d9488, #0f766e)",
                border: "2px solid #5eead4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              F
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 3,
                  color: "#5eead4",
                }}
              >
                FRANCIS CREATOR STUDIO
              </span>
              <span style={{ fontSize: 15, color: "#cbd5e1", marginTop: 4 }}>
                Create Your Future. Design Your Identity.
              </span>
            </div>
          </div>

          <div
            style={{
              borderRadius: 999,
              border: "1px solid rgba(251,191,36,0.5)",
              background: "rgba(251,191,36,0.12)",
              padding: "8px 20px",
              fontSize: 16,
              fontWeight: 700,
              color: "#fde68a",
            }}
          >
            Free & Open-Source • MIT
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "960px" }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: -1,
              color: "#ffffff",
            }}
          >
            AI Resume Builder, Certificate Studio &amp; QR Verification
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 24,
              lineHeight: 1.4,
              color: "#cbd5e1",
            }}
          >
            100 ATS resume templates, 124 certificate designs across 14 categories, Creator AI
            guidance, private Document Vault, and live online certificate verification.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.14)",
            paddingTop: 24,
            fontSize: 18,
            color: "#94a3b8",
          }}
        >
          <span>francis-creator-studio.vercel.app</span>
          <span style={{ color: "#5eead4", fontWeight: 700 }}>
            English &amp; Telugu Tutorials Included
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
