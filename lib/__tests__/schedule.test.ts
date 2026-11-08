import { describe, expect, it } from "vitest";
import { computeSchedule, formatClock, toSeconds } from "../schedule";
import type { Place } from "../types";

const stop = (id: string, extra: Partial<Place> = {}): Place => ({
  id,
  name: id,
  category: "test",
  lat: 0,
  lon: 0,
  ...extra,
});

const nine = 9 * 3600;
const legs = [900, 900]; // 15 minutes each

describe("toSeconds and formatClock", () => {
  it("reads HH:MM", () => {
    expect(toSeconds("14:30")).toBe(14 * 3600 + 30 * 60);
    expect(toSeconds(undefined)).toBeNull();
    expect(toSeconds("")).toBeNull();
  });

  it("shows times as HH:MM and marks the next day", () => {
    expect(formatClock(nine)).toBe("09:00");
    expect(formatClock(25 * 3600)).toBe("01:00 +1d");
  });
});

describe("computeSchedule", () => {
  it("adds travel time and stay time", () => {
    const s = computeSchedule({
      stops: [stop("a"), stop("b")],
      hasHome: true,
      legSeconds: legs,
      startAt: nine,
      arrivals: {},
    });
    expect(s.items[0].arriveAt).toBe(nine + 900); // 09:15
    expect(s.items[0].departAt).toBe(nine + 900 + 30 * 60); // 09:45
    expect(s.items[1].arriveAt).toBe(nine + 900 + 1800 + 900); // 10:00
    expect(s.endAt).toBe(nine + 900 + 1800 + 900 + 1800); // 10:30
  });

  it("leaves at 09:45 for a 15 minute trip to a 10:00 appointment", () => {
    const s = computeSchedule({
      stops: [stop("a", { arriveBy: "10:00" })],
      hasHome: true,
      legSeconds: [900],
      startAt: nine,
      arrivals: {},
    });
    expect(s.items[0].leaveAt).toBe(9 * 3600 + 45 * 60);
    expect(s.items[0].arriveAt).toBe(10 * 3600);
  });

  it("waits and leaves later when the set time is far away", () => {
    const s = computeSchedule({
      stops: [stop("a"), stop("b", { arriveBy: "11:00" })],
      hasHome: true,
      legSeconds: legs,
      startAt: nine,
      arrivals: {},
    });
    expect(s.items[1].leaveAt).toBe(11 * 3600 - 900);
    expect(s.items[1].arriveAt).toBe(11 * 3600);
    expect(s.items[1].lateBySeconds).toBe(0);
  });

  it("reports lateness", () => {
    const s = computeSchedule({
      stops: [stop("a"), stop("b", { arriveBy: "09:50" })],
      hasHome: true,
      legSeconds: legs,
      startAt: nine,
      arrivals: {},
    });
    expect(s.items[1].lateBySeconds).toBe(600);
  });

  it("rounds travel time up to whole minutes", () => {
    const s = computeSchedule({
      stops: [stop("a")],
      hasHome: true,
      legSeconds: [61],
      startAt: nine,
      arrivals: {},
    });
    expect(s.items[0].travelSeconds).toBe(120);
  });

  it("moves the plan when you are running late", () => {
    const s = computeSchedule({
      stops: [stop("a")],
      hasHome: true,
      legSeconds: [900],
      startAt: nine,
      arrivals: {},
      delaySeconds: 600,
    });
    expect(s.items[0].arriveAt).toBe(nine + 600 + 900);
  });

  it("follows the real arrival time", () => {
    const s = computeSchedule({
      stops: [stop("a"), stop("b")],
      hasHome: true,
      legSeconds: legs,
      startAt: nine,
      arrivals: { a: nine + 600 },
    });
    expect(s.items[0].arriveAt).toBe(nine + 600);
    expect(s.items[1].leaveAt).toBe(nine + 600 + 1800);
    expect(s.items[1].arriveAt).toBe(nine + 600 + 1800 + 900);
  });
});
