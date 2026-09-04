import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";
import es from "./locales/es.json";

/** Languages offered in the user-panel language switcher. RTL flag drives <html dir>. */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", rtl: false },
  { code: "hi", label: "हिन्दी", rtl: false },
  { code: "ar", label: "العربية", rtl: true },
  { code: "es", label: "Español", rtl: false },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Apply <html lang> + <html dir> for the given language (RTL for Arabic). */
export function applyDocumentLanguage(code: string): void {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  document.documentElement.lang = code;
  document.documentElement.dir = lang?.rtl ? "rtl" : "ltr";
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hi }, ar: { translation: ar }, es: { translation: es } },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"], lookupLocalStorage: "zeminex_lang" },
    interpolation: { escapeValue: false },
  });

i18n.on("languageChanged", applyDocumentLanguage);
applyDocumentLanguage(i18n.resolvedLanguage ?? "en");

export default i18n;
