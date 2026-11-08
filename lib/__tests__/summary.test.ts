import { describe, expect, it } from "vitest";
import { compareToPlan } from "../summary";

const at = (h: number, m: number) => h * 3600 + m * 60;

describe("compareToPlan", () => {
  it("counts up to 2 minutes either way as on time", () => {
    expect(compareToPlan(at(9, 16), at(9, 15)).kind).toBe("onTime");
    expect(compareToPlan(at(9, 13), at(9, 15)).kind).toBe("onTime");
    expect(compareToPlan(at(9, 17), at(9, 15)).kind).toBe("onTime");
  });

  it("reports early arrivals", () => {
    expect(compareToPlan(at(9, 12), at(9, 15))).toEqual({ kind: "early", minutes: 3 });
  });

  it("reports late arrivals", () => {
    expect(compareToPlan(at(9, 25), at(9, 15))).toEqual({ kind: "late", minutes: 10 });
  });
});
