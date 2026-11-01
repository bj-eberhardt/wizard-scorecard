import { test, expect, openApp, startGame } from './fixtures';
import { T } from '../src/test-ids';

/**
 * Responsive behaviour. Desktop checks run in the desktop project; tests whose
 * title contains @mobile run only in the chromium-mobile project (Pixel 7).
 */

test.describe('Responsive', () => {
  test('Desktop: fullscreen button is not rendered', async ({ game }) => {
    await test.step('Open the app on a desktop viewport', async () => {
      await openApp(game);
      await expect(game.getByTestId(T.config.root)).toBeVisible();
    });
    await test.step('No fullscreen button (mobile only)', async () => {
      await expect(game.getByTestId(T.header.fullscreen)).toHaveCount(0);
    });
  });

  test('Mobile: fullscreen button is visible @mobile', async ({ game }) => {
    await test.step('Open the app on a mobile viewport', async () => {
      await openApp(game);
      await expect(game.getByTestId(T.config.root)).toBeVisible();
    });
    await test.step('Fullscreen button is present', async () => {
      await expect(game.getByTestId(T.header.fullscreen)).toBeVisible();
    });
  });

  test('Mobile: overlay inputs are reachable @mobile', async ({ game }) => {
    await test.step('Start a game with 3 players', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
    });
    await test.step('Prediction overlay and input fields are visible/usable', async () => {
      await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
      for (let i = 0; i < 3; i++) {
        await expect(game.getByTestId(T.prediction.input(i))).toBeVisible();
      }
      await game.getByTestId(T.prediction.input(0)).fill('1');
      await expect(game.getByTestId(T.prediction.input(0))).toHaveValue('1');
    });
  });
});
