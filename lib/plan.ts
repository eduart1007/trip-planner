import type { TravelMode } from "./routing";
import type { Place } from "./types";

export type SavedPlan = {
  home: Place | null;
  trip: Place[];
  startTime: string;
  mode: TravelMode;
};

const STORAGE_KEY = "trip-planner-plan-v1";

// The next full 5 minutes from now, as "HH:MM"
export function defaultStartTime() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function loadPlan(): SavedPlan {
  const fallback: SavedPlan = {
    home: null,
    trip: [],
    startTime: defaultStartTime(),
    mode: "foot",
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {
    // ignore and start with an empty plan
  }
  return fallback;
}

export function savePlan(plan: SavedPlan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // storage may be unavailable
  }
}
