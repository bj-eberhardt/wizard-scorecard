import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { isSupportedLanguage } from '../store/settingsStore';
import translationDE from './locales/de/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  de: {
    translation: translationDE,
  },
  en: {
    translation: translationEN,
  },
};

/**
 * Explicit language choice made in the footer and persisted by the settings
 * store (`wizard_settings_v1`). Read straight from localStorage here so this
 * module does not depend on the store's init order; an explicit choice wins
 * over the browser detector.
 */
function getPreferredLanguage(): string | undefined {
  try {
    const raw = localStorage.getItem('wizard_settings_v1');
    if (!raw) return undefined;
    const language = (JSON.parse(raw)?.state as { language?: unknown } | undefined)?.language;
    return isSupportedLanguage(language) ? language : undefined;
  } catch {
    return undefined;
  }
}

const preferredLanguage = getPreferredLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    // no explicit choice -> the detector keeps working as before
    ...(preferredLanguage ? { lng: preferredLanguage } : {}),
    interpolation: {
      escapeValue: false,
    },
  });

// index.html ships a static lang="de", but the active language is chosen at
// runtime — keep <html lang> in sync so screen readers and native browser UI
// (e.g. validation bubbles) follow the app instead of contradicting it.
const syncDocumentLang = () => {
  document.documentElement.lang = i18n.resolvedLanguage ?? 'de';
};
syncDocumentLang();
i18n.on('languageChanged', syncDocumentLang);

export default i18n;
