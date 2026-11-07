"use client";

import { Fragment } from "react";
import RankCard from "@/components/RankCard";
import TimeSelect from "@/components/TimeSelect";
import { distanceMeters } from "@/lib/geo";
import {
  POINTS_PER_KM,
  STOP_BONUS,
  TRIP_BONUS,
  pointsForLeg,
  type Progress,
} from "@/lib/rank";
import {
  MODES,
  formatDistance,
  formatDuration,
  type RouteResult,
  type TravelMode,
} from "@/lib/routing";
import { DEFAULT_STAY_MINUTES, formatClock, type Schedule } from "@/lib/schedule";
import type { Place } from "@/lib/types";
import type { StopWeather } from "@/lib/weather";

const WHERE: Record<TravelMode, string> = {
  foot: "on foot",
  bike: "by bike",
  car: "by car",
};

type Props = {
  trip: Place[];
  home: Place | null;
  startTime: string;
  schedule: Schedule | null;
  route: RouteResult | null;
  routeLoading: boolean;
  routeError: boolean;
  showRoute: boolean;
  mode: TravelMode;
  locked: boolean; // true while a trip is running
  currentIndex: number;
  canStart: boolean;
  visibleOnMobile: boolean;
  weather: (StopWeather | null)[];
  progress: Progress;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (id: string, patch: Partial<Place>) => void;
  onStartTimeChange: (time: string) => void;
  onUseMyLocation: () => void;
  onClearHome: () => void;
  onToggleRoute: () => void;
  onModeChange: (mode: TravelMode) => void;
  onStart: () => void;
  onStop: () => void;
};

