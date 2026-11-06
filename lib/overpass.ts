import type { Place } from "./types";

export type Category = "food" | "sights" | "stay";

export const CATEGORIES: { id: Category; label: string; filter: string }[] = [
  { id: "food", label: "Food & drink", filter: '["amenity"~"^(restaurant|cafe|bar)$"]' },
  { id: "sights", label: "Sights", filter: '["tourism"~"^(attraction|museum|viewpoint|gallery)$"]' },
  { id: "stay", label: "Hotels", filter: '["tourism"~"^(hotel|hostel|guest_house)$"]' },
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

export async function findPlaces(category: Category, bounds: Bounds): Promise<Place[]> {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const query = `[out:json][timeout:20];nwr${cat.filter}["name"](${bbox});out center 40;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error("Overpass error " + res.status);

  const data = await res.json();
  const places: Place[] = [];

  for (const el of data.elements as OverpassElement[]) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    if (lat === undefined || lon === undefined || !tags.name) continue;

    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    places.push({
      id: `${el.type}-${el.id}`,
      name: tags.name,
      category: prettify(tags.amenity ?? tags.tourism ?? "place"),
      address: street || undefined,
      lat,
      lon,
    });
  }
  return places;
}
