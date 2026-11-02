import { useTranslation } from 'react-i18next';
import type { ReactElement } from 'react';
import { Globe } from 'lucide-react';
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

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

/**
 * Language switcher, one flag per supported language. Rendered inside the
 * `Footer`, which the app shows on every screen — configuration, scoreboard and
 * winner — so the language is never only reachable before the game starts.
 *
 * Two CSS-switched variants share one state (no JS media query): the full flag
 * row is shown from the `md` breakpoint up, while on a phone — where a footer is
 * all about not stealing height from the round table — a single compact chip
 * cycles directly between the two languages. Both drive the same
 * `activeLanguage`, so `aria-pressed` (flags) and `data-lang` (chip) always agree.
 *
 * An explicit choice persisted in the settings store overrides the browser
 * detector on the next boot (read back in i18n.ts); while none is stored, the
 * detector decides.
 */
export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const activeLanguage: SupportedLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'de';
  const other: SupportedLanguage = activeLanguage === 'en' ? 'de' : 'en';

  const switchLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    void i18n.changeLanguage(code);
  };

  return (
    <>
      {/* Mobile: one slim chip that switches straight to the other language. It
          carries the current code in `data-lang` (never asserted as text) and is
          hidden again from `md` up. */}
      <button
        type="button"
        onClick={() => switchLanguage(other)}
        data-testid={T.footer.langToggle}
        data-lang={activeLanguage}
        aria-label={t('footer.langSwitch')}
        title={t('footer.langSwitch')}
        className={`mx-auto flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-200 md:hidden ${focusRing}`}
      >
        <Globe size={16} aria-hidden className="shrink-0" />
        {activeLanguage.toUpperCase()}
      </button>

      {/* Desktop: the full flag group. Hidden below `md`. */}
      <div
        role="group"
        aria-label={t('footer.langGroup')}
        className="mb-2 hidden items-center justify-center gap-2 md:flex"
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
            className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded px-2 opacity-60 hover:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100 ${focusRing}`}
          >
            {/* the active language is outlined, the ring also shows keyboard focus */}
            <span
              className={`overflow-hidden rounded-[3px] shadow-sm ring-1 ${
                activeLanguage === code ? 'ring-gray-700' : 'ring-black/10'
              }`}
            >
              <Flag />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
