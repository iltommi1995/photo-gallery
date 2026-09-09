"use client";

import dynamic from "next/dynamic";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

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
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const handleMapReady = useCallback((map: LeafletMap) => setMapInstance(map), []);

  return (
    <div className="flex flex-col gap-6">
      {/* Fixed, aligned with the site nav's own toggle (top-6) but on the
       * right edge instead of the left — the zoom buttons (map view only)
       * sit immediately to its left in the same row, not inside the map
       * itself, so Leaflet's own zoomControl is disabled (see
       * PlacesMap's zoomControl={false}) in favor of these. z-40 keeps
       * it below the site nav's fullscreen menu (z-50 overlay, z-[60]
       * toggle) so opening the menu covers it like the rest of the page. */}
      <div className="fixed top-6 right-6 z-40 flex items-center gap-2">
        {view === "map" && mapInstance && (
          <div className="bg-portfolio-paper ring-portfolio-ink/10 flex flex-col overflow-hidden rounded-lg shadow-md ring-1">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => mapInstance.zoomIn()}
              className="text-portfolio-ink hover:bg-portfolio-ink/5 flex size-8 items-center justify-center border-b border-portfolio-ink/10"
            >
              <PlusIcon className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => mapInstance.zoomOut()}
              className="text-portfolio-ink hover:bg-portfolio-ink/5 flex size-8 items-center justify-center"
            >
              <MinusIcon className="size-4" />
            </button>
          </div>
        )}
        <Tabs value={view} onValueChange={(value) => setView(value as "list" | "map")}>
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
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
        // 7.5rem/8.5rem below is <main>'s own pt-24/sm:pt-28 + its bottom
        // portfolio-gutter (1.5rem); the List/Map toggle above is fixed
        // (out of flow) so it no longer factors into this. gallery-wide
        // is excluded: PlacesMap sets its own fixed 70vh there regardless
        // of this wrapper's height.
        <div
          data-gallery-view
          className="h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8.5rem)] gallery-wide:h-auto"
        >
          <PlacesMap places={mapPlaces} onMapReady={handleMapReady} />
        </div>
      )}
    </div>
  );
}
