import { t } from "./i18n";
import { getLevel, type Progress } from "./rank";

type Kind = "stops" | "trips" | "walk" | "streak" | "level";

export type Badge = { id: string; emoji: string; kind: Kind; n: number };

export const BADGES: Badge[] = [
  { id: "stops1", emoji: "👣", kind: "stops", n: 1 },
  { id: "stops10", emoji: "📍", kind: "stops", n: 10 },
  { id: "stops50", emoji: "🗺️", kind: "stops", n: 50 },
  { id: "stops200", emoji: "🧭", kind: "stops", n: 200 },
  { id: "trips1", emoji: "🎒", kind: "trips", n: 1 },
  { id: "trips10", emoji: "🚩", kind: "trips", n: 10 },
  { id: "walk5", emoji: "🥾", kind: "walk", n: 5 },
  { id: "walk42", emoji: "🏅", kind: "walk", n: 42 },
  { id: "walk100", emoji: "🏃", kind: "walk", n: 100 },
  { id: "streak3", emoji: "🔥", kind: "streak", n: 3 },
  { id: "streak7", emoji: "⚡", kind: "streak", n: 7 },
  { id: "streak30", emoji: "🌟", kind: "streak", n: 30 },
  { id: "level2", emoji: "⭐", kind: "level", n: 2 },
  { id: "level4", emoji: "💎", kind: "level", n: 4 },
];

export function isEarned(badge: Badge, progress: Progress) {
  switch (badge.kind) {
    case "stops":
      return progress.stops >= badge.n;
    case "trips":
      return progress.trips >= badge.n;
    case "walk":
      return progress.walkedMeters >= badge.n * 1000;
    case "streak":
      return progress.bestStreak >= badge.n;
    case "level":
      return getLevel(progress.points).level >= badge.n;
  }
}

export function earnedBadges(progress: Progress) {
  return BADGES.filter((b) => isEarned(b, progress));
}

// The badge with its emoji, in the chosen language
export function badgeLabel(badge: Badge) {
  let text: string;
  if (badge.kind === "stops") {
    text = badge.n === 1 ? t("badgeStop1") : t("badgeStops", { n: badge.n });
  } else if (badge.kind === "trips") {
    text = badge.n === 1 ? t("badgeTrip1") : t("badgeTrips", { n: badge.n });
  } else if (badge.kind === "walk") {
    text = t("badgeWalk", { n: badge.n });
  } else if (badge.kind === "streak") {
    text = t("streakDays", { n: badge.n });
  } else {
    text = t("badgeLevel", { n: badge.n });
  }
  return `${badge.emoji} ${text}`;
}
