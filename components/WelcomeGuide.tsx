"use client";

import { useState } from "react";
import { t, type TKey } from "@/lib/i18n";

type Step = { icon: string; title: TKey; lines: TKey[]; legend?: boolean };

const STEPS: Step[] = [
  { icon: "🗺️", title: "g1_title", lines: ["g1_l1", "g1_l2"] },
  { icon: "📍", title: "g2_title", lines: ["g2_l1", "g2_l2", "g2_l3"] },
  { icon: "⏰", title: "g3_title", lines: ["g3_l1", "g3_l2", "g3_l3"] },
  { icon: "▶️", title: "g4_title", lines: ["g4_l1", "g4_l2", "g4_l3"] },
  { icon: "🎨", title: "g5_title", lines: [], legend: true },
];

function Dot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

function Legend() {
  const rowClass = "flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300";
  const slot = "flex w-7 shrink-0 justify-center";
  return (
    <div className="mt-4 space-y-3">
      <div className={rowClass}>
        <Dot color="#7c3aed">🏠</Dot>
        <span>{t("leg_home")}</span>
      </div>
      <div className={rowClass}>
        <Dot color="#16a34a">1</Dot>
        <span>{t("leg_todo")}</span>
      </div>
      <div className={rowClass}>
        <Dot color="#f59e0b">2</Dot>
        <span>{t("leg_current")}</span>
      </div>
      <div className={rowClass}>
        <Dot color="#9ca3af">3</Dot>
        <span>{t("leg_done")}</span>
      </div>
      <div className={rowClass}>
        <span className={slot}>
          <span
            className="h-4 w-4 rounded-full border-2 border-white shadow"
            style={{ background: "#2563eb" }}
          />
        </span>
        <span>{t("leg_you")}</span>
      </div>
      <div className={rowClass}>
        <span className={slot}>
          <span className="h-1.5 w-7 rounded-full" style={{ background: "#2563eb" }} />
        </span>
        <span>{t("leg_route")}</span>
      </div>
      <div className={rowClass}>
        <span className={slot}>
          <span className="h-1.5 w-7 rounded-full" style={{ background: "#f59e0b" }} />
        </span>
        <span>{t("leg_next")}</span>
      </div>
    </div>
  );
}

export default function WelcomeGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div
        role="dialog"
        aria-label={t(current.title)}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100 md:max-w-md md:rounded-2xl"
      >
        <p className="text-4xl">{current.icon}</p>
        <h2 className="mt-2 text-xl font-semibold">{t(current.title)}</h2>

        {current.legend ? (
          <Legend />
        ) : (
          <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {current.lines.map((line) => (
              <p key={line}>{t(line)}</p>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                i === step ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t("g_back")}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {t("g_skip")}
            </button>
          )}
          <button
            onClick={() => (last ? onClose() : setStep(step + 1))}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {last ? t("g_go") : t("g_next")}
          </button>
        </div>
      </div>
    </div>
  );
}
