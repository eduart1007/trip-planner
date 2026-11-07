import { detectLanguage, setLanguage, t, type Language } from "./i18n";

export type Settings = {
  language: Language;
  units: "km" | "mi";
  currency: "EUR" | "USD" | "GBP";
  clock: "24h" | "12h";
  theme: "light" | "dark" | "auto";
  textSize: "normal" | "large" | "xlarge";
};

export const DEFAULT_SETTINGS: Settings = {
  language: "en",
  units: "km",
  currency: "EUR",
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
  setLanguage(settings.language);
}

// Saved settings, or defaults (the language starts as your browser's language)
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, language: detectLanguage(), ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS, language: detectLanguage() };
  }
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

// Applies dark mode, text size and language to the whole page
export function applySettings(settings: Settings) {
  const root = document.documentElement;
  const dark =
    settings.theme === "dark" ||
    (settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.style.fontSize = TEXT_SCALE[settings.textSize];
  root.lang = settings.language;
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
    if (feet < 600) return t("spokenFt", { n: Math.max(50, Math.round(feet / 50) * 50) });
    return t("spokenMi", { n: (meters / 1609.344).toFixed(1) });
  }
  if (meters < 1000) return t("spokenM", { n: Math.max(10, Math.round(meters / 10) * 10) });
  return t("spokenKm", { n: (meters / 1000).toFixed(1) });
}

// For the "points per km" line
export function pointsUnit() {
  return current.units === "mi" ? "mi" : "km";
}

export function pointsPerUnit(perKm: number) {
  return current.units === "mi" ? Math.round(perKm * 1.609344) : perKm;
}

// An amount of money in the chosen currency
export function formatMoney(amount: number) {
  try {
    return new Intl.NumberFormat(current.language, {
      style: "currency",
      currency: current.currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${current.currency}`;
  }
}
