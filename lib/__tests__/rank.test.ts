import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS,
  activeStreak,
  getLevel,
  pointsForLeg,
  pointsForLevel,
  todayKey,
  withStreak,
} from "../rank";

describe("points", () => {
  it("gives nothing for tiny distances", () => {
    expect(pointsForLeg(40, "foot")).toBe(0);
  });

  it("gives more for walking than for driving", () => {
    expect(pointsForLeg(1000, "foot")).toBe(120);
    expect(pointsForLeg(2000, "car")).toBe(40);
    expect(pointsForLeg(1000, "foot")).toBeGreaterThan(pointsForLeg(1000, "bike"));
    expect(pointsForLeg(1000, "bike")).toBeGreaterThan(pointsForLeg(1000, "car"));
  });
});

describe("levels", () => {
  it("needs 10,000 km by car for level 2, then 25,000, 50,000 and every 50,000", () => {
    expect(pointsForLevel(1)).toBe(0);
    expect(pointsForLevel(2)).toBe(100000);
    expect(pointsForLevel(3)).toBe(250000);
    expect(pointsForLevel(4)).toBe(500000);
    expect(pointsForLevel(5)).toBe(1000000);
  });

  it("finds the level for any number of points", () => {
    expect(getLevel(0).level).toBe(1);
    expect(getLevel(99999).level).toBe(1);
    expect(getLevel(100000).level).toBe(2);
    expect(getLevel(499999).level).toBe(3);
    expect(getLevel(500000).level).toBe(4);
  });

  it("starts at Tripper and keeps the rank Legend after level 8", () => {
    expect(getLevel(0).rank.name).toBe("Tripper");
    expect(getLevel(0).toNext).toBe(100000);
    expect(getLevel(pointsForLevel(12)).level).toBe(12);
    expect(getLevel(pointsForLevel(12)).rank.name).toBe("Legend");
  });
});

describe("streaks", () => {
  const base = { ...EMPTY_PROGRESS, streak: 3, bestStreak: 5, lastDay: "2026-11-06" };

  it("formats a date as year-month-day", () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("continues the streak when you travel the next day", () => {
    expect(withStreak(base, "2026-11-07")).toMatchObject({
      streak: 4,
      bestStreak: 5,
      lastDay: "2026-11-07",
    });
  });

  it("starts again after a missed day", () => {
    expect(withStreak(base, "2026-11-08").streak).toBe(1);
  });

  it("does nothing twice on the same day", () => {
    expect(withStreak(base, "2026-11-06")).toBe(base);
  });

  it("works across the end of a month", () => {
    const p = { ...EMPTY_PROGRESS, streak: 1, bestStreak: 1, lastDay: "2026-10-31" };
    expect(withStreak(p, "2026-11-01").streak).toBe(2);
  });

  it("ends the current streak when you missed yesterday", () => {
    const p = { ...EMPTY_PROGRESS, streak: 4, bestStreak: 4, lastDay: "2026-11-07" };
    expect(activeStreak(p, "2026-11-07")).toBe(4);
    expect(activeStreak(p, "2026-11-08")).toBe(4);
    expect(activeStreak(p, "2026-11-09")).toBe(0);
  });
});
