import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { T } from '../test-ids';

/**
 * Footer with the language switcher. It stays in normal document flow on every
 * viewport, so it follows the page content on mobile, tablet and desktop.
 * The flag selection itself lives in the separate `LanguageSwitcher` component;
 * `__APP_VERSION__` is injected at build time.
 */
export default function Footer() {
  const { t } = useTranslation();
  const [year] = useState(() => new Date().getFullYear());

  return (
    <footer
      data-testid={T.footer.root}
      className="mt-8 px-4 pb-2 text-center text-ink-soft text-sm"
    >
      <LanguageSwitcher />
      <span data-testid={T.footer.copyright} data-year={year}>
        {t('footer.copy', { year, version: __APP_VERSION__ })}
      </span>
      <span aria-hidden="true" className="mx-1">
        ·
      </span>
      <a
        data-testid={T.footer.privacy}
        href="privacy.html"
        className="text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline"
      >
        {t('footer.privacy')}
      </a>
    </footer>
  );
}
