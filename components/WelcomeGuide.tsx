"use client";

import { useState } from "react";

type Step = { icon: string; title: string; lines: string[]; legend?: boolean };

const STEPS: Step[] = [
  {
    icon: "🗺️",
    title: "Welcome to your trip planner",
    lines: [
      "Plan a whole trip with times, travel it with live directions, and earn points as you reach each stop.",
      "This quick guide takes less than a minute.",
    ],
  },
  {
    icon: "📍",
    title: "1. Set your start and add stops",
    lines: [
      "Press “Use my location as start”, or open any pin and press “Set as start”.",
      "Search for a place, press “Search this area” for food, sights or hotels, or click anywhere on the map. Then press “Add to trip”.",
      "Use ▲ ▼ to change the order of your stops.",
    ],
  },
  {
    icon: "⏰",
    title: "2. Set your times",
    lines: [
      "“Leave at” is the earliest time you can leave. “Stay” is how many minutes you spend at each stop.",
      "Add “Be there at” if you must arrive at a certain time. The app works out when to leave, and warns you in red if you would be late.",
      "You also see the weather at each stop for the time you arrive.",
    ],
  },
  {
    icon: "▶️",
    title: "3. Start your trip",
    lines: [
      "Press “Start trip”. Your plan is locked and the app follows your location.",
      "You get spoken directions and an alarm when it is time to leave. If you are behind, press “Running late?” and the rest of the plan moves with you.",
      "Reach a stop to earn points. Walking earns the most. Collect points to climb from Tripper to Legend.",
    ],
  },
  {
    icon: "🎨",
    title: "What the map colors mean",
    lines: [],
    legend: true,
  },
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
        <span>Your start point</span>
      </div>
      <div className={rowClass}>
        <Dot color="#16a34a">1</Dot>
        <span>A stop you still have to visit</span>
      </div>
      <div className={rowClass}>
        <Dot color="#f59e0b">2</Dot>
        <span>The stop you are heading to now</span>
      </div>
      <div className={rowClass}>
        <Dot color="#9ca3af">3</Dot>
        <span>A stop you already reached</span>
      </div>
      <div className={rowClass}>
        <span className={slot}>
          <span
            className="h-4 w-4 rounded-full border-2 border-white shadow"
            style={{ background: "#2563eb" }}
          />
        </span>
        <span>You, during a trip</span>
      </div>
      <div className={rowClass}>
        <span className={slot}>
          <span className="h-1.5 w-7 rounded-full" style={{ background: "#2563eb" }} />
        </span>
        <span>Your whole route</span>
      </div>
      <div className={rowClass}>
        <span className={slot}>
          <span className="h-1.5 w-7 rounded-full" style={{ background: "#f59e0b" }} />
        </span>
        <span>The way to your next stop</span>
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
        aria-label="Guide"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100 md:max-w-md md:rounded-2xl"
      >
        <p className="text-4xl">{current.icon}</p>
        <h2 className="mt-2 text-xl font-semibold">{current.title}</h2>

        {current.legend ? (
          <Legend />
        ) : (
          <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {current.lines.map((line) => (
              <p key={line}>{line}</p>
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
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip
            </button>
          )}
          <button
            onClick={() => (last ? onClose() : setStep(step + 1))}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {last ? "Let’s go!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
