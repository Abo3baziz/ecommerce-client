import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Storefront — General Supply";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f6f4ef",
          border: "16px solid #0f172a",
          padding: 48,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, letterSpacing: 3, color: "#475569" }}>
          <span>GENERAL CATALOG</span>
          <span>BROWSE · CART · CHECKOUT</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 0.95, letterSpacing: -2, color: "#0f172a", textTransform: "uppercase" }}>
            Storefront
          </div>
          <div style={{ fontSize: 22, color: "#475569", maxWidth: 760 }}>
            Curated catalog, fast checkout, server-authoritative pricing.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 28, background: "repeating-linear-gradient(to right, #0f172a 0 2px, transparent 2px 5px, #0f172a 5px 6px, transparent 6px 11px)" }} />
          <span style={{ fontSize: 14, letterSpacing: 2, color: "#475569" }}>SF · GENERAL CATALOG</span>
        </div>
      </div>
    ),
    size,
  );
}
