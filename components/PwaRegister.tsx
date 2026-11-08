"use client";

import { useEffect, useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import { listenForInstall } from "@/lib/install";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Starts the service worker (in the live version) and shows a banner when you are offline
export default function PwaRegister() {
  const offline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false
  );

  useEffect(() => {
    listenForInstall();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // the app works without it
      });
    }
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-2 z-[4000] max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white shadow-lg"
    >
      {t("offlineBanner")}
    </div>
  );
}
