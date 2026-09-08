import { ImageResponse } from "next/og";

// Manifest icon sizes (src/app/manifest.ts) — kept as their own route
// (rather than Next's icon.tsx convention, which is a single fixed size
// and appends a build hash to its URL) so the manifest can reference a
// stable, predictable path per size.
const SIZES = { "192": 192, "512": 512, "512-maskable": 512 } as const;
type Size = keyof typeof SIZES;

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!(size in SIZES)) return new Response("Not found", { status: 404 });

  const px = SIZES[size as Size];
  // Maskable icons get masked to a shape (circle, squircle, ...) by the OS,
  // which crops toward the center — pad the glyph well inside that "safe
  // zone" so it isn't clipped. Non-maskable icons only need enough padding
  // to not touch the edge.
  const isMaskable = size === "512-maskable";
  const glyphSize = Math.round(px * (isMaskable ? 0.42 : 0.58));

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
      <div
        style={{
          fontSize: glyphSize,
          fontWeight: 700,
          color: "#c0392b",
          fontFamily: "sans-serif",
          lineHeight: 1,
        }}
      >
        T
      </div>
    </div>,
    { width: px, height: px },
  );
}
