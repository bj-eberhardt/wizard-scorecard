import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { T } from '../test-ids';

/**
 * Always-visible footer bar. Fixed to the bottom of the viewport and mounted by
 * `App` on every screen (both the configuration and the in-game branch), so the
 * language stays reachable on every device — configuration, scoreboard,
 * prediction/result overlay and winner view.
 *
 * z-index: above the round overlays (`z-20`) so the flag buttons remain clickable
 * mid-round, but below the modal dialogs (`z-50`) and the splash (`z-[1000]`),
 * which are allowed to cover it. The flag selection itself lives in the separate
 * `LanguageSwitcher` component; `__APP_VERSION__` is injected at build time.
 */
export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer
      data-testid={T.footer.root}
      className="fixed inset-x-0 bottom-0 z-30 bg-white/95 px-4 pt-1 pb-2 text-center text-gray-500 text-sm backdrop-blur border-t border-gray-200"
    >
      <LanguageSwitcher />
      {t('footer.copy', { year, version: __APP_VERSION__ })}
    </footer>
  );
}
