import { describe, expect, it } from "vitest";
import { optimizeOrder } from "../optimize";
import type { Place } from "../types";

const place = (id: string, lon: number, extra: Partial<Place> = {}): Place => ({
  id,
  name: id,
  category: "test",
  lat: 0,
  lon,
  ...extra,
});

describe("optimizeOrder", () => {
  it("puts the stops in the shortest order from the start", () => {
    const stops = [place("far", 0.03), place("near", 0.01), place("middle", 0.02)];
    const { order, savedMeters } = optimizeOrder(stops, { lat: 0, lon: 0 });
    expect(order.map((p) => p.id)).toEqual(["near", "middle", "far"]);
    expect(savedMeters).toBeGreaterThan(1000);
  });

  it("keeps stops with set times in time order", () => {
    const stops = [
      place("first-far", 0.03, { arriveBy: "09:00" }),
      place("second-near", 0.01, { arriveBy: "12:00" }),
    ];
    const { order, savedMeters } = optimizeOrder(stops, { lat: 0, lon: 0 });
    expect(order.map((p) => p.id)).toEqual(["first-far", "second-near"]);
    expect(savedMeters).toBe(0);
  });

  it("leaves a single stop alone", () => {
    expect(optimizeOrder([place("a", 0.01)], null).order).toHaveLength(1);
  });
});
