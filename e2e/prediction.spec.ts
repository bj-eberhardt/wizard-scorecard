import {
  test,
  expect,
  openApp,
  startGame,
  submitPredictions,
  seedGameState,
  expectError,
} from './fixtures';
import { T } from '../src/test-ids';

/**
 * PredictionOverlay: input, validation, not-equal rule, start-player rotation and
 * prefilling of existing predictions. Rotation/prefill are verified through seeded
 * state + input values (data-driven), never through localized labels.
 */

test.describe('Enter tricks (prediction)', () => {
  test('Happy path: submitting predictions leads to the result overlay', async ({ game }) => {
    await test.step('Start a game with 3 players', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
    });
    await test.step('Round 1: enter valid predictions and start', async () => {
      await submitPredictions(game, [1, 0, 0]);
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
  });

  test('Validation: prediction too large', async ({ game }) => {
    await test.step('Start a game (round 1, max 1 trick)', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
    });
    await test.step('Enter value 5 -> app error (not native browser validation)', async () => {
      const input = game.getByTestId(T.prediction.input(0));
      // No `max` attribute: the browser must not clamp the value or swallow the
      // submit — otherwise our own localized validation would be unreachable.
      await expect(input).not.toHaveAttribute('max');
      await input.fill('5');
      await expect(input).toHaveValue('5');
      await game.getByTestId(T.prediction.submit).click();
      await expectError(game, T.prediction.error, 'errors.predictionTooLarge');
      await expect(game.getByTestId(T.result.overlay)).toHaveCount(0);
    });
    await test.step('Correct to a valid value -> submission proceeds', async () => {
      await submitPredictions(game, [1, 0, 0]);
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
  });

  test('Validation: prediction too small (negative)', async ({ game }) => {
    await test.step('Start a game', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
    });
    await test.step('Enter value -1 -> error predictionTooSmall', async () => {
      await game.getByTestId(T.prediction.input(0)).fill('-1');
      await game.getByTestId(T.prediction.submit).click();
      await expectError(game, T.prediction.error, 'errors.predictionTooSmall');
    });
  });

  test("'Not equal' rule blocks sum == round count", async ({ game }) => {
    await test.step('Start a game with notEqual enabled', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'], notEqual: true });
    });
    await test.step('Sum 1 in round 1 -> error predictionNotEqualLast', async () => {
      await submitPredictionsExpectError(game, [1, 0, 0], 'errors.predictionNotEqualLast');
    });
    await test.step('Diverging sum (2) -> proceeds to the result overlay', async () => {
      await submitPredictions(game, [1, 1, 0]);
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
  });

  test('Start-player rotation: order and prefill', async ({ game }) => {
    await test.step('Seed round 3 with 4 players and existing predictions', async () => {
      // currentRound 3 -> start index (3-1)%4 = 2 -> order P2,P3,P0,P1
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 3,
        totalRounds: 15,
        overlay: 'prediction',
        players: [
          { name: 'P0', predictions: [1, 1, 1], results: [], points: [10, 20, 30] },
          { name: 'P1', predictions: [2, 2, 2], results: [], points: [20, 40, 60] },
          { name: 'P2', predictions: [0, 0, 3], results: [], points: [0, 0, 50] },
          { name: 'P3', predictions: [1, 0, 2], results: [], points: [10, 10, 20] },
        ],
      });
      await openApp(game);
    });
    await test.step('Overlay shows rotated order with prefilled values', async () => {
      await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
      // Row 0 is the start player (P2) with prediction 3 from round 3
      await expect(game.getByTestId(T.prediction.playerRow(0))).toHaveAttribute(
        'data-start-player',
        'true'
      );
      await expect(game.getByTestId(T.prediction.input(0))).toHaveValue('3'); // P2
      await expect(game.getByTestId(T.prediction.input(1))).toHaveValue('2'); // P3
      await expect(game.getByTestId(T.prediction.input(2))).toHaveValue('1'); // P0
      await expect(game.getByTestId(T.prediction.input(3))).toHaveValue('2'); // P1
    });
  });
});

/** Helper: submit predictions expecting an error instead of the result overlay. */
async function submitPredictionsExpectError(
  game: import('@playwright/test').Page,
  values: number[],
  errorKey: string
) {
  for (let i = 0; i < values.length; i++) {
    await game.getByTestId(T.prediction.input(i)).fill(String(values[i]));
  }
  await game.getByTestId(T.prediction.submit).click();
  await expectError(game, T.prediction.error, errorKey);
}
