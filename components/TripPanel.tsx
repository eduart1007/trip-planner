"use client";

import { Fragment, useState, type FormEvent } from "react";
import RankCard from "@/components/RankCard";
import TimeSelect from "@/components/TimeSelect";
import { distanceMeters } from "@/lib/geo";
import { checkOpen } from "@/lib/hours";
import { t } from "@/lib/i18n";
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
import { formatMoney, pointsPerUnit, pointsUnit } from "@/lib/settings";
import type { Place } from "@/lib/types";
import type { StopWeather } from "@/lib/weather";

const WORTH_KEYS = { foot: "worth_foot", bike: "worth_bike", car: "worth_car" } as const;
const MODE_KEYS = { foot: "mode_foot", bike: "mode_bike", car: "mode_car" } as const;

const fieldClass =
  "rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
const toolButton =
  "flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800";

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
  progress: Progress;
  visibleOnMobile: boolean;
  onOpenSettings: () => void;
  weather: (StopWeather | null)[];
  shareNote: string;
  onShare: () => void;
  onClear: () => void;
  onCalendar: () => void;
  onPrint: () => void;
  orderNote: string;
  canUndoOrder: boolean;
  onOptimize: () => void;
  onUndoOrder: () => void;
  suggestions: Place[];
  onShowSuggestion: (place: Place) => void;
  onAddSuggestion: (place: Place) => void;
  onSearch: (query: string) => Promise<Place[]>;
  onAddPlace: (place: Place) => void;
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
  progress,
  visibleOnMobile,
  onOpenSettings,
  weather,
  shareNote,
  onShare,
  onClear,
  onCalendar,
  onPrint,
  orderNote,
  canUndoOrder,
  onOptimize,
  onUndoOrder,
  suggestions,
  onShowSuggestion,
  onAddSuggestion,
  onSearch,
  onAddPlace,
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState("");

  const modeIcon = MODES.find((m) => m.id === mode)?.icon ?? "";

  function toggleDetails(id: string) {
    setDetailsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Search a place by name and add it to the end of the route
  async function submitSearch(e: FormEvent) {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setSearching(true);
    setSearchNote("");
    try {
      const found = await onSearch(text);
      setResults(found);
      if (found.length === 0) setSearchNote(t("noPlaces"));
    } catch {
      setSearchNote(t("wentWrong"));
    } finally {
      setSearching(false);
    }
  }

  function addResult(place: Place) {
    onAddPlace(place);
    setResults((r) => r.filter((p) => p.id !== place.id));
  }

  // Make it a round trip: the start point becomes the last stop
  function returnToStart() {
    if (!home) return;
    onAddPlace({ ...home, id: `return-${Date.now()}`, category: t("returnToStart"), stayMinutes: 0 });
  }

  const lastIsReturn = trip.length > 0 && trip[trip.length - 1].id.startsWith("return-");

  // Whole-trip summary
  let summary = t("noStops");
  if (trip.length > 0) summary = t(trip.length === 1 ? "stop1" : "stopN", { n: trip.length });
  const tripStart = schedule ? (schedule.items[0]?.leaveAt ?? schedule.startAt) : null;
  if (schedule && tripStart !== null && trip.length > 0) {
    summary += ` · ${formatClock(tripStart)} – ${formatClock(schedule.endAt)} (${formatDuration(
      schedule.endAt - tripStart
    )})`;
  }
  const lateCount = schedule ? schedule.items.filter((it) => it.lateBySeconds > 0).length : 0;
  const rainStops = weather.filter((w) => w && w.rainLikely).length;
  const totalCost = trip.reduce((sum, p) => sum + (p.cost ?? 0), 0);
  const canExport = schedule !== null && trip.length > 0;

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
  if (chain.length < 2) routeInfo = t("routeNeeds");
  else if (routeLoading) routeInfo = t("routeFinding");
  else if (routeError) routeInfo = t("routeFail");
  else if (route) {
    routeInfo = `${t("routeLabel")}: ${formatDistance(route.distance)} · ${formatDuration(route.duration)}`;
  }

  let startHint = "";
  if (trip.length > 0 && !canStart) {
    startHint = routeError ? t("hintFail") : t("hintCalc");
  }

  return (
    <aside
      className={`${
        visibleOnMobile ? "flex" : "hidden"
      } min-h-0 w-full flex-1 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:flex md:w-[22rem] md:flex-none md:shrink-0`}
    >
      {/* Everything here scrolls together, so the stops always have room */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RankCard progress={progress} onOpenSettings={onOpenSettings} />

        {/* Start point and leave time */}
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm text-white">
              🏠
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {home ? home.name : t("noStart")}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {home ? t("startPoint") : t("noStartHint")}
              </p>
            </div>
            {home && !locked && (
              <button
                onClick={onClearHome}
                aria-label={t("removeStart")}
                className="text-gray-400 hover:text-red-600 dark:text-gray-500"
              >
                ✕
              </button>
            )}
          </div>

          {!locked && (
            <button
              onClick={onUseMyLocation}
              className="mt-2 w-full rounded-lg border border-violet-600 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950"
            >
              {t("useMyLocation")}
            </button>
          )}

          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{home ? t("leaveAt") : t("startAt")}</span>
            <TimeSelect
              value={startTime}
              onChange={(time) => {
                if (time) onStartTimeChange(time);
              }}
              disabled={locked}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("leaveHint")}</p>
        </div>

        {/* Title and warnings */}
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {locked ? t("tripInProgress") : t("myTrip")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{summary}</p>
          {totalCost > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              💰 {t("budgetTotal", { n: formatMoney(totalCost) })}
            </p>
          )}
          {rainStops > 0 && (
            <p className="mt-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              ☔ {t(rainStops === 1 ? "rain1" : "rainN", { n: rainStops })}
            </p>
          )}
          {lateCount > 0 && (
            <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
              ⚠ {t(lateCount === 1 ? "late1" : "lateN", { n: lateCount })}
            </p>
          )}
        </div>

        {/* The stops */}
        {trip.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t("emptyHint")}</p>
        ) : (
          <ol>
            {trip.map((place, i) => {
              const prev = i === 0 ? home : trip[i - 1];
              const legIndex = home ? i : i - 1;
              const leg = legIndex >= 0 ? route?.legs[legIndex] : undefined;
              const item = schedule?.items[i];
              const w = weather[i] ?? null;
              const open = item
                ? checkOpen(place.openingHours, item.arriveAt, place.stayMinutes ?? DEFAULT_STAY_MINUTES)
                : "unknown";
              const legPoints = prev ? pointsForLeg(distanceMeters(prev, place), mode) : 0;
              const visited = locked && i < currentIndex;
              const current = locked && i === currentIndex;
              const checklist = place.checklist ?? [];
              const doneCount = checklist.filter((c) => c.done).length;
              const showDetails = detailsOpen.has(place.id);

              return (
                <Fragment key={place.id}>
                  {/* Travel from the previous point to this stop */}
                  {prev && (
                    <li className="flex items-start gap-3 bg-blue-50 px-4 py-1.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <span className="w-7 text-center">{modeIcon}</span>
                      <span className="flex-1">
                        {leg
                          ? `${formatDuration(leg.duration)} · ${formatDistance(leg.distance)}`
                          : t("travel")}
                        {item && item.leaveAt !== null && ` · ${t("leave")} ${formatClock(item.leaveAt)}`}
                      </span>
                      {legPoints > 0 && (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          +{legPoints} pts
                        </span>
                      )}
                    </li>
                  )}

                  <li
                    className={`flex items-start gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 ${
                      current ? "bg-amber-50 dark:bg-amber-950" : ""
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
                        aria-label={t("stopName")}
                        className="w-full truncate rounded bg-transparent px-1 py-0.5 text-sm font-medium text-gray-900 outline-none hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
                      />
                      <p className="truncate px-1 text-xs text-gray-500 dark:text-gray-400">
                        {place.category}
                      </p>

                      {item && (
                        <p
                          className={`mt-1 px-1 text-xs ${
                            item.lateBySeconds > 0
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {visited ? t("arrived") : t("arrive")} {formatClock(item.arriveAt)} ·{" "}
                          {t("leave")} {formatClock(item.departAt)}
                          {item.lateBySeconds > 0 &&
                            ` · ${t("minLate", { n: Math.ceil(item.lateBySeconds / 60) })}`}
                        </p>
                      )}

                      {open === "closed" && (
                        <p
                          title={place.openingHours}
                          className="px-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                        >
                          🕒 {t("closedAtArrival")}
                        </p>
                      )}
                      {open === "closesBeforeEnd" && (
                        <p
                          title={place.openingHours}
                          className="px-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                        >
                          🕒 {t("closesDuringStay")}
                        </p>
                      )}
                      {w && (
                        <p
                          className={`px-1 text-xs ${
                            w.rainLikely
                              ? "font-medium text-blue-700 dark:text-blue-300"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {w.icon} {Math.round(w.temp)}°C · {t("rainChance", { n: w.rainChance })}
                        </p>
                      )}

                      {/* Times */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-xs text-gray-500 dark:text-gray-400">
                        <label className="flex items-center gap-1">
                          {t("stay")}
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
                            className={`w-16 disabled:opacity-50 ${fieldClass}`}
                          />
                          min
                        </label>
                        <div className="flex items-center gap-1">
                          <span title={t("beThereHint")}>{t("beThere")}</span>
                          <TimeSelect
                            value={place.arriveBy}
                            onChange={(time) => onUpdate(place.id, { arriveBy: time })}
                            disabled={locked}
                          />
                        </div>
                      </div>

                      {/* Notes, checklist and budget */}
                      <button
                        onClick={() => toggleDetails(place.id)}
                        className="mt-2 px-1 text-left text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
                      >
                        {showDetails ? "▾" : "▸"} 📝 {t("details")}
                        {checklist.length > 0 && ` · ✓ ${doneCount}/${checklist.length}`}
                        {place.cost ? ` · ${formatMoney(place.cost)}` : ""}
                      </button>
                      {showDetails && (
                        <div className="mt-2 space-y-2 px-1">
                          <textarea
                            value={place.note ?? ""}
                            onChange={(e) => onUpdate(place.id, { note: e.target.value })}
                            placeholder={t("notePlaceholder")}
                            rows={2}
                            className={`w-full ${fieldClass}`}
                          />
                          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {t("budget")}
                            <input
                              type="number"
                              min={0}
                              step="any"
                              inputMode="decimal"
                              value={place.cost ?? ""}
                              onChange={(e) => {
                                const n = parseFloat(e.target.value);
                                onUpdate(place.id, { cost: Number.isNaN(n) || n < 0 ? undefined : n });
                              }}
                              className={`w-24 ${fieldClass}`}
                            />
                          </label>
                          <ul className="space-y-1">
                            {checklist.map((entry) => (
                              <li key={entry.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={entry.done}
                                  onChange={() =>
                                    onUpdate(place.id, {
                                      checklist: checklist.map((c) =>
                                        c.id === entry.id ? { ...c, done: !c.done } : c
                                      ),
                                    })
                                  }
                                />
                                <span
                                  className={`min-w-0 flex-1 break-words ${
                                    entry.done
                                      ? "text-gray-400 line-through dark:text-gray-500"
                                      : "text-gray-800 dark:text-gray-200"
                                  }`}
                                >
                                  {entry.text}
                                </span>
                                <button
                                  onClick={() =>
                                    onUpdate(place.id, {
                                      checklist: checklist.filter((c) => c.id !== entry.id),
                                    })
                                  }
                                  aria-label={t("remove")}
                                  className="text-gray-400 hover:text-red-600 dark:text-gray-500"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                          <input
                            placeholder={t("addItem")}
                            onKeyDown={(e) => {
                              const value = e.currentTarget.value.trim();
                              if (e.key === "Enter" && value) {
                                onUpdate(place.id, {
                                  checklist: [
                                    ...checklist,
                                    { id: `${Date.now()}`, text: value, done: false },
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className={`w-full ${fieldClass}`}
                          />
                        </div>
                      )}
                    </div>

                    {!locked && (
                      <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                        <button
                          onClick={() => onMove(place.id, -1)}
                          disabled={i === 0}
                          aria-label={t("moveUp")}
                          className="px-1 hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => onRemove(place.id)}
                          aria-label={`${t("remove")} ${place.name}`}
                          className="px-1 hover:text-red-600"
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => onMove(place.id, 1)}
                          disabled={i === trip.length - 1}
                          aria-label={t("moveDown")}
                          className="px-1 hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
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

        {/* Add a stop: extend the route without going back to the map */}
        {!locked && (
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              ＋ {t("extendRoute")}
            </p>
            <form onSubmit={submitSearch} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("addStopPlaceholder")}
                className={`min-w-0 flex-1 py-2 ${fieldClass}`}
              />
              <button
                type="submit"
                disabled={searching}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {searching ? "..." : t("search")}
              </button>
            </form>

            {searchNote && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{searchNote}</p>
            )}

            {results.length > 0 && (
              <ul className="mt-2 space-y-2">
                {results.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <button
                      onClick={() => onShowSuggestion(p)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm text-gray-900 dark:text-gray-100">
                        {p.name}
                      </span>
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                        {p.address ?? p.category}
                      </span>
                    </button>
                    <button
                      onClick={() => addResult(p)}
                      aria-label={`${t("addToTrip")}: ${p.name}`}
                      className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      + {t("add")}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {home && trip.length > 0 && !lastIsReturn && (
              <button
                onClick={returnToStart}
                className="mt-3 w-full rounded-lg border border-violet-600 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950"
              >
                ↩ {t("returnToStart")}
              </button>
            )}
          </div>
        )}

        {/* Suggestions near you */}
        {suggestions.length > 0 && (
          <div className="px-4 py-3">
            <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              ✨ {t("suggestions")}
            </p>
            <ul className="space-y-2">
              {suggestions.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <button onClick={() => onShowSuggestion(p)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm text-gray-900 dark:text-gray-100">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {p.category}
                    </span>
                  </button>
                  <button
                    onClick={() => onAddSuggestion(p)}
                    aria-label={`${t("addToTrip")}: ${p.name}`}
                    className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    + {t("add")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Bottom bar: always visible and always small */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              disabled={locked}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm disabled:opacity-50 ${
                mode === m.id
                  ? "border-blue-600 bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {m.icon} {t(MODE_KEYS[m.id])}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{routeInfo}</p>
        {trip.length > 0 && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            🏆 {t(WORTH_KEYS[mode], { n: tripPoints })}
          </p>
        )}

        {locked ? (
          <button
            onClick={onStop}
            className="mt-2 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            {t("stopTrip")}
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="mt-2 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            ▶ {t("startTrip")}
          </button>
        )}
        {startHint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{startHint}</p>}

        <button
          onClick={() => setToolsOpen((v) => !v)}
          className="mt-2 w-full text-center text-xs font-medium text-gray-600 hover:underline dark:text-gray-400"
        >
          🧰 {t("tools")} {toolsOpen ? "▴" : "▾"}
        </button>

        {toolsOpen && (
          <div className="mt-2 max-h-[40vh] space-y-2 overflow-y-auto">
            <button
              onClick={onToggleRoute}
              disabled={chain.length < 2}
              className="w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950"
            >
              {showRoute ? t("hideRoute") : t("showRoute")}
            </button>

            <div className="flex gap-2">
              <button
                onClick={onOptimize}
                disabled={locked || trip.length < 2}
                className="flex-1 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                {orderNote || `✨ ${t("optimize")}`}
              </button>
              {canUndoOrder && !locked && (
                <button
                  onClick={onUndoOrder}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  ↩ {t("undo")}
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onShare} disabled={trip.length === 0} className={toolButton}>
                {shareNote || `🔗 ${t("shareTrip")}`}
              </button>
              <button
                onClick={onClear}
                disabled={locked || trip.length === 0}
                className="flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
              >
                🗑 {t("clearRoute")}
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={onCalendar} disabled={!canExport} className={toolButton}>
                📅 {t("calendar")}
              </button>
              <button onClick={onPrint} disabled={!canExport} className={toolButton}>
                🖨 {t("print")}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("pointsPer", {
                unit: pointsUnit(),
                walk: pointsPerUnit(POINTS_PER_KM.foot),
                bike: pointsPerUnit(POINTS_PER_KM.bike),
                drive: pointsPerUnit(POINTS_PER_KM.car),
              })}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
