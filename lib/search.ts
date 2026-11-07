import { prettify } from "./overpass";
import type { Place } from "./types";

type NominatimResult = {
  place_id: number;
  name: string;
  type: string;
  display_name: string;
  lat: string;
  lon: string;
  extratags?: { opening_hours?: string };
};

// Finds places by name; places near the point you give come first
export async function searchPlaces(
  query: string,
  near?: { lat: number; lon: number }
): Promise<Place[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    extratags: "1",
    limit: "5",
    q: query,
  });
  if (near) {
    const d = 0.5;
    params.set("viewbox", `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`);
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!res.ok) throw new Error("Search error " + res.status);
  const data: NominatimResult[] = await res.json();

  return data.map((r) => ({
    id: String(r.place_id),
    name: r.name || r.display_name.split(",")[0],
    category: prettify(r.type),
    address: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    openingHours: r.extratags?.opening_hours,
  }));
}
