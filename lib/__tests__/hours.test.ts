import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkOpen } from "../hours";

// Monday 9 November 2026, 12:00
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const at = (h: number, m = 0) => h * 3600 + m * 60;

describe("checkOpen", () => {
  it("is ok when open the whole visit", () => {
    expect(checkOpen("Mo-Fr 09:00-18:00", at(10), 30)).toBe("ok");
  });

  it("is closed before opening time", () => {
    expect(checkOpen("Mo-Fr 09:00-18:00", at(8), 30)).toBe("closed");
  });

  it("warns when it closes during the visit", () => {
    expect(checkOpen("Mo-Fr 09:00-18:00", at(17, 45), 30)).toBe("closesBeforeEnd");
  });

  it("is closed on days that are not listed", () => {
    expect(checkOpen("Sa 10:00-14:00", at(10), 30)).toBe("closed");
  });

  it("understands several time ranges in a day", () => {
    const hours = "Mo-Fr 09:00-12:00,14:00-18:00";
    expect(checkOpen(hours, at(13), 30)).toBe("closed");
    expect(checkOpen(hours, at(15), 30)).toBe("ok");
  });

  it("understands 24/7 and ignores public holiday rules", () => {
    expect(checkOpen("24/7", at(3), 30)).toBe("ok");
    expect(checkOpen("Mo-Fr 09:00-18:00; PH off", at(10), 30)).toBe("ok");
  });

  it("understands opening times that go past midnight", () => {
    expect(checkOpen("Mo-Su 22:00-02:00", at(23), 30)).toBe("ok");
    expect(checkOpen("Mo-Su 22:00-02:00", at(1), 30)).toBe("ok");
  });

  it("uses the next day for times after midnight", () => {
    // 34 hours after midnight today = tomorrow (Tuesday) at 10:00
    expect(checkOpen("Mo 09:00-18:00", at(34), 30)).toBe("closed");
  });

  it("says unknown instead of guessing", () => {
    expect(checkOpen(undefined, at(10), 30)).toBe("unknown");
    expect(checkOpen("sunrise-sunset", at(10), 30)).toBe("unknown");
  });
});
