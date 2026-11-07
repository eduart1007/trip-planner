"use client";

import { useEffect, useState } from "react";
import { BADGES, badgeLabel, earnedBadges, isEarned } from "@/lib/badges";
import { fetchLeaderboard, fetchMyRank, type LeaderboardRow } from "@/lib/cloud";
import { t } from "@/lib/i18n";
import { activeStreak, getLevel, type Progress } from "@/lib/rank";
import { supabase } from "@/lib/supabase";

export default function StatsPanel({
  progress,
  signedIn,
  onClose,
}: {
  progress: Progress;
  signedIn: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"board" | "badges">("board");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    fetchLeaderboard()
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    if (signedIn) {
      fetchMyRank()
        .then((n) => {
          if (!cancelled) setMyRank(n);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const streak = activeStreak(progress);
  const earned = earnedBadges(progress);
  const meInList = rows?.some((r) => r.is_me) ?? false;

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg border px-3 py-2 text-sm ${
      active
        ? "border-blue-600 bg-blue-600 font-medium text-white"
        : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
    }`;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={t("leaderboard")}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100 md:max-w-md md:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">🏆 {t("leaderboard")}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-xl text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => setTab("board")} className={tabClass(tab === "board")}>
            🏆 {t("leaderboard")}
          </button>
          <button onClick={() => setTab("badges")} className={tabClass(tab === "badges")}>
            🏅 {t("badges")}
          </button>
        </div>

        {tab === "board" ? (
          <div className="mt-4">
            {!supabase ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("accountNotSet")}</p>
            ) : failed ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("wentWrong")}</p>
            ) : rows === null ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("noPlayers")}</p>
            ) : (
              <ol className="space-y-1">
                {rows.map((row, i) => {
                  const info = getLevel(row.points);
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        row.is_me ? "bg-blue-50 font-semibold dark:bg-blue-950" : ""
                      }`}
                    >
                      <span className="w-9 shrink-0 text-gray-500 dark:text-gray-400">#{row.rank}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {row.display_name}
                        {row.is_me ? ` (${t("you")})` : ""}
                      </span>
                      <span title={t("level", { n: info.level })}>{info.rank.emoji}</span>
                      <span className="w-20 shrink-0 text-right tabular-nums">
                        {row.points.toLocaleString()}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {signedIn && myRank !== null && !meInList && (
              <p className="mt-3 text-sm font-medium text-blue-700 dark:text-blue-300">
                {t("yourRank", { n: myRank })}
              </p>
            )}
            {!signedIn && supabase && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t("signInToCompete")}</p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                🔥 {t("streakDays", { n: streak })} · {t("bestStreak", { n: progress.bestStreak })}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t("streakHint")}</p>
            </div>

            <p className="mb-2 mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("badgesCount", { n: earned.length, total: BADGES.length })}
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {BADGES.map((badge) => {
                const got = isEarned(badge, progress);
                return (
                  <li
                    key={badge.id}
                    className={`rounded-lg border p-3 text-center text-sm ${
                      got
                        ? "border-amber-300 bg-amber-50 text-gray-900 dark:border-amber-700 dark:bg-amber-950 dark:text-gray-100"
                        : "border-gray-200 text-gray-500 opacity-50 grayscale dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    <div className="text-2xl">{badge.emoji}</div>
                    <div className="mt-1">{badgeLabel(badge).replace(/^\S+\s/, "")}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
