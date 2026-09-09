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
    <div className="flex min-h-0 flex-1 flex-col gap-6">
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
        // view's indented reading column. min-h-0/flex-1 lets the map
        // stretch down to fill the viewport in portrait mobile instead of
        // stopping at a fixed height with dead space below it (see
        // page.tsx's matching flex/min-h-dvh on <main>).
        <div data-gallery-view className="min-h-0 flex-1">
          <PlacesMap places={mapPlaces} />
        </div>
      )}
    </div>
  );
}
