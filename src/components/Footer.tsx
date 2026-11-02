import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { T } from '../test-ids';

/**
 * Footer with the language switcher. Its placement is responsive:
 *
 * - Mobile (base): a normal-flow block that simply follows the page content
 *   (`mt-8`), i.e. it appears AFTER the round table and scrolls with it. On a
 *   phone a permanently fixed bar would cost the table height for a control that
 *   is only needed occasionally, so it is not pinned here.
 * - Desktop (`md:`): an always-visible bar fixed to the viewport bottom
 *   (`md:fixed md:inset-x-0 md:bottom-0 md:z-30`), so the language stays reachable
 *   on every screen without scrolling.
 *
 * `App` mounts it on every screen (configuration, scoreboard, winner). Where it is
 * fixed, its z-30 sits above the round overlays (`z-20`) so the switcher stays
 * clickable mid-round, but below the modal dialogs (`z-50`) and the splash
 * (`z-[1000]`), which may cover it. The flag selection itself lives in the separate
 * `LanguageSwitcher` component; `__APP_VERSION__` is injected at build time.
 */
export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer
      data-testid={T.footer.root}
      className="mt-8 px-4 pb-2 text-center text-gray-500 text-sm md:fixed md:inset-x-0 md:bottom-0 md:z-30 md:mt-0 md:border-t md:border-gray-200 md:bg-white/95 md:pt-1 md:backdrop-blur"
    >
      <LanguageSwitcher />
      <span data-testid={T.footer.copyright}>
        {t('footer.copy', { year, version: __APP_VERSION__ })}
      </span>
    </footer>
  );
}
