import { TRANSLATIONS, type Language } from "./translations";

export type { Language };
export type TKey = keyof typeof TRANSLATIONS;

// To add a language: add it here, in the Language type, and a line in every entry of translations.ts
export const LANGUAGES: { code: Language; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
];

let currentLanguage: Language = "en";

export function setLanguage(language: Language) {
  currentLanguage = language;
}

export function getLanguage() {
  return currentLanguage;
}

// The browser's language, if we support it
export function detectLanguage(): Language {
  try {
    const code = navigator.language.slice(0, 2).toLowerCase();
    const found = LANGUAGES.find((l) => l.code === code);
    if (found) return found.code;
  } catch {
    // ignore
  }
  return "en";
}

// Language used by the voice
const SPEECH: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
};

export function speechLang() {
  return SPEECH[currentLanguage];
}

// Translate a text, and fill in values like {n} or {name}
export function t(key: TKey, vars?: Record<string, string | number>): string {
  const entry: Record<Language, string> = TRANSLATIONS[key];
  let text = entry[currentLanguage] ?? entry.en;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
