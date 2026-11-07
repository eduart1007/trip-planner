"use client";

import type { Settings } from "@/lib/settings";

type ChoiceProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

function Choice<T extends string>({ label, value, options, onChange }: ChoiceProps<T>) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              value === o.value
                ? "border-blue-600 bg-blue-600 font-medium text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white dark:bg-gray-900 p-5 text-gray-900 dark:text-gray-100 shadow-xl md:max-w-md md:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">⚙️ Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="text-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <Choice
          label="Distance"
          value={settings.units}
          options={[
            { value: "km", label: "Kilometers" },
            { value: "mi", label: "Miles" },
          ]}
          onChange={(units) => onChange({ units })}
        />

        <Choice
          label="Clock"
          value={settings.clock}
          options={[
            { value: "24h", label: "24-hour" },
            { value: "12h", label: "12-hour (AM/PM)" },
          ]}
          onChange={(clock) => onChange({ clock })}
        />

        <Choice
          label="Theme"
          value={settings.theme}
          options={[
            { value: "light", label: "☀️ Light" },
            { value: "dark", label: "🌙 Dark" },
            { value: "auto", label: "Auto" },
          ]}
          onChange={(theme) => onChange({ theme })}
        />

        <Choice
          label="Text size"
          value={settings.textSize}
          options={[
            { value: "normal", label: "Normal" },
            { value: "large", label: "Large" },
            { value: "xlarge", label: "Extra large" },
          ]}
          onChange={(textSize) => onChange({ textSize })}
        />

        <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">
          Language choice and a first-time guide are coming soon.
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
