"use client";

import AccountIcon from "@/components/AccountIcon";
import { t } from "@/lib/i18n";
import { MAX_NAMED_LEVEL, POINTS_PER_KM, activeStreak, getLevel, type Progress } from "@/lib/rank";
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
  onOpenAccount,
  onOpenStats,
}: {
  progress: Progress;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenStats: () => void;
}) {
  const { level, rank, next, fraction, toNext } = getLevel(progress.points);
  const streak = activeStreak(progress);
  const nextLabel =
    next.level <= MAX_NAMED_LEVEL ? `${next.emoji} ${next.name}` : t("level", { n: next.level });

  return (
    <div className="relative bg-blue-600 p-4 text-white">
      <button
        onClick={onOpenStats}
        aria-label={`${t("leaderboard")} / ${t("badges")}`}
        className="absolute right-[4.75rem] top-3 rounded-full p-1.5 text-lg leading-none hover:bg-white/20"
      >
        🏆
      </button>
      <button
        onClick={onOpenAccount}
        aria-label={t("account")}
        className="absolute right-11 top-3 rounded-full p-1.5 text-lg leading-none hover:bg-white/20"
      >
        <AccountIcon className="block h-[1.125rem] w-[1.125rem] text-sky-200" />
      </button>
      <button
        onClick={onOpenSettings}
        aria-label={t("settings")}
        className="absolute right-3 top-3 rounded-full p-1.5 text-lg leading-none hover:bg-white/20"
      >
        ⚙️
      </button>

      <div className="flex items-center justify-between pr-28">
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
      {streak > 0 && (
        <p className="mt-1 text-xs font-medium text-amber-200">🔥 {t("streakDays", { n: streak })}</p>
      )}
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
