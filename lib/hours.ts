// Reads simple OpenStreetMap opening hours, e.g. "Mo-Fr 09:00-18:00; Sa 10:00-14:00".
// Anything it does not understand counts as "unknown", so you never get a wrong warning.

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]; // same order as JavaScript's getDay()

type Range = [number, number]; // minutes from midnight
type Rule = { days: number[]; ranges: Range[] };

function parseDays(text: string): number[] | null {
  if (!text) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set<number>();
  for (const part of text.split(",")) {
    const m = part.trim().match(/^([A-Za-z]{2})(?:\s*-\s*([A-Za-z]{2}))?$/);
    if (!m) return null;
    const from = DAYS.indexOf(m[1]);
    if (from < 0) return null;
    if (!m[2]) {
      days.add(from);
      continue;
    }
    const to = DAYS.indexOf(m[2]);
    if (to < 0) return null;
    for (let d = from; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === to) break;
    }
  }
  return Array.from(days);
}

function parseTimes(text: string): Range[] | null {
  const value = text.trim().toLowerCase();
  if (value === "off" || value === "closed") return [];
  const ranges: Range[] = [];
  for (const part of value.split(",")) {
    const m = part.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    ranges.push([Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
  }
  return ranges.length ? ranges : null;
}

function parseHours(text: string): Rule[] | null {
  const raw = text.trim();
  if (!raw) return null;
  if (raw === "24/7") return [{ days: [0, 1, 2, 3, 4, 5, 6], ranges: [[0, 1440]] }];

  const rules: Rule[] = [];
  for (const piece of raw.split(";")) {
    const rule = piece.trim();
    if (!rule) continue;
    // Rules about public holidays are skipped: the app does not know the holidays
    if (/\b(PH|SH)\b/.test(rule)) continue;

    const m = rule.match(/^(.*?)\s*(off|closed|\d{1,2}:\d{2}.*)$/i);
    if (!m) return null;
    const days = parseDays(m[1].trim());
    const ranges = parseTimes(m[2]);
    if (!days || !ranges) return null;
    rules.push({ days, ranges });
  }
  return rules.length ? rules : null;
}

// The opening times of one weekday (later rules replace earlier ones)
function rangesFor(rules: Rule[], day: number): Range[] {
  let result: Range[] = [];
  for (const rule of rules) {
    if (rule.days.includes(day)) result = rule.ranges;
  }
  return result;
}

function isOpenAt(rules: Rule[], day: number, minute: number) {
  for (const [start, end] of rangesFor(rules, day)) {
    if (end > start ? minute >= start && minute < end : minute >= start) return true;
  }
  // Opening times that go past midnight, from the day before
  for (const [start, end] of rangesFor(rules, (day + 6) % 7)) {
    if (end <= start && minute < end) return true;
  }
  return false;
}

export type OpenCheck = "unknown" | "ok" | "closed" | "closesBeforeEnd";

// Is the place open when you arrive, and still open until you leave?
// arriveAt is in seconds since midnight today (after 24 h it means tomorrow).
export function checkOpen(
  hours: string | undefined,
  arriveAt: number,
  stayMinutes: number
): OpenCheck {
  if (!hours) return "unknown";
  const rules = parseHours(hours);
  if (!rules) return "unknown";

  const now = Date.now();
  const openAt = (seconds: number) => {
    const date = new Date(now + Math.floor(seconds / 86400) * 86400000);
    return isOpenAt(rules, date.getDay(), Math.floor((seconds % 86400) / 60));
  };

  if (!openAt(arriveAt)) return "closed";
  if (!openAt(arriveAt + Math.max(0, stayMinutes * 60 - 60))) return "closesBeforeEnd";
  return "ok";
}
