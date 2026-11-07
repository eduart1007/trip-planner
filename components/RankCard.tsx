"use client";

import { t } from "@/lib/i18n";
import { MAX_NAMED_LEVEL, POINTS_PER_KM, getLevel, type Progress } from "@/lib/rank";
import { formatDistance } from "@/lib/routing";
import { getSettings } from "@/lib/settings";

// A long distance such as "3,200 km" (or miles)
function bigDistance(km: number) {
  const miles = getSettings().units === "mi";
  const value = miles ? km / 1.609344 : km;
  const text = value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString();
  return `${text} ${miles ? "mi" : "km"}`;
}

export default function RankCard({
  progress,
  onOpenSettings,
}: {
  progress: Progress;
  onOpenSettings: () => void;
}) {
  const { level, rank, next, fraction, toNext } = getLevel(progress.points);
  const nextLabel =
    next.level <= MAX_NAMED_LEVEL ? `${next.emoji} ${next.name}` : t("level", { n: next.level });

  return (
    <div className="relative bg-blue-600 p-4 text-white">
      <button
        onClick={onOpenSettings}
        aria-label={t("settings")}
        className="absolute right-3 top-3 rounded-full p-1.5 text-lg leading-none hover:bg-white/20"
      >
        ⚙️
      </button>

      <div className="flex items-center justify-between pr-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
            {t("level", { n: level })}
          </p>
          <p className="text-lg font-bold">
            {rank.emoji} {rank.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold leading-none">{progress.points.toLocaleString()}</p>
          <p className="text-xs text-blue-100">{t("points")}</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
        <div
          className="h-full rounded-full bg-amber-300 transition-all"
          style={{ width: `${Math.max(1, Math.round(fraction * 100))}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-blue-100">
        {t("pointsTo", { n: toNext.toLocaleString(), rank: nextLabel })}
      </p>
      <p className="mt-1 text-xs text-blue-100">
        {t("equiv", {
          car: bigDistance(toNext / POINTS_PER_KM.car),
          bike: bigDistance(toNext / POINTS_PER_KM.bike),
          foot: bigDistance(toNext / POINTS_PER_KM.foot),
        })}
      </p>
      <p className="mt-1 text-xs text-blue-100">
        {t("stats", {
          stops: progress.stops,
          trips: progress.trips,
          dist: formatDistance(progress.walkedMeters),
        })}
      </p>
    </div>
  );
}
