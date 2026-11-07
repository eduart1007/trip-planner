"use client";

import { t } from "@/lib/i18n";

import { getLevel, type Progress } from "@/lib/rank";
import { formatDistance } from "@/lib/routing";

export default function RankCard({
  progress,
  onOpenSettings,
}: {
  progress: Progress;
  onOpenSettings: () => void;
}) {
  const { level, rank, next, fraction, toNext } = getLevel(progress.points);

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
          <p className="text-2xl font-bold leading-none">{progress.points}</p>
          <p className="text-xs text-blue-100">{t("points")}</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
        <div
          className="h-full rounded-full bg-amber-300 transition-all"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-blue-100">
        {next ? t("pointsTo", { n: toNext, rank: next.name }) : t("topRank")}
      </p>
      <p className="mt-1 text-xs text-blue-100">
        {t("stats", { stops: progress.stops, trips: progress.trips, dist: formatDistance(progress.walkedMeters) })}
      </p>
    </div>
  );
}
