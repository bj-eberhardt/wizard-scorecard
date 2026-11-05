import { test, expect, openApp, seedGameState, submitResults } from './fixtures';
import { T } from '../src/test-ids';

const players = [
  { name: 'Anna', predictions: [1], results: [], points: [] },
  { name: 'Ben', predictions: [0], results: [], points: [] },
  { name: 'Cia', predictions: [0], results: [], points: [] },
];

test.describe('Dialog intro animation settings', () => {
  test('enabled animation appears in both dialogs and then reveals the forms', async ({ game }) => {
    await test.step('Open the prediction dialog with the animation enabled', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 1,
        totalRounds: 3,
        overlay: 'prediction',
        players,
      });
      await openApp(game, { showIntroAnimation: true });
      await expect(game.getByTestId(T.prediction.intro)).toBeVisible();
      await expect(game.getByTestId(T.prediction.introImage)).toBeVisible();
      await expect(game.getByTestId(T.prediction.playerRow(0))).toHaveCount(0);
    });

    await test.step('After one animation playback, prediction inputs are revealed', async () => {
      await expect(game.getByTestId(T.prediction.intro)).toHaveCount(0, { timeout: 7000 });
      await expect(game.getByTestId(T.prediction.input(0))).toBeVisible();
      await game.getByTestId(T.prediction.submit).click();
    });

    await test.step('Result dialog starts with its own animation', async () => {
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await expect(game.getByTestId(T.result.intro)).toBeVisible();
      await expect(game.getByTestId(T.result.introImage)).toBeVisible();
      await expect(game.getByTestId(T.result.playerRow(0))).toHaveCount(0);
      await expect(game.getByTestId(T.result.intro)).toHaveCount(0, { timeout: 7000 });
      await expect(game.getByTestId(T.result.input(0))).toBeVisible();
    });
  });

  test('disabled animation skips both intros and shows the forms immediately', async ({ game }) => {
    await test.step('Open prediction with the animation disabled', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 1,
        totalRounds: 3,
        overlay: 'prediction',
        players,
      });
      await openApp(game);
      await expect(game.getByTestId(T.prediction.intro)).toHaveCount(0);
      await expect(game.getByTestId(T.prediction.input(0))).toBeVisible();
    });

    await test.step('Result also skips the animation', async () => {
      await game.getByTestId(T.prediction.submit).click();
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await expect(game.getByTestId(T.result.intro)).toHaveCount(0);
      await expect(game.getByTestId(T.result.input(0))).toBeVisible();
    });
  });

  test('restarts the intro when a new prediction dialog is mounted', async ({ game }) => {
    await test.step('Open the first prediction dialog with animation enabled', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 1,
        totalRounds: 3,
        overlay: 'prediction',
        players: [{ name: 'Anna' }, { name: 'Ben' }, { name: 'Cia' }],
      });
      await openApp(game, { showIntroAnimation: true });
      await expect(game.getByTestId(T.prediction.intro)).toBeVisible();
      await expect(game.getByTestId(T.prediction.playerRow(0))).toHaveCount(0);
      await expect(game.getByTestId(T.prediction.intro)).toHaveCount(0, { timeout: 7000 });
    });

    await test.step('Complete the round and wait for the result intro', async () => {
      await game.getByTestId(T.prediction.submit).click();
      await expect(game.getByTestId(T.result.intro)).toBeVisible();
      await expect(game.getByTestId(T.result.playerRow(0))).toHaveCount(0);
      await expect(game.getByTestId(T.result.intro)).toHaveCount(0, { timeout: 7000 });
      await submitResults(game, [1, 0, 0]);
    });

    await test.step('Start the next round and verify a fresh prediction intro', async () => {
      await game.getByTestId(T.app.nextRound).click();
      await expect(game.getByTestId(T.prediction.intro)).toBeVisible();
      await expect(game.getByTestId(T.prediction.introImage)).toBeVisible();
      await expect(game.getByTestId(T.prediction.playerRow(0))).toHaveCount(0);
    });
  });

  test('skips the resumed prediction intro after a hard reload', async ({ page }) => {
    await test.step('Seed and open a prediction dialog with animation enabled', async () => {
      await seedGameState(page, {
        gameStarted: true,
        currentRound: 1,
        totalRounds: 3,
        overlay: 'prediction',
        players: [{ name: 'Anna' }, { name: 'Ben' }, { name: 'Cia' }],
      });
      await openApp(page, { showIntroAnimation: true });
      await expect(page.getByTestId(T.prediction.intro)).toBeVisible();
    });

    await test.step('Reloading resumes the prediction form without its intro', async () => {
      await page.reload();
      await expect(page.getByTestId(T.prediction.overlay)).toBeVisible();
      await expect(page.getByTestId(T.prediction.intro)).toHaveCount(0);
      await expect(page.getByTestId(T.prediction.input(0))).toBeVisible();
    });
  });

  test('skips the resumed result intro after a hard reload', async ({ page }) => {
    await test.step('Seed and open a result dialog with animation enabled', async () => {
      await seedGameState(page, {
        gameStarted: true,
        currentRound: 2,
        totalRounds: 3,
        overlay: 'result',
        players: [
          { name: 'Anna', predictions: [1, 0], results: [1], points: [30] },
          { name: 'Ben', predictions: [0, 1], results: [0], points: [20] },
          { name: 'Cia', predictions: [0, 0], results: [0], points: [20] },
        ],
      });
      await openApp(page, { showIntroAnimation: true });
      await expect(page.getByTestId(T.result.intro)).toBeVisible();
    });

    await test.step('Reloading resumes the result form without its intro', async () => {
      await page.reload();
      await expect(page.getByTestId(T.result.overlay)).toBeVisible();
      await expect(page.getByTestId(T.result.intro)).toHaveCount(0);
      await expect(page.getByTestId(T.result.input(0))).toBeVisible();
    });
  });
});
