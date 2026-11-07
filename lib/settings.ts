export type Settings = {
  units: "km" | "mi";
  clock: "24h" | "12h";
  theme: "light" | "dark" | "auto";
  textSize: "normal" | "large" | "xlarge";
};

export const DEFAULT_SETTINGS: Settings = {
  units: "km",
  clock: "24h",
  theme: "light",
  textSize: "normal",
};

const STORAGE_KEY = "trip-planner-settings-v1";

// The settings in use right now, so formatting functions can read them anywhere
let current: Settings = DEFAULT_SETTINGS;

export function getSettings() {
  return current;
}

export function setCurrentSettings(settings: Settings) {
  current = settings;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore and use the defaults
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage may be unavailable
  }
}

const TEXT_SCALE: Record<Settings["textSize"], string> = {
  normal: "100%",
  large: "112.5%",
  xlarge: "125%",
};

// Applies dark mode and text size to the whole page
export function applySettings(settings: Settings) {
  const root = document.documentElement;
  const dark =
    settings.theme === "dark" ||
    (settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.style.fontSize = TEXT_SCALE[settings.textSize];
}

// Label of an hour in the time dropdowns: "14" or "2 PM"
export function hourLabel(hour: number) {
  if (current.clock === "12h") return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "AM" : "PM"}`;
  return String(hour).padStart(2, "0");
}

// A distance as it should be spoken
export function spokenDistance(meters: number) {
  if (current.units === "mi") {
    const feet = meters * 3.28084;
    if (feet < 600) return `${Math.max(50, Math.round(feet / 50) * 50)} feet`;
    return `${(meters / 1609.344).toFixed(1)} miles`;
  }
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} meters`;
  return `${(meters / 1000).toFixed(1)} kilometers`;
}

// For the "points per km" line
export function pointsUnit() {
  return current.units === "mi" ? "mile" : "km";
}

export function pointsPerUnit(perKm: number) {
  return current.units === "mi" ? Math.round(perKm * 1.609344) : perKm;
}
