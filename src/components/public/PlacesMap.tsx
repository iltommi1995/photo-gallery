"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import { useRouter } from "next/navigation";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

export type MapPlace = {
  slug: string;
  name: string;
  photoCount: number;
  lat: number;
  lng: number;
};

type PlacesMapProps = {
  places: MapPlace[];
};

// A plain colored dot instead of Leaflet's default marker icon — sidesteps
// the well-known bundler-asset-path issue with the default icon images,
// and reads closer to this site's minimal red-accent identity.
const markerIcon = divIcon({
  className: "",
  html: '<span class="block size-3 rounded-full bg-portfolio-accent ring-2 ring-portfolio-paper" style="box-shadow: 0 1px 3px rgb(0 0 0 / 40%)"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Leaflet measures its container's pixel size once, synchronously, when
// the map is created. The map's own wrapper height here is resolved by
// flexbox (fills the viewport in portrait mobile — see globals.css/
// PlacesView.tsx), which can still be 0 at that exact moment if the
// browser hasn't finished the flex layout pass yet, leaving Leaflet
// permanently convinced the map is 0x0 (blank, no tiles) until
// something forces a re-measure. invalidateSize() does that re-measure
// — once after mount (layout has settled by then) and again on resize
// (covers rotating the phone, or the RotateDeviceNotice banner
// dismissing and changing the available height).
function MapSizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map]);
  return null;
}

/**
 * World map of every place with at least one geotagged photo — a
 * lat/lng only comes from a photo's own EXIF GPS or a manually picked
 * geocoded location (see LocationAutocomplete), so places with neither
 * simply don't appear here (they still show fine in the list view).
 */
export function PlacesMap({ places }: PlacesMapProps) {
  const router = useRouter();

  if (places.length === 0) {
    return (
      <p className="text-portfolio-ink/60 text-sm">
        No geotagged photos yet — add a location to a photo to see it here.
      </p>
    );
  }

  return (
    // isolate: Leaflet's own panes/controls use z-index up to 1000
    // (leaflet.css), which otherwise compete in the page's global
    // stacking order and can end up above fixed UI like the site nav's
    // fullscreen menu. Isolating creates a local stacking context so
    // those values stay contained to the map itself.
    <div className="isolate h-full w-full overflow-hidden rounded-lg gallery-wide:h-[70vh]">
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom className="h-full w-full">
        <MapSizeInvalidator />
        {/*
          CARTO's free "Positron" basemap now requires an API key (a
          policy change after this was first wired up) — plain OSM tiles
          stay keyless, with a grayscale filter (className below, styled
          in globals.css) to keep the muted look this site wants instead
          of OSM's default colorful style.
        */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="grayscale-map-tiles"
        />
        {places.map((place) => (
          <Marker
            key={place.slug}
            position={[place.lat, place.lng]}
            icon={markerIcon}
            eventHandlers={{
              click: () => router.push(`/places/${encodeURIComponent(place.slug)}`),
            }}
          >
            <Tooltip
              permanent
              direction="right"
              offset={[8, 0]}
              opacity={1}
              className="place-map-label"
            >
              {place.name}
            </Tooltip>
            <Popup>
              <span className="font-medium">{place.name}</span>
              <br />
              {place.photoCount} {place.photoCount === 1 ? "photo" : "photos"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
