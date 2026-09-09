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
        <PlacesMap places={mapPlaces} />
      )}
    </div>
  );
}
