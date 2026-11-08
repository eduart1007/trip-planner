import type { Badge } from "./badges";
import type { TravelMode } from "./routing";

export type TripSummaryData = {
  stops: { name: string; arrivedAt?: number; plannedAt?: number }[]; // seconds since midnight
  meters: number;
  elapsedSeconds: number;
  points: number;
  mode: TravelMode;
  newBadges: Badge[];
  levelAtStart: number;
};

export type PlanComparison = { kind: "early" | "onTime" | "late"; minutes: number };

// Compares when you really arrived with the plan (2 minutes either way counts as on time)
export function compareToPlan(arrivedAt: number, plannedAt: number): PlanComparison {
  const diff = arrivedAt - plannedAt;
  if (Math.abs(diff) <= 120) return { kind: "onTime", minutes: 0 };
  return { kind: diff < 0 ? "early" : "late", minutes: Math.round(Math.abs(diff) / 60) };
}
