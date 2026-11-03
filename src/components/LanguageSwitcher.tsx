import { useTranslation } from 'react-i18next';
import type { ReactElement } from 'react';
import i18n from '../i18n/i18n';
import useSettingsStore, { type SupportedLanguage } from '../store/settingsStore';
import { T } from '../test-ids';

/**
 * Country flags as inline SVG. Lucide ships no country symbols (only the generic
 * `Flag`/`Globe`), and flag emoji do not render as flags on Windows — they fall
 * back to the letters "DE"/"GB" there. Drawn at 24×16 with simplified stripes.
 */
function FlagDe() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <rect width="24" height="16" fill="#000" />
      <rect y="5.33" width="24" height="5.33" fill="#DD0000" />
      <rect y="10.66" width="24" height="5.34" fill="#FFCE00" />
    </svg>
  );
}

function FlagGb() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <rect width="24" height="16" fill="#012169" />
      {/* fill="none" is required: an open path would otherwise be filled black */}
      <path d="M0 0 24 16M24 0 0 16" fill="none" stroke="#fff" strokeWidth="3.4" />
      <path d="M0 0 24 16M24 0 0 16" fill="none" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0V16M0 8h24" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M12 0V16M0 8h24" fill="none" stroke="#C8102E" strokeWidth="2.8" />
    </svg>
  );
}

const LANGUAGES: {
  code: SupportedLanguage;
  flag: () => ReactElement;
  labelKey: string;
}[] = [
  { code: 'de', flag: FlagDe, labelKey: 'footer.langDe' },
  { code: 'en', flag: FlagGb, labelKey: 'footer.langEn' },
];

/**
 * Language switcher, one flag per supported language. Rendered inside the
 * `Footer`, which the app shows on every screen — configuration, scoreboard and
 * winner — so the language is never only reachable before the game starts.
 *
 * The full flag row is shown on all viewports: the footer on mobile flows after
 * the content (not fixed), so it no longer competes for viewport height and the
 * compact-chip simplification is unnecessary. An explicit choice persisted in
 * the settings store overrides the browser detector on the next boot (read back
 * in i18n.ts); while none is stored, the detector decides.
 */
export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const activeLanguage: SupportedLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'de';

  const switchLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    void i18n.changeLanguage(code);
  };

  return (
    <div
      role="group"
      aria-label={t('footer.langGroup')}
      className="mb-2 flex items-center justify-center gap-2"
    >
      {LANGUAGES.map(({ code, flag: Flag, labelKey }) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLanguage(code)}
          data-testid={T.footer.langButton(code)}
          data-lang={code}
          aria-label={t(labelKey)}
          aria-pressed={activeLanguage === code}
          title={t(labelKey)}
          className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded px-2 opacity-60 hover:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100"
        >
          {/* the active language is outlined in gold; keyboard focus shows the global gold outline */}
          <span
            className={`overflow-hidden rounded-[3px] shadow-sm ring-1 ${
              activeLanguage === code ? 'ring-gold' : 'ring-white/20'
            }`}
          >
            <Flag />
          </span>
        </button>
      ))}
    </div>
  );
}
