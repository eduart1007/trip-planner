"use client";

import { getLevel, type Progress } from "@/lib/rank";

export default function RankCard({ progress }: { progress: Progress }) {
  const { level, rank, next, fraction, toNext } = getLevel(progress.points);

  return (
    <div className="bg-blue-600 p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
            Level {level}
          </p>
          <p className="text-lg font-bold">
            {rank.emoji} {rank.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold leading-none">{progress.points}</p>
          <p className="text-xs text-blue-100">points</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
        <div
          className="h-full rounded-full bg-amber-300 transition-all"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-blue-100">
        {next ? `${toNext} points to ${next.name}` : "Top rank reached!"}
      </p>
      <p className="mt-1 text-xs text-blue-100">
        {progress.stops} stops · {progress.trips} trips · {(progress.walkedMeters / 1000).toFixed(1)} km walked
      </p>
    </div>
  );
}
