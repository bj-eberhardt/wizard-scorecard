import { test, expect, openApp, startGame, submitPredictions } from './fixtures';
import { T } from '../src/test-ids';

/**
 * Waiting / artificial-delay behaviour. These are the ONLY specs that intentionally
 * open the app WITHOUT the `?e2e=1` bypass, because they verify the delays that the
 * e2e flag normally neutralises:
 *   - the loading splash shown over the start screen before the game is configured
 *   - the result-overlay submit lock that briefly blocks confirming a round
 * Interactions here wait out the real timers, so these tests are intentionally slower.
 */

test.describe('Waiting behaviour (no e2e bypass)', () => {
  test('Start screen: splash overlay is shown, then unmounts', async ({ game }) => {
    await test.step('Open the app without the e2e bypass (real timing)', async () => {
      await openApp(game, { e2e: false });
      // The splash renders on top of the (already mounted) start screen.
      await expect(game.getByTestId(T.loading.splash)).toBeVisible();
    });
    await test.step('Splash disappears after the ~2s delay', async () => {
      // Production timer is 2000ms; assert it is gone shortly after (bounded wait).
      await expect(game.getByTestId(T.loading.splash)).toHaveCount(0, { timeout: 5000 });
      await expect(game.getByTestId(T.config.root)).toBeVisible();
    });
  });

  test('Result submit lock: blocked on open, released after ~2s', async ({ game }) => {
    await test.step('Open without bypass, configure a game and predict round 1', async () => {
      await openApp(game, { e2e: false });
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(game, [1, 0, 0]);
    });
    await test.step('Submit is locked immediately after the overlay opens', async () => {
      await expect(game.getByTestId(T.result.submit)).toHaveAttribute('data-submit-ready', 'false');
    });
    await test.step('After ~2s the submit is released', async () => {
      await expect(game.getByTestId(T.result.submit)).toHaveAttribute('data-submit-ready', 'true', {
        timeout: 5000,
      });
    });
  });
});
