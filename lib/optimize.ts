import { distanceMeters } from "./geo";
import { toSeconds } from "./schedule";
import type { Place } from "./types";

type Point = { lat: number; lon: number };

// Length of the trip: from the start point (if any) through the stops, in order
function pathLength(start: Point | null, order: Place[]) {
  let total = 0;
  let previous: Point | null = start;
  for (const stop of order) {
    if (previous) total += distanceMeters(previous, stop);
    previous = stop;
  }
  return total;
}

// Stops with a "be there at" time must stay in time order
function timesInOrder(order: Place[]) {
  let last = -1;
  for (const stop of order) {
    const seconds = toSeconds(stop.arriveBy);
    if (seconds === null) continue;
    if (seconds < last) return false;
    last = seconds;
  }
  return true;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) result.push([item, ...p]);
  });
  return result;
}

// For long trips: keep reversing parts of the route while that makes it shorter
function improve(order: Place[], start: Point | null) {
  let best = order;
  let bestLength = pathLength(start, best);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const next = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        if (!timesInOrder(next)) continue;
        const length = pathLength(start, next);
        if (length + 1 < bestLength) {
          best = next;
          bestLength = length;
          improved = true;
        }
      }
    }
  }
  return best;
}

// Finds a shorter order for the stops. Straight-line distances are used.
export function optimizeOrder(
  stops: Place[],
  start: Point | null
): { order: Place[]; savedMeters: number } {
  if (stops.length < 2) return { order: stops, savedMeters: 0 };

  const before = pathLength(start, stops);
  let best = stops;

  if (stops.length <= 8) {
    // Few stops: try every order
    let bestLength = before;
    for (const order of permutations(stops)) {
      if (!timesInOrder(order)) continue;
      const length = pathLength(start, order);
      if (length + 1 < bestLength) {
        best = order;
        bestLength = length;
      }
    }
  } else {
    best = improve(stops, start);
  }

  return { order: best, savedMeters: Math.max(0, before - pathLength(start, best)) };
}
