import { distanceMeters } from "./geo";
import { t, type TKey } from "./i18n";
import type { Place } from "./types";

export type Category =
  | "food"
  | "sights"
  | "stay"
  | "toilets"
  | "pharmacy"
  | "atm"
  | "water"
  | "hospital";

// needsName: false means places without a name are shown too (toilets, ATMs, ...)
export const CATEGORIES: { id: Category; label: string; filter: string; needsName: boolean }[] = [
  { id: "food", label: "Food & drink", filter: '["amenity"~"^(restaurant|cafe|bar)$"]', needsName: true },
  { id: "sights", label: "Sights", filter: '["tourism"~"^(attraction|museum|viewpoint|gallery)$"]', needsName: true },
  { id: "stay", label: "Hotels", filter: '["tourism"~"^(hotel|hostel|guest_house)$"]', needsName: true },
  { id: "toilets", label: "Toilets", filter: '["amenity"="toilets"]', needsName: false },
  { id: "pharmacy", label: "Pharmacy", filter: '["amenity"="pharmacy"]', needsName: false },
  { id: "atm", label: "ATM", filter: '["amenity"="atm"]', needsName: false },
  { id: "water", label: "Drinking water", filter: '["amenity"="drinking_water"]', needsName: false },
  { id: "hospital", label: "Hospital", filter: '["amenity"~"^(hospital|clinic)$"]', needsName: false },
];

type Bounds = { south: number; west: number; north: number; east: number };

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export function prettify(text: string) {
  const spaced = text.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

async function post(query: string): Promise<OverpassElement[]> {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error("Overpass error " + res.status);
  const data = await res.json();
  return data.elements as OverpassElement[];
}

function toPlaces(elements: OverpassElement[], fallbackName?: string): Place[] {
  const places: Place[] = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    const name = tags.name ?? fallbackName;
    if (lat === undefined || lon === undefined || !name) continue;

    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    places.push({
      id: `${el.type}-${el.id}`,
      name,
      category: prettify(tags.amenity ?? tags.tourism ?? "place"),
      address: street || undefined,
      openingHours: tags.opening_hours,
      lat,
      lon,
    });
  }
  return places;
}

// Places of one kind in the part of the map you are looking at
export async function findPlaces(category: Category, bounds: Bounds): Promise<Place[]> {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const nameFilter = cat.needsName ? '["name"]' : "";
  const query = `[out:json][timeout:20];nwr${cat.filter}${nameFilter}(${bbox});out center 40;`;

  // Places without a name are shown with their category, without the emoji
  const fallback = cat.needsName ? undefined : t(`cat_${category}` as TKey).replace(/^\S+\s/, "");
  return toPlaces(await post(query), fallback);
}

// Popular places around a point: landmarks and museums, nearest first
export async function findSuggestions(center: { lat: number; lon: number }): Promise<Place[]> {
  const base = '["tourism"~"^(attraction|museum|viewpoint|gallery)$"]["name"]';
  const around = `(around:2500,${center.lat},${center.lon})`;

  // Places with a Wikipedia entry are usually the well-known ones
  let places = toPlaces(await post(`[out:json][timeout:20];nwr${base}["wikidata"]${around};out center 30;`));

  if (places.length < 4) {
    const more = toPlaces(await post(`[out:json][timeout:20];nwr${base}${around};out center 30;`));
    const known = new Set(places.map((p) => p.id));
    places = [...places, ...more.filter((p) => !known.has(p.id))];
  }

  return places
    .sort((a, b) => distanceMeters(center, a) - distanceMeters(center, b))
    .slice(0, 10);
}