export default function TripPanel({
  trip,
  home,
  startTime,
  schedule,
  route,
  routeLoading,
  routeError,
  showRoute,
  mode,
  locked,
  currentIndex,
  canStart,
  visibleOnMobile,
  weather,
  progress,
  onRemove,
  onMove,
  onUpdate,
  onStartTimeChange,
  onUseMyLocation,
  onClearHome,
  onToggleRoute,
  onModeChange,
  onStart,
  onStop,
}: Props) {
  const modeIcon = MODES.find((m) => m.id === mode)?.icon ?? "";

  // Whole-trip summary
  let summary = "No stops yet";
  if (trip.length > 0) summary = `${trip.length} stop${trip.length === 1 ? "" : "s"}`;
  const tripStart = schedule ? (schedule.items[0]?.leaveAt ?? schedule.startAt) : null;
  if (schedule && tripStart !== null && trip.length > 0) {
    summary += ` · ${formatClock(tripStart)} to ${formatClock(schedule.endAt)} (${formatDuration(
      schedule.endAt - tripStart
    )})`;
  }
  const lateCount = schedule ? schedule.items.filter((it) => it.lateBySeconds > 0).length : 0;
  const rainStops = weather.filter((w) => w && w.rainLikely).length;

  // Points you can earn: the first leg depends on where you start, so this is a minimum
  const chain = home ? [home, ...trip] : trip;
  let tripPoints = 0;
  if (trip.length > 0) {
    tripPoints = TRIP_BONUS + (home ? 0 : STOP_BONUS);
    for (let i = 1; i < chain.length; i++) {
      tripPoints += pointsForLeg(distanceMeters(chain[i - 1], chain[i]), mode);
    }
  }

  let routeInfo = "";
  if (chain.length < 2) routeInfo = "Add a start point and a stop, or two stops, to see the route.";
  else if (routeLoading) routeInfo = "Finding route...";
  else if (routeError) routeInfo = "Could not get the route. Try again in a moment.";
  else if (route) routeInfo = `Route: ${formatDistance(route.distance)} · ${formatDuration(route.duration)} of travel`;

  let startHint = "";
  if (trip.length > 0 && !canStart) {
    startHint = routeError
      ? "Could not calculate travel times. Check your stops and try again."
      : "Calculating travel times...";
  }

  return (
    <aside
      className={`${visibleOnMobile ? "block" : "hidden"} min-h-0 w-full flex-1 overflow-y-auto border-r border-gray-200 bg-white md:flex md:w-[22rem] md:flex-none md:shrink-0 md:flex-col md:overflow-visible`}
    >
      <RankCard progress={progress} />

      {/* Start point and leave time */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm text-white">
            🏠
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {home ? home.name : "No start point yet"}
            </p>
            <p className="truncate text-xs text-gray-500">
              {home ? "Start point" : "Use your location, or pick a place and press Set as start"}
            </p>
          </div>
          {home && !locked && (
            <button
              onClick={onClearHome}
              aria-label="Remove start point"
              className="text-gray-400 hover:text-red-600"
            >
              ✕
            </button>
          )}
        </div>

        {!locked && (
          <button
            onClick={onUseMyLocation}
            className="mt-2 w-full rounded-lg border border-violet-600 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
          >
            📍 Use my location as start
          </button>
        )}

        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span>{home ? "Leave at" : "Start at"}</span>
          <TimeSelect
            value={startTime}
            onChange={(t) => {
              if (t) onStartTimeChange(t);
            }}
            disabled={locked}
          />
        </div>
      </div>

      <div className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">
          {locked ? "Trip in progress 🔒" : "My trip"}
        </h1>
        <p className="text-sm text-gray-500">{summary}</p>
        {rainStops > 0 && (
          <p className="mt-1 text-sm font-medium text-blue-700">
            ☔ Rain is likely at {rainStops} stop{rainStops === 1 ? "" : "s"}. Take an umbrella.
          </p>
        )}
        {lateCount > 0 && (
          <p className="mt-1 text-sm font-medium text-red-600">
            ⚠ You will be late at {lateCount} stop{lateCount === 1 ? "" : "s"}. Change the times or the order.
          </p>
        )}
      </div>

      {trip.length === 0 ? (
        <p className="p-4 text-sm text-gray-500 md:flex-1">
          Search the map, click a pin, or click anywhere on the map, then press Add to trip.
        </p>
      ) : (
        <ol className="md:flex-1 md:overflow-y-auto">
          {trip.map((place, i) => {
            const prev = i === 0 ? home : trip[i - 1];
            const legIndex = home ? i : i - 1;
            const leg = legIndex >= 0 ? route?.legs[legIndex] : undefined;
            const item = schedule?.items[i];
            const w = weather[i] ?? null;
            const legPoints = prev ? pointsForLeg(distanceMeters(prev, place), mode) : 0;
            const visited = locked && i < currentIndex;
            const current = locked && i === currentIndex;

            return (
              <Fragment key={place.id}>
                {/* Travel from the previous point to this stop */}
                {prev && (
                  <li className="flex items-start gap-3 bg-blue-50 px-4 py-1.5 text-xs text-blue-700">
                    <span className="w-7 text-center">{modeIcon}</span>
                    <span className="flex-1">
                      {leg ? `${formatDuration(leg.duration)} · ${formatDistance(leg.distance)}` : "Travel"}
                      {item && item.leaveAt !== null && ` · leave ${formatClock(item.leaveAt)}`}
                    </span>
                    {legPoints > 0 && (
                      <span className="font-semibold text-amber-600">+{legPoints} pts</span>
                    )}
                  </li>
                )}

                <li
                  className={`flex items-start gap-3 border-b border-gray-100 px-4 py-3 ${
                    current ? "bg-amber-50" : ""
                  } ${visited ? "opacity-60" : ""}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                      current ? "bg-amber-500" : visited ? "bg-gray-400" : "bg-green-600"
                    }`}
                  >
                    {visited ? "✓" : i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <input
                      value={place.name}
                      onChange={(e) => onUpdate(place.id, { name: e.target.value })}
                      disabled={locked}
                      aria-label="Stop name"
                      className="w-full truncate rounded bg-transparent px-1 py-0.5 text-sm font-medium text-gray-900 outline-none hover:bg-gray-100 focus:bg-gray-100"
                    />
                    <p className="truncate px-1 text-xs text-gray-500">{place.category}</p>

                    {item && (
                      <p
                        className={`mt-1 px-1 text-xs ${
                          item.lateBySeconds > 0 ? "font-semibold text-red-600" : "text-gray-700"
                        }`}
                      >
                        {visited ? "Arrived" : "Arrive"} {formatClock(item.arriveAt)} · leave{" "}
                        {formatClock(item.departAt)}
                        {item.lateBySeconds > 0 &&
                          ` · ${Math.ceil(item.lateBySeconds / 60)} min late`}
                      </p>
                    )}

                    {w && (
                      <p
                        className={`px-1 text-xs ${
                          w.rainLikely ? "font-medium text-blue-700" : "text-gray-600"
                        }`}
                      >
                        {w.icon} {Math.round(w.temp)}°C · {w.rainChance}% rain
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-xs text-gray-500">
                      <label className="flex items-center gap-1">
                        Stay
                        <input
                          type="number"
                          min={0}
                          max={1440}
                          step={5}
                          value={place.stayMinutes ?? DEFAULT_STAY_MINUTES}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            onUpdate(place.id, {
                              stayMinutes: Number.isNaN(n) ? 0 : Math.min(1440, Math.max(0, n)),
                            });
                          }}
                          disabled={locked}
                          className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 disabled:opacity-50"
                        />
                        min
                      </label>
                      <div className="flex items-center gap-1">
                        <span>Be there at</span>
                        <TimeSelect
                          value={place.arriveBy}
                          onChange={(t) => onUpdate(place.id, { arriveBy: t })}
                          disabled={locked}
                        />
                      </div>
                    </div>
                  </div>

                  {!locked && (
                    <div className="flex flex-col items-center text-gray-400">
                      <button
                        onClick={() => onMove(place.id, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                        className="px-1 hover:text-gray-700 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onRemove(place.id)}
                        aria-label={`Remove ${place.name}`}
                        className="px-1 hover:text-red-600"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => onMove(place.id, 1)}
                        disabled={i === trip.length - 1}
                        aria-label="Move down"
                        className="px-1 hover:text-gray-700 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      )}

      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              disabled={locked}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm disabled:opacity-50 ${
                mode === m.id
                  ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        <p className="mb-3 mt-1 text-xs text-gray-500">
          Points per km: Walk {POINTS_PER_KM.foot} · Bike {POINTS_PER_KM.bike} · Drive{" "}
          {POINTS_PER_KM.car}
        </p>

        <button
          onClick={onToggleRoute}
          disabled={chain.length < 2}
          className="w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          {showRoute ? "Hide route line" : "Show route line"}
        </button>

        <p className="mt-2 text-sm text-gray-600">{routeInfo}</p>

        {trip.length > 0 && (
          <p className="mt-1 text-sm font-medium text-amber-600">
            🏆 Worth {tripPoints}+ points {WHERE[mode]}
          </p>
        )}

        {locked ? (
          <button
            onClick={onStop}
            className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Stop trip
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            ▶ Start trip (locks your plan)
          </button>
        )}
        {startHint && <p className="mt-1 text-xs text-gray-500">{startHint}</p>}
      </div>
    </aside>
  );
}
