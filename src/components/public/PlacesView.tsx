"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  IndexScrollGrid,
  type IndexScrollItem,
} from "@/components/public/IndexScrollGrid";
import type { MapPlace } from "@/components/public/PlacesMap";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Leaflet touches `window` at module load time, which breaks Next.js's
// server render pass even inside a "use client" file (client components
// still render once on the server for the initial HTML) — ssr: false
// defers loading it to the browser entirely, only once the Map tab is
// actually selected.
const PlacesMap = dynamic(
  () => import("@/components/public/PlacesMap").then((m) => m.PlacesMap),
  {
    ssr: false,
    loading: () => <p className="text-portfolio-ink/60 text-sm">Loading map…</p>,
  },
);

type PlacesViewProps = {
  items: IndexScrollItem[];
  mapPlaces: MapPlace[];
  emptyMessage: string;
};

export function PlacesView({ items, mapPlaces, emptyMessage }: PlacesViewProps) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={view} onValueChange={(value) => setView(value as "list" | "map")}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>
      </Tabs>
      {view === "list" ? (
        <IndexScrollGrid items={items} emptyMessage={emptyMessage} />
      ) : (
        // data-gallery-view drops .portfolio-content's reserved left rail
        // (see globals.css) — a map wants full width, unlike the List
        // view's indented reading column.
        //
        // Height: a flex-1/min-h-0 fill chain up through <main> looked
        // right but left the map permanently blank on a real phone —
        // Leaflet measures its container's pixel size once, synchronously,
        // at mount, and flexbox needs a second layout pass (after <main>'s
        // min-height clamp resolves) to actually grow this div, which can
        // still read as 0 at that exact moment. A direct dvh-based calc()
        // is resolved in the first layout pass, no second pass or race —
        // 11rem/12rem below is <main>'s own pt-24/sm:pt-28 + its bottom
        // portfolio-gutter (1.5rem) + this gap (gap-6, 1.5rem) + the Tabs
        // row (h-8, 2rem). gallery-wide is excluded: PlacesMap sets its
        // own fixed 70vh there regardless of this wrapper's height.
        <div
          data-gallery-view
          className="h-[calc(100dvh-11rem)] sm:h-[calc(100dvh-12rem)] gallery-wide:h-auto"
        >
          <PlacesMap places={mapPlaces} />
        </div>
      )}
    </div>
  );
}
