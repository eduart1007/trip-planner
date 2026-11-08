"use client";

import { useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import { canInstall, isIos, isStandalone, onInstallChange, promptInstall } from "@/lib/install";

// Shown in the settings: install the app, or how to do it on an iPhone
export default function InstallButton() {
  const available = useSyncExternalStore(onInstallChange, canInstall, () => false);

  if (isStandalone()) {
    return <p className="mt-5 text-sm text-green-700 dark:text-green-400">✓ {t("installed")}</p>;
  }

  if (available) {
    return (
      <button
        onClick={() => void promptInstall()}
        className="mt-5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        📲 {t("installApp")}
      </button>
    );
  }

  if (isIos()) {
    return <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">📲 {t("installIos")}</p>;
  }

  return null;
}
