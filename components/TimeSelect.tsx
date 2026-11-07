"use client";

import { hourLabel } from "@/lib/settings";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// 24-hour time picker made of two dropdowns
export default function TimeSelect({
  value,
  onChange,
  disabled = false,
}: {
  value?: string;
  onChange: (time: string | undefined) => void;
  disabled?: boolean;
}) {
  const [hour, minute] = value ? value.split(":") : ["", "00"];

  const selectClass =
    "rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50";

  return (
    <div className="flex items-center gap-1">
      <select
        value={hour}
        onChange={(e) => {
          const h = e.target.value;
          onChange(h ? `${h}:${minute || "00"}` : undefined);
        }}
        disabled={disabled}
        aria-label="Hour"
        className={selectClass}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {hourLabel(Number(h))}
          </option>
        ))}
      </select>
      <span className="text-gray-500 dark:text-gray-400">:</span>
      <select
        value={minute || "00"}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        disabled={disabled || !hour}
        aria-label="Minute"
        className={selectClass}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
