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
      { name: 'P0', predictions: [1, 2, 2, 2], results: [1, 2, 2], points: [30, 50, 100] },
      { name: 'P1', predictions: [1, 2, 2, 2], results: [1, 2, 2], points: [30, 50, 100] },
      { name: 'P2', predictions: [1, 2, 2, 2], results: [1, 2, 2], points: [30, 50, 100] },
    ],
    ...extra,
  });
}

test.describe('Enter results', () => {
  test('Points formula correct (all predictions hit)', async ({ game }) => {
    await test.step('Start a game and predict round 1 [1,0,0]', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(game, [1, 0, 0]);
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
    await test.step('Results [1,0,0] -> all correct: 30/20/20', async () => {
      await submitResults(game, [1, 0, 0]);
      // correct: 20 + value*10 -> P0: 30, P1/P2 (value 0): 20
      await expect(game.getByTestId(T.scoreboard.cell(0, 0, 'points'))).toHaveAttribute(
        'data-points',
        '30'
      );
      await expect(game.getByTestId(T.scoreboard.cell(1, 0, 'points'))).toHaveAttribute(
        'data-points',
        '20'
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

  test('All-zero results fail the sum validation in round > 1', async ({ game }) => {
    await test.step('Seed round 4 with inputs', async () => {
      await seedRound4(game);
      await openApp(game);
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
    await test.step('All results 0 -> sum validation error', async () => {
      const submit = game.getByTestId(T.result.submit);
      await expect(submit).toHaveAttribute('data-submit-ready', 'true');
      await submit.click();
      await expectError(game, T.result.error, 'errors.resultSum');
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
  });

  test('Result sum must match the round number', async ({ game }) => {
    await test.step('Seed round 4 without anniversary rules', async () => {
      await seedRound4(game, { useAnniversaryRules: false });
      await openApp(game);
    });
    await test.step('Reject results whose sum is below the round number', async () => {
      await game.getByTestId(T.result.input(0)).fill('1');
      await game.getByTestId(T.result.input(1)).fill('1');
      await game.getByTestId(T.result.input(2)).fill('1');
      const submit = game.getByTestId(T.result.submit);
      await expect(submit).toHaveAttribute('data-submit-ready', 'true');
      await submit.click();
      await expectError(game, T.result.error, 'errors.resultSum');
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
    await test.step('Accept results whose sum equals the round number', async () => {
      await game.getByTestId(T.result.input(2)).fill('2');
      await game.getByTestId(T.result.submit).click();
      await expect(game.getByTestId(T.result.overlay)).toHaveCount(0);
    });
  });

  test('Anniversary rules allow one missing trick', async ({ game }) => {
    await test.step('Seed round 4 with anniversary rules', async () => {
      await seedRound4(game, { useAnniversaryRules: true });
      await openApp(game);
    });
    await test.step('Accept result sum equal to round number minus one', async () => {
      await submitResults(game, [1, 1, 1]);
      await expect(game.getByTestId(T.result.overlay)).toHaveCount(0);
    });
  });

  test('Wolke checkbox is reachable with Tab', async ({ game }) => {
    await test.step('Open a result overlay with anniversary rules', async () => {
      await seedRound4(game, { useAnniversaryRules: true });
      await openApp(game);
      await expect(game.getByTestId(T.result.wolke(0))).toBeVisible();
    });
    await test.step('Tab from the first result input to the first Wolke checkbox', async () => {
      await expect(game.getByTestId(T.result.input(0))).toBeFocused();
      await game.keyboard.press('Tab');
      await expect(game.getByTestId(T.result.wolke(0))).toBeFocused();
    });
  });

  test('Wolke: difference 1 becomes a correct prediction (points +)', async ({ game }) => {
    await test.step('Seed round 4 with the anniversary rule', async () => {
      await seedRound4(game, { useAnniversaryRules: true });
      await openApp(game);
    });
    await test.step('P0: result 1 + Wolke (prediction 2, diff 1) -> counted as 2, correct', async () => {
      await submitResults(game, [1, 1, 1], 0);
      // Wolke changes prediction 2 to 1: +20+1*10=+30 -> 100+30=130
      await expect(game.getByTestId(T.scoreboard.cell(0, 3, 'points'))).toHaveAttribute(
        'data-points',
        '130'
      );
    });
    await test.step('Scoreboard tricks cell shows entered → evaluated with the Wolke marker', async () => {
      const tricks = game.getByTestId(T.scoreboard.cell(0, 3, 'tricks'));
      await expect(tricks).toHaveAttribute('data-tricks', '1');
      await expect(tricks).toHaveAttribute('data-received-tricks', '1');
      await expect(tricks).toHaveAttribute('data-wolke', 'true');
      // numbers + arrow are not localized, so the rendered value can be asserted
      await expect(tricks).toHaveText('1 \u2601');
      // a player without Wolke shows the plain value only
      const plain = game.getByTestId(T.scoreboard.cell(1, 3, 'tricks'));
      await expect(plain).toHaveAttribute('data-wolke', 'false');
      await expect(plain).toHaveText('1');
    });
  });

  test('Wolke: larger misses keep the remaining difference after adjusting the prediction', async ({
    game,
  }) => {
    await test.step('Seed a round where the Wolke player is three tricks away', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 4,
        totalRounds: 15,
        overlay: 'result',
        useAnniversaryRules: true,
        players: [
          { name: 'P0', predictions: [1, 2, 2, 4], results: [1, 2, 2], points: [30, 50, 100] },
          { name: 'P1', predictions: [1, 2, 2, 2], results: [1, 2, 2], points: [30, 50, 100] },
          { name: 'P2', predictions: [1, 2, 2, 2], results: [1, 2, 2], points: [30, 50, 100] },
        ],
      });
      await openApp(game);
    });
    await test.step('Submit result 1 with Wolke for the player who predicted 4', async () => {
      await submitResults(game, [1, 1, 2], 0);
    });
    await test.step('The Wolke adjusts the prediction to 3, so the round costs 20 points', async () => {
      await expect(game.getByTestId(T.scoreboard.cell(0, 3, 'points'))).toHaveAttribute(
        'data-points',
        '80'
      );
    });
  });

  test('Wolke: a zero prediction and three received tricks score minus 20', async ({ game }) => {
    await test.step('Seed round 3 for six players with zero predictions', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 3,
        totalRounds: 10,
        overlay: 'result',
        useAnniversaryRules: true,
        players: ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => ({
          name,
          predictions: [0, 0, 0],
          results: [0, 0],
          points: [20, 40],
        })),
      });
      await openApp(game);
    });
    await test.step('Give player B three tricks and mark the Wolke in rotated row 6', async () => {
      await submitResults(game, [0, 0, 0, 0, 0, 3], 5);
    });
    await test.step('The Wolke adjusts bid 0 to 1, leaving a difference of 2', async () => {
      await expect(game.getByTestId(T.scoreboard.cell(1, 2, 'points'))).toHaveAttribute(
        'data-points',
        '20'
      );
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
      await game.getByTestId(T.result.input(2)).fill('2');
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

  test('Mobile: result stepper works with Wolke @mobile', async ({ game }) => {
    await test.step('Seed a result overlay with anniversary rules', async () => {
      await seedRound4(game, { useAnniversaryRules: true });
      await openApp(game);
    });
    await test.step('Use result stepper and keep Wolke control available', async () => {
      const stepper = game.getByTestId(T.result.stepper(0));
      const increase = game.getByTestId(T.result.stepperIncrease(0));
      await expect(stepper).toBeVisible();
      await expect(game.getByTestId(T.result.input(0))).toBeHidden();
      await expect(stepper).toHaveAttribute('aria-valuenow', '2');
      await increase.click();
      await expect(stepper).toHaveAttribute('aria-valuenow', '3');
      await game.getByTestId(T.result.wolke(0)).check();
      await expect(game.getByTestId(T.result.wolke(0))).toBeChecked();
    });
  });

  test('Mobile: long result names keep stepper and Wolke reachable @mobile', async ({ game }) => {
    await test.step('Seed result overlay with long player names', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 1,
        totalRounds: 10,
        overlay: 'result',
        useAnniversaryRules: true,
        players: [
          { name: 'AlexandertheGreatWizard', predictions: [1], results: [], points: [] },
          { name: 'MaximilianvonSpielkarten', predictions: [0], results: [], points: [] },
          { name: 'Christoph', predictions: [0], results: [], points: [] },
        ],
      });
      await openApp(game);
    });
    await test.step('Right-side controls stay inside the viewport', async () => {
      const viewportWidth = await game.evaluate(() => window.innerWidth);
      for (let i = 0; i < 3; i++) {
        const stepper = game.getByTestId(T.result.stepper(i));
        const box = await stepper.boundingBox();
        expect(box).not.toBeNull();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewportWidth);
        await expect(game.getByTestId(T.result.wolke(i))).toBeVisible();
      }
    });
  });
});
