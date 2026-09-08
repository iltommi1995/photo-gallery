import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS "Add to Home Screen" icon — Safari reads this via <link
// rel="apple-touch-icon">, not the web manifest (iOS ignores its icons).
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111111",
      }}
    >
      <div style={{ fontSize: 104, fontWeight: 700, color: "#c0392b" }}>T</div>
    </div>,
    size,
  );
}
