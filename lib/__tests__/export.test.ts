import { describe, expect, it } from "vitest";
import { buildIcs } from "../export";
import { computeSchedule } from "../schedule";
import type { Place } from "../types";

const place = (id: string): Place => ({ id, name: id, category: "test", lat: 1, lon: 2 });

describe("buildIcs", () => {
  it("makes one calendar event per stop", () => {
    const stops = [place("a"), place("b")];
    const schedule = computeSchedule({
      stops,
      hasHome: false,
      legSeconds: [600],
      startAt: 9 * 3600,
      arrivals: {},
    });
    const ics = buildIcs(stops, schedule);

    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics).toContain("END:VCALENDAR");
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(ics).toContain("SUMMARY:1. a");
  });
});
