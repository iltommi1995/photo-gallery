import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Browser tab favicon — same mark as the PWA icons (src/app/icons/[size]),
// generated separately since this one is Next's own icon.tsx convention
// (auto-linked into <head>, its own fixed size).
export default function Icon() {
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
      <div style={{ fontSize: 20, fontWeight: 700, color: "#c0392b" }}>T</div>
    </div>,
    size,
  );
}
