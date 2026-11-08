// The "install app" prompt that browsers like Chrome offer.
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Call once when the app starts, to catch the browser's install offer
export function listenForInstall() {
  if (started) return;
  started = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function canInstall() {
  return deferred !== null;
}

export function onInstallChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  notify();
  return choice.outcome === "accepted";
}

// Already opened as an installed app?
export function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function isIos() {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}
