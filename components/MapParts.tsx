"use client";

import { useEffect, useRef, type RefObject } from "react";
import L from "leaflet";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { Place } from "@/lib/types";

// Default Leaflet pins break with bundlers, so we point to the image files directly
export const pin = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Purple house for the start point
export const homeIcon = L.divIcon({
  className: "",
  html: `<div style="background:#7c3aed;color:white;width:32px;height:32px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)">🏠</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export type StopState = "todo" | "current" | "done";

// Numbered circle for stops in the trip: green = to do, orange = next, grey = reached
const iconCache: Record<string, L.DivIcon> = {};
export function stopIcon(n: number, state: StopState) {
  const key = `${n}-${state}`;
  if (!iconCache[key]) {
    const color = state === "current" ? "#f59e0b" : state === "done" ? "#9ca3af" : "#16a34a";
    iconCache[key] = L.divIcon({
      className: "",
      html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }
  return iconCache[key];
}

// Gives the main component access to the map object
export function MapBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

// Lets the user click anywhere on the map to drop a pin
export function ClickHandler({
  onPick,
  disabled,
}: {
  onPick: (lat: number, lon: number) => void;
  disabled: boolean;
}) {
  const lastPopupClose = useRef(0);
  useMapEvents({
    popupclose() {
      lastPopupClose.current = Date.now();
    },
    click(e) {
      if (disabled) return;
      // A click that only closed a popup should not drop a new pin
      if (Date.now() - lastPopupClose.current < 150) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// A pin for a place that is not in the trip yet
export function PlaceMarker({
  place,
  onAdd,
  onSetStart,
  markerRef,
}: {
  place: Place;
  onAdd: (p: Place) => void;
  onSetStart: (p: Place) => void;
  markerRef?: RefObject<L.Marker | null>;
}) {
  return (
    <Marker ref={markerRef} position={[place.lat, place.lon]} icon={pin}>
      <Popup>
        <strong>{place.name}</strong>
        <br />
        <span>{place.category}</span>
        {place.address && (
          <>
            <br />
            <span>{place.address}</span>
          </>
        )}
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onAdd(place)}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Add to trip
          </button>
          <button
            onClick={() => onSetStart(place)}
            className="rounded bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700"
          >
            Set as start
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
