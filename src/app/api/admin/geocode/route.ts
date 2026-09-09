import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";

// Nominatim's usage policy allows ~1 request/sec and requires a
// descriptive User-Agent identifying the app — this key is fixed
// (not per-IP) since the goal is protecting the single outbound call to
// Nominatim from exceeding its own policy, not preventing multi-user abuse
// (there's only one admin). The debounce on the client already cuts down
// how often this fires; this is a second line of defense.
const GEOCODE_RATE_LIMIT = { max: 5, windowMs: 5_000 };

const querySchema = z.object({ q: z.string().trim().min(2).max(200) });

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") });
  if (!parsed.success) return NextResponse.json({ results: [] });

  const { allowed } = checkRateLimit("geocode", GEOCODE_RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limited, try again shortly" },
      { status: 429 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("format", "json");
  nominatimUrl.searchParams.set("q", parsed.data.q);
  nominatimUrl.searchParams.set("limit", "8");
  nominatimUrl.searchParams.set("accept-language", "en");

  const res = await fetch(nominatimUrl, {
    headers: { "User-Agent": `photo-gallery (${siteUrl})` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding lookup failed" }, { status: 502 });
  }

  const raw = (await res.json()) as NominatimResult[];
  const results = raw.map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));

  return NextResponse.json({ results });
}
