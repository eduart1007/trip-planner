"use client";

import { t } from "@/lib/i18n";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/types";
import { formatDistance, formatDuration, type Leg } from "@/lib/routing";
import { formatClock, secondsNow } from "@/lib/schedule";

// Counts down to a time of day
function Countdown({ at }: { at: number }) {
  const [now, setNow] = useState(secondsNow);

  useEffect(() => {
    const timer = setInterval(() => setNow(secondsNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = at - now;
  if (left <= 0) return <span className="font-semibold text-red-600 dark:text-red-400">{t("leaveNow")}</span>;
  const minutes = Math.floor(left / 60);
  const seconds = left % 60;
  return (
    <span>
      {t("inTime", { min: minutes, sec: String(seconds).padStart(2, "0") })}
    </span>
  );
}

type Props = {
  done: boolean;
  earned: number;
  stop?: Place;
  index: number;
  total: number;
  leg: Leg | null;
  straightMeters: number | null;
  instruction: string | null;
  leaveFrom: string | null; // name of the place you are leaving
  leaveAt: number | null; // when to leave it (only while you are still there)
  arriveAt: number | null; // expected arrival at this stop
  lateBySeconds: number;
  accuracy: number | null;
  error: string;
  voiceOn: boolean;
  onToggleVoice: () => void;
  delayMinutes: number; // how much the plan was moved by "running late"
  onDelay: (minutes: number) => void;
  onSkip: () => void;
  onStop: () => void;
};

const cardClass =
  "absolute bottom-6 left-1/2 z-[1000] max-h-[75%] w-[22rem] max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-y-auto rounded-xl bg-white dark:bg-gray-900 p-4 shadow-xl";

export default function NavigationCard({
  done,
  earned,
  stop,
  index,
  total,
  leg,
  straightMeters,
  instruction,
  leaveFrom,
  leaveAt,
  arriveAt,
  lateBySeconds,
  accuracy,
  error,
  voiceOn,
  onToggleVoice,
  delayMinutes,
  onDelay,
  onSkip,
  onStop,
}: Props) {
  if (done) {
    return (
      <div className={cardClass}>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("tripComplete")}</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("earnedTrip", { n: earned })}</p>
        <button
          onClick={onStop}
          className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("close")}
        </button>
      </div>
    );
  }

  let distanceLine = t("findingLocation");
  if (leg) distanceLine = `${formatDistance(leg.distance)} · ${formatDuration(leg.duration)}`;
  else if (straightMeters !== null) distanceLine = t("aboutAway", { d: formatDistance(straightMeters) });

  return (
    <div className={cardClass}>
      {error && <p className="mb-2 rounded bg-red-50 dark:bg-red-950 p-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      {stop ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            {t("stopOf", { i: index + 1, n: total })}
          </p>
          <p className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{stop.name}</p>

          {leaveAt !== null && leaveFrom && (
            <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-2 text-sm text-amber-800 dark:text-amber-200">
              {t("leaveFromAt", { from: leaveFrom })} <strong>{formatClock(leaveAt)}</strong> · <Countdown at={leaveAt} />
            </p>
          )}

          {instruction && (
            <p className="mt-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-2 text-sm font-medium text-blue-800 dark:text-blue-200">
              {instruction}
            </p>
          )}

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{distanceLine}</p>
          {arriveAt !== null && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("expectedArrival")} {formatClock(arriveAt)}
              {lateBySeconds > 0 && (
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {" "}
                  · {t("minLate", { n: Math.ceil(lateBySeconds / 60) })}
                </span>
              )}
            </p>
          )}
          {accuracy !== null && accuracy > 100 && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {t("gpsWeak", { n: Math.round(accuracy) })}
            </p>
          )}

          {/* Running late and voice */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span>{t("runningLate")}</span>
            {[10, 20, 30].map((m) => (
              <button
                key={m}
                onClick={() => onDelay(m)}
                className="rounded-full border border-gray-300 dark:border-gray-600 px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                +{m} min
              </button>
            ))}
            <button
              onClick={onToggleVoice}
              aria-label={voiceOn ? t("voiceOff") : t("voiceOn")}
              className="ml-auto text-lg leading-none"
            >
              {voiceOn ? "🔊" : "🔇"}
            </button>
          </div>
          {delayMinutes > 0 && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {t("planMoved", { n: delayMinutes })}{" "}
              <button onClick={() => onDelay(-delayMinutes)} className="underline">
                {t("undo")}
              </button>
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={onSkip}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {t("skipStop")}
            </button>
            <button
              onClick={onStop}
              className="flex-1 rounded-lg border border-red-300 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {t("stopTrip")}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
            {t("skipNote")}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-700 dark:text-gray-300">{t("noMoreStops")}</p>
          <button
            onClick={onStop}
            className="mt-3 w-full rounded-lg border border-red-300 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
          >
            {t("stopTrip")}
          </button>
        </>
      )}
    </div>
  );
}
