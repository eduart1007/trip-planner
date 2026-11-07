import { getSettings } from "./settings";
import type { Place } from "./types";

export const DEFAULT_STAY_MINUTES = 30;

// "14:30" -> seconds since midnight (null if empty)
export function toSeconds(time: string | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 3600 + m * 60;
}

// seconds since midnight -> "14:30" (adds "+1d" after midnight)
export function formatClock(seconds: number) {
  const day = Math.floor(seconds / 86400);
  const s = ((Math.round(seconds) % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mm = String(m).padStart(2, "0");
  const text =
    getSettings().clock === "12h"
      ? `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? "AM" : "PM"}`
      : `${String(h).padStart(2, "0")}:${mm}`;
  return day > 0 ? `${text} +${day}d` : text;
}

export function secondsNow() {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

export type ScheduleItem = {
  travelSeconds: number; // travel time from the previous point
  leaveAt: number | null; // when to leave the previous point (null if there is none or you already arrived)
  arriveAt: number;
  departAt: number; // when you leave this stop
  lateBySeconds: number; // more than 0 if you arrive after "be there at"
};

export type Schedule = {
  items: ScheduleItem[];
  startAt: number;
  endAt: number;
  travelSeconds: number;
};

type Args = {
  stops: Place[];
  hasHome: boolean; // true if the trip starts from a start point before stop 1
  legSeconds: number[]; // travel time of each part of the route
  startAt: number; // earliest time you can leave, in seconds since midnight
  arrivals: Record<string, number>; // real arrival times of stops you already reached
  delaySeconds?: number; // running late: moves the rest of the plan later
};

export function computeSchedule({
  stops,
  hasHome,
  legSeconds,
  startAt,
  arrivals,
  delaySeconds = 0,
}: Args): Schedule {
  const items: ScheduleItem[] = [];
  let clock = startAt; // the time you are free to leave the previous point
  let totalTravel = 0;
  let delayApplied = false;

  stops.forEach((stop, i) => {
    const legIndex = hasHome ? i : i - 1;
    const hasPrevious = legIndex >= 0;
    // Travel time is rounded up to whole minutes
    const travel = hasPrevious ? Math.ceil((legSeconds[legIndex] ?? 0) / 60) * 60 : 0;
    const arriveBy = toSeconds(stop.arriveBy);
    const stay = (stop.stayMinutes ?? DEFAULT_STAY_MINUTES) * 60;
    const actual = arrivals[stop.id];

    // The delay applies once, to the first stop you have not reached yet
    if (actual === undefined && !delayApplied) {
      clock += delaySeconds;
      delayApplied = true;
    }

    let leaveAt: number | null = null;
    let arriveAt: number;

    if (actual !== undefined) {
      // You are already here (or were): use the real time
      arriveAt = actual;
    } else if (hasPrevious) {
      // Leave as soon as you can, but not before you need to for "be there at"
      leaveAt = Math.max(clock, arriveBy !== null ? arriveBy - travel : clock);
      arriveAt = leaveAt + travel;
    } else {
      arriveAt = arriveBy !== null ? Math.max(clock, arriveBy) : clock;
    }

    totalTravel += travel;
    items.push({
      travelSeconds: travel,
      leaveAt,
      arriveAt,
      departAt: arriveAt + stay,
      lateBySeconds: arriveBy !== null && arriveAt > arriveBy ? arriveAt - arriveBy : 0,
    });
    clock = arriveAt + stay;
  });

  return { items, startAt, endAt: clock, travelSeconds: totalTravel };
}
