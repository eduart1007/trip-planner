"use client";

import InstallButton from "@/components/InstallButton";
import { LANGUAGES, t, type Language } from "@/lib/i18n";
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
                : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
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
  onOpenGuide,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  onOpenGuide?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={t("settings")}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100 md:max-w-md md:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">⚙️ {t("settings")}</h2>
          <button
            onClick={onClose}
            aria-label={t("closeSettings")}
            className="text-xl text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            🌐 {t("language")}
          </p>
          <select
            value={settings.language}
            onChange={(e) => onChange({ language: e.target.value as Language })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <Choice
          label={t("distance")}
          value={settings.units}
          options={[
            { value: "km", label: t("kilometers") },
            { value: "mi", label: t("miles") },
          ]}
          onChange={(units) => onChange({ units })}
        />

        <Choice
          label={t("clock")}
          value={settings.clock}
          options={[
            { value: "24h", label: t("h24") },
            { value: "12h", label: t("h12") },
          ]}
          onChange={(clock) => onChange({ clock })}
        />

        <Choice
          label={t("currency")}
          value={settings.currency}
          options={[
            { value: "EUR", label: "€ EUR" },
            { value: "USD", label: "$ USD" },
            { value: "GBP", label: "£ GBP" },
          ]}
          onChange={(currency) => onChange({ currency })}
        />

        <Choice
          label={t("theme")}
          value={settings.theme}
          options={[
            { value: "light", label: t("light") },
            { value: "dark", label: t("dark") },
            { value: "auto", label: t("auto") },
          ]}
          onChange={(theme) => onChange({ theme })}
        />

        <Choice
          label={t("textSize")}
          value={settings.textSize}
          options={[
            { value: "normal", label: t("normal") },
            { value: "large", label: t("large") },
            { value: "xlarge", label: t("xlarge") },
          ]}
          onChange={(textSize) => onChange({ textSize })}
        />

        <InstallButton />

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className="mt-5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t("showGuide")}
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t("done")}
        </button>
      </div>
    </div>
  );
}
