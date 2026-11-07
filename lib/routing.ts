import { t, type TKey } from "./i18n";
import { getSettings } from "./settings";

export type TravelMode = "foot" | "bike" | "car";

export const MODES: { id: TravelMode; label: string; icon: string }[] = [
  { id: "foot", label: "Walk", icon: "🚶" },
  { id: "bike", label: "Bike", icon: "🚲" },
  { id: "car", label: "Drive", icon: "🚗" },
];

export type Leg = { distance: number; duration: number }; // metres, seconds

// One turn-by-turn instruction, with the place where it happens
export type Step = { text: string; arrive: boolean; distance: number; lat: number; lon: number };

export type RouteResult = {
  path: [number, number][]; // [lat, lon] points of the line to draw
  legs: Leg[]; // one per pair of stops: 1 to 2, 2 to 3, ...
  steps: Step[]; // only filled when steps are requested
  distance: number;
  duration: number;
};

// The travel mode is chosen by the server address, not by the URL path
const SERVERS: Record<TravelMode, string> = {
  foot: "https://routing.openstreetmap.de/routed-foot",
  bike: "https://routing.openstreetmap.de/routed-bike",
  car: "https://routing.openstreetmap.de/routed-car",
};

type OsrmStep = {
  distance: number;
  name: string;
  maneuver: { type: string; modifier?: string; location: [number, number] };
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
  legs: { distance: number; duration: number; steps?: OsrmStep[] }[];
};

const TURN_KEYS: Record<string, TKey> = {
  left: "turnLeft",
  right: "turnRight",
  "slight left": "bearLeft",
  "slight right": "bearRight",
  "sharp left": "sharpLeft",
  "sharp right": "sharpRight",
};

// Turns a step from the routing service into a sentence in the chosen language
function describeStep(step: OsrmStep) {
  const { type, modifier } = step.maneuver;
  const onto = step.name ? ` ${t("onto", { road: step.name })}` : "";

  if (type === "arrive") return t("youArrived");
  if (type === "depart") return step.name ? t("headAlong", { road: step.name }) : t("startMoving");
  if (type === "roundabout" || type === "rotary") return `${t("roundabout")}${onto}`;
  if (type === "exit roundabout" || type === "exit rotary") return `${t("leaveRoundabout")}${onto}`;
  if (modifier === "uturn") return t("uturn");
  if (modifier && TURN_KEYS[modifier]) return `${t(TURN_KEYS[modifier])}${onto}`;
  return step.name ? t("continueOn", { road: step.name }) : t("continueStraight");
}

export async function getRoute(
  points: { lat: number; lon: number }[],
  mode: TravelMode,
  withSteps = false
): Promise<RouteResult> {
  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `${SERVERS[mode]}/route/v1/driving/${coords}?overview=full&geometries=geojson${
    withSteps ? "&steps=true" : ""
  }`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing error " + res.status);

  const data: { code: string; routes?: OsrmRoute[] } = await res.json();
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error("No route found");

  return {
    path: route.geometry.coordinates.map(([lon, lat]): [number, number] => [lat, lon]),
    legs: route.legs.map((l) => ({ distance: l.distance, duration: l.duration })),
    steps: route.legs.flatMap((l) =>
      (l.steps ?? []).map((s) => ({
        text: describeStep(s),
        arrive: s.maneuver.type === "arrive",
        distance: s.distance,
        lat: s.maneuver.location[1],
        lon: s.maneuver.location[0],
      }))
    ),
    distance: route.distance,
    duration: route.duration,
  };
}

export function formatDistance(meters: number) {
  if (getSettings().units === "mi") {
    const feet = meters * 3.28084;
    return feet < 500 ? `${Math.round(feet / 10) * 10} ft` : `${(meters / 1609.344).toFixed(1)} mi`;
  }
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
