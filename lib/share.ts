import type { TravelMode } from "./routing";
import type { Place } from "./types";

// What a shared link contains. The start point is left out on purpose (privacy).
export type SharedPlan = {
  trip: Place[];
  startTime: string;
  mode: TravelMode;
};

// A place as a short list: [id, name, category, lat, lon, stayMinutes, arriveBy]
type Row = [string, string, string, number, number, number | null, string | null];

const MODES: TravelMode[] = ["foot", "bike", "car"];

function round5(n: number) {
  return Math.round(n * 100000) / 100000;
}

function toRow(p: Place): Row {
  return [p.id, p.name, p.category, round5(p.lat), round5(p.lon), p.stayMinutes ?? null, p.arriveBy ?? null];
}

function fromRow(row: unknown): Place | null {
  if (!Array.isArray(row) || row.length < 5) return null;
  const [id, name, category, lat, lon, stay, arriveBy] = row;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const place: Place = {
    id: String(id).slice(0, 60),
    name: String(name).slice(0, 120),
    category: String(category).slice(0, 60),
    lat,
    lon,
  };
  if (typeof stay === "number" && stay >= 0 && stay <= 1440) place.stayMinutes = stay;
  if (typeof arriveBy === "string" && /^\d{2}:\d{2}$/.test(arriveBy)) place.arriveBy = arriveBy;
  return place;
}

// Text <-> a URL-safe code
function encode(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(code: string) {
  const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(plan: SharedPlan) {
  const payload = { s: plan.trip.map(toRow), t: plan.startTime, m: plan.mode };
  return `${window.location.origin}${window.location.pathname}#trip=${encode(JSON.stringify(payload))}`;
}

// Reads a shared trip from the address, if there is one
function readHash(): SharedPlan | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith("#trip=")) return null;

    const payload = JSON.parse(decode(hash.slice("#trip=".length)));
    if (!payload || !Array.isArray(payload.s)) return null;

    const trip: Place[] = payload.s
      .slice(0, 30)
      .map(fromRow)
      .filter((p: Place | null): p is Place => p !== null);
    if (trip.length === 0) return null;

    const startTime =
      typeof payload.t === "string" && /^\d{2}:\d{2}$/.test(payload.t) ? payload.t : "09:00";
    const mode: TravelMode = MODES.includes(payload.m) ? payload.m : "foot";
    return { trip, startTime, mode };
  } catch {
    return null;
  }
}

let decided: SharedPlan | null | undefined;

// Returns the shared trip to open (asking first if you already have stops), once per page load
export function consumeSharedPlan(hasPlan: boolean, question: string): SharedPlan | null {
  if (decided !== undefined) return decided;
  const shared = readHash();
  decided = shared && (!hasPlan || window.confirm(question)) ? shared : null;
  return decided;
}
