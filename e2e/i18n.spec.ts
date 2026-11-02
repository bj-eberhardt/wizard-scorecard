import {
  test,
  expect,
  openApp,
  seedGameState,
  startGame,
  submitPredictions,
  submitResults,
  SETTINGS_KEY,
} from './fixtures';
import type { Page } from '@playwright/test';
import { T } from '../src/test-ids';

/**
 * Localization safety: the SAME data-testid structure must be present under both
 * German and English. Because the suite never asserts on visible text, these
 * tests prove that a locale change cannot break any selector.
 */

test.describe('Localization safety', () => {
  for (const locale of ['de', 'en'] as const) {
    test(`Structure is identical in ${locale.toUpperCase()}`, async ({ game }) => {
      await test.step(`Open the app in language "${locale}"`, async () => {
        await openApp(game, { locale });
      });
      await test.step('Core elements are findable by their test ids', async () => {
        await expect(game.getByTestId(T.config.root)).toBeVisible();
        await expect(game.getByTestId(T.config.playerName(0))).toBeVisible();
        // at boot no names are entered yet, so the rounds block is hidden; the
        // "+" add-player button is the locale-independent element present here
        await expect(game.getByTestId(T.config.addPlayer)).toBeVisible();
        await expect(game.getByTestId(T.config.anniversary)).toBeVisible();
        await expect(game.getByTestId(T.config.notEqual)).toBeVisible();
        await expect(game.getByTestId(T.config.startButton)).toBeVisible();
      });
      await test.step('Start a game -> overlay structure stays language-independent', async () => {
        for (let i = 0; i < 3; i++) {
          await game.getByTestId(T.config.playerName(i)).fill(`S${i + 1}`);
        }
        await game.getByTestId(T.config.startButton).click();
        await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
        await expect(game.getByTestId(T.prediction.input(0))).toBeVisible();
        await expect(game.getByTestId(T.prediction.submit)).toBeVisible();
        // dealer / start-player info lines exist in BOTH locales — their sentences differ,
        // so only the ids are asserted, never the text
        await expect(game.getByTestId(T.prediction.dealerInfo)).toBeVisible();
        await expect(game.getByTestId(T.prediction.startPlayerInfo)).toBeVisible();
      });
      await test.step('Scoreboard header keeps its three column labels per player', async () => {
        // the scoreboard renders behind the overlay, so the header is measurable
        // in both locales without asserting any of the (localized) label texts
        await expect(game.getByTestId(T.scoreboard.table)).toBeAttached();
        for (let player = 0; player < 3; player++) {
          await expect(game.getByTestId(T.scoreboard.headerPlayer(player))).toBeAttached();
          for (const kind of ['prediction', 'tricks', 'points'] as const) {
            await expect(game.getByTestId(T.scoreboard.headerLabel(player, kind))).toBeAttached();
          }
        }
      });
    });
  }

  test.describe('Footer language switcher', () => {
    /** The active button carries aria-pressed; the flags are graphics, so no text is asserted. */
    const expectActive = async (page: Page, code: 'de' | 'en') => {
      await expect(page.getByTestId(T.footer.langButton(code))).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      const other = page.getByTestId(T.footer.langButton(code === 'de' ? 'en' : 'de'));
      await expect(other).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('html')).toHaveAttribute('lang', code);
    };

    test('Flag buttons switch the language and persist across reload', async ({ game }) => {
      await test.step('Open the app; both flag buttons are present and centred', async () => {
        await openApp(game);
        // Which language boots without an explicit choice depends on the
        // browser detector, so nothing is asserted about it here — only that
        // each button renders its flag graphic and carries its language code.
        for (const code of ['de', 'en'] as const) {
          const button = game.getByTestId(T.footer.langButton(code));
          await expect(button).toBeVisible();
          await expect(button).toHaveAttribute('data-lang', code);
          await expect(button.locator('svg')).toHaveCount(1);
        }
        const pressed = await game.evaluate(() =>
          Array.from(document.querySelectorAll('[data-testid^="footer-lang-"]')).filter(
            (el) => el.getAttribute('aria-pressed') === 'true'
          )
        );
        // whatever the detector picked, exactly one flag is marked active
        expect(pressed).toHaveLength(1);
      });
      await test.step('Both flags are 44px touch targets', async () => {
        for (const code of ['de', 'en'] as const) {
          const box = await game.getByTestId(T.footer.langButton(code)).boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(44);
          expect(box?.height).toBeGreaterThanOrEqual(44);
        }
      });
      await test.step('Desktop shows flags + copyright', async () => {
        await expect(game.getByTestId(T.footer.copyright)).toBeVisible();
      });
      await test.step('Click the British flag -> UI and <html lang> switch to English', async () => {
        await game.getByTestId(T.footer.langButton('en')).click();
        await expectActive(game, 'en');
      });
      await test.step('Choice is persisted in the settings store', async () => {
        const stored = await game.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY);
        expect(JSON.parse(stored ?? '{}')?.state?.language).toBe('en');
      });
      await test.step('Switch to German and reload -> the stored choice survives', async () => {
        await game.getByTestId(T.footer.langButton('de')).click();
        await expectActive(game, 'de');
        // The `game` fixture clears localStorage on EVERY navigation, so the
        // click itself cannot survive a reload here. Seed the exact state the
        // click persisted (previous step proves that shape is written) and
        // reload: a real refresh keeps wizard_settings_v1 and boots the same way.
        await game.addInitScript(
          ([key, payload]) => localStorage.setItem(key, payload),
          [SETTINGS_KEY, JSON.stringify({ state: { language: 'de' }, version: 0 })]
        );
        await game.reload();
        await expectActive(game, 'de');
      });
    });

    test('Mobile: the footer shows flags and copyright like desktop @mobile', async ({ game }) => {
      await test.step('Flags and copyright are visible', async () => {
        await openApp(game);
        await expect(game.getByTestId(T.footer.langButton('de'))).toBeVisible();
        await expect(game.getByTestId(T.footer.langButton('en'))).toBeVisible();
        await expect(game.getByTestId(T.footer.copyright)).toBeVisible();
      });
      await test.step('The footer flows after the content instead of pinning to the bottom', async () => {
        const footer = game.getByTestId(T.footer.root);
        await expect(footer).toHaveCSS('position', 'static');
      });
      await test.step('Clicking a flag switches language and persists', async () => {
        await game.getByTestId(T.footer.langButton('en')).click();
        await expectActive(game, 'en');
        const stored = await game.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY);
        expect(JSON.parse(stored ?? '{}')?.state?.language).toBe('en');
      });
    });

    test('Stored choice overrides the browser-detected language', async ({ game }) => {
      // i18nextLng is explicitly set to en by openApp, but the persisted
      // explicit choice (de) must win — the override path.
      await test.step('Seed an explicit "de" choice, then open with locale "en"', async () => {
        await game.addInitScript(
          ([key, payload]) => localStorage.setItem(key, payload),
          [SETTINGS_KEY, JSON.stringify({ state: { language: 'de' }, version: 0 })]
        );
        await openApp(game, { locale: 'en' });
        await expectActive(game, 'de');
      });
      await test.step('Switching to en updates the stored choice as well', async () => {
        await game.getByTestId(T.footer.langButton('en')).click();
        await expectActive(game, 'en');
        const stored = await game.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY);
        expect(JSON.parse(stored ?? '{}')?.state?.language).toBe('en');
      });
    });

    test('Footer is always visible and switches on every screen', async ({ game }) => {
      /**
       * On desktop the footer is a fixed bar rendered above the round overlays
       * (z-30 over z-20), so the language is reachable mid-round without ever
       * navigating away. The overlays must NOT host their own switcher — there is
       * exactly one, in the footer — and it stays visible and clickable while a
       * modal overlay is open. (On mobile the footer flows after the content;
       * the @mobile test above verifies that it shows the same flags.)
       */
      const expectOverlayWithoutOwnSwitcher = async (overlayTestId: string) => {
        await expect(game.getByTestId(overlayTestId)).toBeVisible();
        await expect(
          game.getByTestId(overlayTestId).getByTestId(T.footer.langButton('de'))
        ).toHaveCount(0);
        // the single footer switcher is on top of the overlay and clickable
        await expect(game.getByTestId(T.footer.langButton('de'))).toBeVisible();
      };

      await test.step('Start screen shows the footer (fixed on desktop)', async () => {
        await openApp(game);
        await expect(game.getByTestId(T.config.root)).toBeVisible();
        await expect(game.getByTestId(T.footer.langButton('de'))).toBeVisible();
        await expect(game.getByTestId(T.footer.root)).toHaveCSS('position', 'fixed');
      });
      await test.step('Prediction overlay: footer on top, no own switcher', async () => {
        await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
        await expectOverlayWithoutOwnSwitcher(T.prediction.overlay);
      });
      await test.step('Switching works while the prediction overlay is open', async () => {
        await game.getByTestId(T.footer.langButton('en')).click();
        await expectActive(game, 'en');
        await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
      });
      await test.step('Result overlay likewise', async () => {
        await submitPredictions(game, [1, 0, 0]);
        await expectOverlayWithoutOwnSwitcher(T.result.overlay);
      });
      await test.step('Scoreboard: switching works with a running game', async () => {
        await submitResults(game, [1, 0, 0]);
        await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
        await game.getByTestId(T.footer.langButton('de')).click();
        await expectActive(game, 'de');
      });
      await test.step('Winner screen still offers the switcher', async () => {
        await seedGameState(game, {
          gameStarted: true,
          currentRound: 4, // > totalRounds -> game over
          totalRounds: 3,
          overlay: 'none',
          players: [100, 50, 200].map((p, i) => ({
            name: `P${i}`,
            predictions: [1, 1, 1],
            results: [1, 1, 1],
            points: [Math.round(p / 3), Math.round((2 * p) / 3), p],
          })),
        });
        await openApp(game);
        await expect(game.getByTestId(T.winner.container)).toBeVisible();
        await game.getByTestId(T.footer.langButton('de')).click();
        await expectActive(game, 'de');
      });
    });
  });
});
