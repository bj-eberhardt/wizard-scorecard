import {
  test,
  expect,
  openApp,
  startGame,
  submitPredictions,
  submitResults,
  seedGameState,
  expectError,
} from './fixtures';
import { T } from '../src/test-ids';

/**
 * ResultOverlay: points formula, all-zero confirmation, cloud (Wolke) rules and
 * revert. Points/tricks are asserted through the scoreboard's data-* attributes
 * (numeric), so no localized text is involved. The submit-lock (which relies on
 * the artificial delay) is covered separately in waiting.spec.ts without ?e2e.
 */

/** Seed a mid-game state at round 4 (start index 0 -> rows map to players 1:1). */
async function seedRound4(game: import('@playwright/test').Page, extra: object = {}) {
  await seedGameState(game, {
    gameStarted: true,
    currentRound: 4,
    totalRounds: 15,
    overlay: 'result',
    players: [
      { name: 'P0', predictions: [1, 2, 2, 2], points: [30, 50, 100] },
      { name: 'P1', predictions: [1, 2, 2, 2], points: [30, 50, 100] },
      { name: 'P2', predictions: [1, 2, 2, 2], points: [30, 50, 100] },
    ],
    ...extra,
  });
}

test.describe('Enter results', () => {
  test('Points formula correct (all predictions hit)', async ({ game }) => {
    await test.step('Start a game and predict round 1 [1,1,0]', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(game, [1, 1, 0]);
    });
    await test.step('Out-of-range results -> app errors, not native browser validation', async () => {
      const input = game.getByTestId(T.result.input(0));
      // No `max` attribute -> the browser lets the submit through and does not
      // clamp the typed value, so the localized banners are reachable.
      await expect(input).not.toHaveAttribute('max');
      await input.fill('9');
      await expect(input).toHaveValue('9');
      const submit = game.getByTestId(T.result.submit);
      await expect(submit).toHaveAttribute('data-submit-ready', 'true');
      await submit.click();
      await expectError(game, T.result.error, 'errors.valueTooLarge');
      // The round must NOT have been submitted: the overlay is still open.
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await input.fill('-1');
      await submit.click();
      await expectError(game, T.result.error, 'errors.valueTooSmall');
    });
    await test.step('Results [1,1,0] -> all correct: 30/30/20', async () => {
      await submitResults(game, [1, 1, 0]);
      // correct: 20 + value*10  -> P0/P1: 30, P2 (value 0): 20
      await expect(game.getByTestId(T.scoreboard.cell(0, 0, 'points'))).toHaveAttribute(
        'data-points',
        '30'
      );
      await expect(game.getByTestId(T.scoreboard.cell(1, 0, 'points'))).toHaveAttribute(
        'data-points',
        '30'
      );
      await expect(game.getByTestId(T.scoreboard.cell(2, 0, 'points'))).toHaveAttribute(
        'data-points',
        '20'
      );
    });
  });

  test('Points formula correct (misses count negative)', async ({ game }) => {
    await test.step('Predict round 1 [1,1,1]', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(game, [1, 1, 1]);
    });
    await test.step('Results [0,0,1]: P0/P1 -10, P2 +30', async () => {
      await submitResults(game, [0, 0, 1]);
      await expect(game.getByTestId(T.scoreboard.cell(0, 0, 'points'))).toHaveAttribute(
        'data-points',
        '-10'
      );
      await expect(game.getByTestId(T.scoreboard.cell(1, 0, 'points'))).toHaveAttribute(
        'data-points',
        '-10'
      );
      await expect(game.getByTestId(T.scoreboard.cell(2, 0, 'points'))).toHaveAttribute(
        'data-points',
        '30'
      );
    });
  });

  test('All-zero confirmation in round > 1', async ({ game }) => {
    await test.step('Seed round 4 with inputs', async () => {
      await seedRound4(game);
      await openApp(game);
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
    await test.step('All results 0 -> first click shows the confirmation', async () => {
      const submit = game.getByTestId(T.result.submit);
      await expect(submit).toHaveAttribute('data-submit-ready', 'true');
      await submit.click();
      await expect(game.getByTestId(T.result.confirmZero)).toBeVisible();
    });
    await test.step('Second click confirms and the round is completed', async () => {
      await game.getByTestId(T.result.submit).click();
      await expect(game.getByTestId(T.result.overlay)).toHaveCount(0);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
  });

  test('Wolke: difference 1 becomes a correct prediction (points +)', async ({ game }) => {
    await test.step('Seed round 4 with the anniversary rule', async () => {
      await seedRound4(game, { useAnniversaryRules: true });
      await openApp(game);
    });
    await test.step('P0: result 1 + Wolke (prediction 2, diff 1) -> counted as 2, correct', async () => {
      await submitResults(game, [1, 0, 0], 0);
      // P0 correct: +20+2*10=+40 -> 100+40=140
      await expect(game.getByTestId(T.scoreboard.cell(0, 3, 'points'))).toHaveAttribute(
        'data-points',
        '140'
      );
    });
    await test.step('Scoreboard tricks cell shows entered → evaluated with the Wolke marker', async () => {
      const tricks = game.getByTestId(T.scoreboard.cell(0, 3, 'tricks'));
      await expect(tricks).toHaveAttribute('data-tricks', '2');
      await expect(tricks).toHaveAttribute('data-received-tricks', '1');
      await expect(tricks).toHaveAttribute('data-wolke', 'true');
      // numbers + arrow are not localized, so the rendered value can be asserted
      await expect(tricks).toHaveText('1\u21922 \u2601');
      // a player without Wolke shows the plain value only
      const plain = game.getByTestId(T.scoreboard.cell(1, 3, 'tricks'));
      await expect(plain).toHaveAttribute('data-wolke', 'false');
      await expect(plain).toHaveText('0');
    });
  });

  test('Wolke: value < 1 forbidden (wolkeMinOne)', async ({ game }) => {
    await test.step('Seed round 4 with the anniversary rule', async () => {
      await seedRound4(game, { useAnniversaryRules: true });
      await openApp(game);
    });
    await test.step('Result 0 with Wolke -> error wolkeMinOne', async () => {
      // Not all zeros, so the all-zero confirmation does not fire first.
      await game.getByTestId(T.result.input(0)).fill('0');
      await game.getByTestId(T.result.input(1)).fill('1');
      await game.getByTestId(T.result.wolke(0)).check();
      const submit = game.getByTestId(T.result.submit);
      await expect(submit).toHaveAttribute('data-submit-ready', 'true');
      await submit.click();
      await expectError(game, T.result.error, 'errors.wolkeMinOne');
    });
  });

  test('Wolke: only one Wolke per round allowed (onlyOneWolke)', async ({ game }) => {
    await test.step('Seed round 4 with the anniversary rule', async () => {
      await seedRound4(game, { useAnniversaryRules: true });
      await openApp(game);
    });
    await test.step('Set two Wolken -> error onlyOneWolke', async () => {
      await game.getByTestId(T.result.input(0)).fill('1');
      await game.getByTestId(T.result.input(1)).fill('1');
      await game.getByTestId(T.result.wolke(0)).check();
      await game.getByTestId(T.result.wolke(1)).check();
      const submit = game.getByTestId(T.result.submit);
      await expect(submit).toHaveAttribute('data-submit-ready', 'true');
      await submit.click();
      await expectError(game, T.result.error, 'errors.onlyOneWolke');
    });
  });

  test('Revert button returns to the prediction overlay', async ({ game }) => {
    await test.step('Seed round 4 and open the overlay', async () => {
      await seedRound4(game);
      await openApp(game);
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
    await test.step('Click revert -> prediction overlay appears', async () => {
      await game.getByTestId(T.result.revert).click();
      await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
      await expect(game.getByTestId(T.result.overlay)).toHaveCount(0);
    });
  });
});
