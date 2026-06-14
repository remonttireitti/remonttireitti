import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — kilpailuta remontti ja palvelut`;
export const size = { width: 1200, height: 630 };
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
          padding: "64px 72px",
          background: "linear-gradient(135deg, #f0f9ff 0%, #fff7ed 55%, #ffffff 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "#0c4a6e",
                letterSpacing: "-0.02em",
              }}
            >
              {siteConfig.name}
            </div>
            <div style={{ fontSize: 26, color: "#57534e" }}>
              Remontit · palvelut · huolto · tori
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#1c1917",
              letterSpacing: "-0.02em",
            }}
          >
            Kilpailuta remontti ja palvelut ilmaiseksi
          </div>
          <div style={{ fontSize: 26, lineHeight: 1.45, color: "#44403c" }}>
            Keittiö, lämmitys, siivous, piha, muutto — myös jatkuva kunnossapito.
            Vertaa tarjouksia ja valitse tekijä.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {["Ilmainen asiakkaalle", "Vertaa tarjouksia", "Remonttitori"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "12px 22px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid #bae6fd",
                  color: "#0369a1",
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
