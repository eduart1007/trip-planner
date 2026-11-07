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

// ---- Levels ----
export const RANKS = [
  { emoji: "🎒" },
  { emoji: "🧭" },
  { emoji: "🗺️" },
  { emoji: "🥾" },
  { emoji: "🔥" },
  { emoji: "🌍" },
  { emoji: "⛵" },
  { emoji: "👑" },
];

// After this level the rank stays "Legend" and only the level number grows
export const MAX_NAMED_LEVEL = RANKS.length;

const CAR = POINTS_PER_KM.car;

// Points needed to reach a level, measured in kilometres driven (1 km by car = 10 points):
// level 2 = 10,000 km, level 3 = 25,000 km, level 4 = 50,000 km, then +50,000 km per level
export function pointsForLevel(level: number) {
  if (level <= 1) return 0;
  if (level === 2) return 10000 * CAR;
  if (level === 3) return 25000 * CAR;
  return (level - 3) * 50000 * CAR;
}

function rankFor(level: number) {
  const index = Math.min(level, MAX_NAMED_LEVEL) - 1;
  return { emoji: RANKS[index].emoji, name: t(`rank${index}` as TKey) };
}

export function getLevel(points: number) {
  let level = 1;
  while (points >= pointsForLevel(level + 1)) level++;
  const start = pointsForLevel(level);
  const end = pointsForLevel(level + 1);
  return {
    level,
    rank: rankFor(level),
    next: { level: level + 1, ...rankFor(level + 1) },
    fraction: (points - start) / (end - start),
    toNext: end - points,
  };
}

// ---- Saved progress (kept in this browser for now) ----
export type Progress = {
  points: number;
  stops: number;
  trips: number;
  walkedMeters: number;
  streak: number; // days in a row
  bestStreak: number;
  lastDay: string; // last day you reached a stop, as 2026-11-07
};

export const EMPTY_PROGRESS: Progress = {
  points: 0,
  stops: 0,
  trips: 0,
  walkedMeters: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: "",
};

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


// ---- Streaks ----
// Today as "2026-11-07" (your local date)
export function todayKey(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function dayBefore(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
}

// Counts today as a travel day (you reached a stop): +1 if you travelled yesterday too, otherwise it starts again at 1
export function withStreak(progress: Progress, today: string): Progress {
  if (progress.lastDay === today) return progress;
  const streak = progress.lastDay === dayBefore(today) ? progress.streak + 1 : 1;
  return {
    ...progress,
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    lastDay: today,
  };
}

// The streak you have right now (it ends if you missed yesterday)
export function activeStreak(progress: Progress, today = todayKey()) {
  return progress.lastDay === today || progress.lastDay === dayBefore(today) ? progress.streak : 0;
}
