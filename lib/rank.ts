import { t, type TKey } from "./i18n";
import type { TravelMode } from "./routing";

// ---- Points ----
export const POINTS_PER_KM: Record<TravelMode, number> = {
  foot: 100, // walking earns the most
  bike: 50,
  car: 10,
};
export const STOP_BONUS = 20; // for every stop you reach
export const TRIP_BONUS = 50; // for finishing a trip without skipping a stop
export const MIN_LEG_METERS = 50; // you must travel at least this far to earn points

export function pointsForLeg(meters: number, mode: TravelMode) {
  if (meters < MIN_LEG_METERS) return 0;
  return STOP_BONUS + Math.round((meters / 1000) * POINTS_PER_KM[mode]);
}

// ---- Ranks ----
export const RANKS = [
  { name: "Tripper", emoji: "🎒", min: 0 },
  { name: "Wanderer", emoji: "🧭", min: 150 },
  { name: "Explorer", emoji: "🗺️", min: 400 },
  { name: "Pathfinder", emoji: "🥾", min: 900 },
  { name: "Trailblazer", emoji: "🔥", min: 1800 },
  { name: "Globetrotter", emoji: "🌍", min: 3500 },
  { name: "Voyager", emoji: "⛵", min: 7000 },
  { name: "Legend", emoji: "👑", min: 15000 },
];

export function getLevel(points: number) {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (points >= r.min) index = i;
  });
  const rank = { ...RANKS[index], name: t(`rank${index}` as TKey) };
  const nextBase = RANKS[index + 1];
  const next = nextBase ? { ...nextBase, name: t(`rank${index + 1}` as TKey) } : null;
  return {
    level: index + 1,
    rank,
    next,
    fraction: next ? (points - rank.min) / (next.min - rank.min) : 1,
    toNext: next ? next.min - points : 0,
  };
}

// ---- Saved progress (kept in this browser for now) ----
export type Progress = {
  points: number;
  stops: number;
  trips: number;
  walkedMeters: number;
};

export const EMPTY_PROGRESS: Progress = { points: 0, stops: 0, trips: 0, walkedMeters: 0 };

const STORAGE_KEY = "trip-planner-progress-v1";

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_PROGRESS, ...JSON.parse(raw) };
  } catch {
    // ignore and start fresh
  }
  return EMPTY_PROGRESS;
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage may be unavailable
  }
}
