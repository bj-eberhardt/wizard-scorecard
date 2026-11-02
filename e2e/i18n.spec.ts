import { test, expect, openApp } from './fixtures';
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
        await expect(game.getByTestId(T.config.rounds)).toBeVisible();
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
});
