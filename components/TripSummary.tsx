"use client";

import { badgeLabel } from "@/lib/badges";
import { t } from "@/lib/i18n";
import { MAX_NAMED_LEVEL, getLevel, type Progress } from "@/lib/rank";
import { formatDistance, formatDuration, type TravelMode } from "@/lib/routing";
import { formatClock } from "@/lib/schedule";
import { compareToPlan, type TripSummaryData } from "@/lib/summary";

const MODE_ICON: Record<TravelMode, string> = { foot: "🚶", bike: "🚲", car: "🚗" };
const MODE_KEY = { foot: "mode_foot", bike: "mode_bike", car: "mode_car" } as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function TripSummary({
  summary,
  progress,
  onClose,
}: {
  summary: TripSummaryData;
  progress: Progress;
  onClose: () => void;
}) {
  const info = getLevel(progress.points);
  const levelUp = info.level > summary.levelAtStart;
  const nextLabel =
    info.next.level <= MAX_NAMED_LEVEL
      ? `${info.next.emoji} ${info.next.name}`
      : t("level", { n: info.next.level });
  const reached = summary.stops.filter((s) => s.arrivedAt !== undefined).length;

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div
        role="dialog"
        aria-label={t("tripComplete")}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100 md:max-w-md md:rounded-2xl"
      >
        <p className="text-4xl">🎉</p>
        <h2 className="mt-1 text-xl font-semibold">{t("tripComplete")}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {MODE_ICON[summary.mode]} {t(MODE_KEY[summary.mode])}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label={t("sumStops")} value={`${reached} / ${summary.stops.length}`} />
          <Stat label={t("distance")} value={formatDistance(summary.meters)} />
          <Stat label={t("sumTime")} value={formatDuration(summary.elapsedSeconds)} />
          <Stat label={t("sumPoints")} value={`+${summary.points.toLocaleString()}`} />
        </div>

        <div className="mt-4 rounded-xl bg-blue-50 p-3 dark:bg-blue-950">
          {levelUp && (
            <p className="mb-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
              {t("levelUp", { n: info.level, rank: `${info.rank.emoji} ${info.rank.name}` })}
            </p>
          )}
          <p className="text-sm font-medium">
            {info.rank.emoji} {info.rank.name} · {t("level", { n: info.level })}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${Math.max(1, Math.round(info.fraction * 100))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {t("pointsTo", { n: info.toNext.toLocaleString(), rank: nextLabel })}
          </p>
        </div>

        {summary.newBadges.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              🏅 {t("sumNewBadges")}
            </p>
            <ul className="flex flex-wrap gap-2">
              {summary.newBadges.map((badge) => (
                <li
                  key={badge.id}
                  className="rounded-full bg-amber-50 px-3 py-1 text-sm dark:bg-amber-950"
                >
                  {badgeLabel(badge)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("sumPlan")}
          </p>
          <ol className="space-y-2">
            {summary.stops.map((stop, i) => {
              const compare =
                stop.arrivedAt !== undefined && stop.plannedAt !== undefined
                  ? compareToPlan(stop.arrivedAt, stop.plannedAt)
                  : null;
              return (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                      stop.arrivedAt !== undefined ? "bg-green-600" : "bg-gray-400"
                    }`}
                  >
                    {stop.arrivedAt !== undefined ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{stop.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stop.arrivedAt === undefined ? (
                        t("sumSkipped")
                      ) : (
                        <>
                          {t("arrived")} {formatClock(stop.arrivedAt)}
                          {compare?.kind === "onTime" && ` · ${t("sumOnTime")}`}
                          {compare?.kind === "early" && ` · ${t("sumEarly", { n: compare.minutes })}`}
                          {compare?.kind === "late" && ` · ${t("minLate", { n: compare.minutes })}`}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{t("sumNote")}</p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
