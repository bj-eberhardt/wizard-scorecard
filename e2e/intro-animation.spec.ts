import { test, expect, openApp, seedGameState } from './fixtures';
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
});
