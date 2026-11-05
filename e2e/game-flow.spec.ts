import {
  test,
  expect,
  openApp,
  startGame,
  submitPredictions,
  submitResults,
  openNextRound,
  seedGameState,
} from './fixtures';
import { T } from '../src/test-ids';

/**
 * End-to-end integration across App + store: persistence, reset, round advance
 * with start-player rotation, and reaching the winner view after the last round.
 * Uses the raw `page` fixture where a real reload must preserve localStorage.
 */

test.describe('Game flow (integration)', () => {
  test('Persistence across a reload', async ({ page }) => {
    await test.step('Start a game and finish round 1', async () => {
      await page.goto('/?e2e=1&showDialogIntroAnimation=0');
      await startGame(page, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(page, [1, 0, 0]);
      await submitResults(page, [1, 0, 0]);
      await expect(page.getByTestId(T.scoreboard.cell(0, 0, 'points'))).toHaveAttribute(
        'data-points',
        '30'
      );
    });
    await test.step('Reload: the stored state is preserved', async () => {
      await page.reload();
      await expect(page.getByTestId(T.scoreboard.table)).toBeVisible();
      await expect(page.getByTestId(T.scoreboard.cell(0, 0, 'points'))).toHaveAttribute(
        'data-points',
        '30'
      );
    });
  });

  test('Round advance with start-player rotation', async ({ game }) => {
    await test.step('Play round 1', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(game, [1, 0, 0]);
      await submitResults(game, [1, 0, 0]);
    });
    await test.step('Open the next round (round 2, start player rotates)', async () => {
      await openNextRound(game);
      await expect(game.getByTestId(T.prediction.playerRow(0))).toHaveAttribute(
        'data-start-player',
        'true'
      );
      // Rows follow start index 1 -> B,C,A. Predictions are row-based:
      await submitPredictions(game, [1, 1, 0]); // B=1, C=1, A=0
      await submitResults(game, [1, 1, 0]); // B,C,A all correct
    });
    await test.step('Cumulative points after round 2 are correct', async () => {
      // A: 30 + 20 = 50, B: 20 + 30 = 50, C: 20 + 30 = 50
      await expect(game.getByTestId(T.scoreboard.cell(0, 1, 'points'))).toHaveAttribute(
        'data-points',
        '50'
      );
      await expect(game.getByTestId(T.scoreboard.cell(1, 1, 'points'))).toHaveAttribute(
        'data-points',
        '50'
      );
      await expect(game.getByTestId(T.scoreboard.cell(2, 1, 'points'))).toHaveAttribute(
        'data-points',
        '50'
      );
      await test.step('Both completed rounds retain their visible values', async () => {
        await expect(game.getByTestId(T.scoreboard.cell(0, 0, 'prediction'))).toHaveAttribute(
          'data-prediction',
          '1'
        );
        await expect(game.getByTestId(T.scoreboard.cell(0, 1, 'prediction'))).toHaveAttribute(
          'data-prediction',
          '0'
        );
        await expect(game.getByTestId(T.scoreboard.cell(1, 1, 'tricks'))).toHaveAttribute(
          'data-tricks',
          '1'
        );
        await expect(game.getByTestId(T.scoreboard.cell(2, 1, 'tricks'))).toHaveAttribute(
          'data-tricks',
          '1'
        );
      });
    });
  });

  test('Last completed round can be corrected without losing its entries', async ({ game }) => {
    await test.step('Finish the first round', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(game, [1, 0, 0]);
      await submitResults(game, [1, 0, 0]);
    });

    await test.step('Reopen the completed round with a quiet correction action', async () => {
      await expect(game.getByTestId(T.app.correctLastRound)).toBeVisible();
      await game.getByTestId(T.app.correctLastRound).click();
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await expect(game.getByTestId(T.result.submit)).toHaveAttribute('data-submit-ready', 'true');
      await expect(game.getByTestId(T.result.input(0))).toHaveValue('1');
      await expect(game.getByTestId(T.result.input(1))).toHaveValue('0');
    });

    await test.step('Submit corrected values and return to the scoreboard', async () => {
      await game.getByTestId(T.result.input(0)).fill('0');
      await game.getByTestId(T.result.input(1)).fill('1');
      await submitResults(game, [0, 1, 0]);
      await expect(game.getByTestId(T.scoreboard.cell(0, 0, 'points'))).toHaveAttribute(
        'data-points',
        '-10'
      );
      await expect(game.getByTestId(T.scoreboard.cell(1, 0, 'points'))).toHaveAttribute(
        'data-points',
        '-10'
      );
    });
  });

  test('Correcting a completed round skips the intro and submit countdown', async ({ game }) => {
    await test.step('Seed a completed round and enable dialog intros', async () => {
      await seedGameState(game, {
        players: [
          {
            name: 'Anna',
            predictions: [1],
            results: [1],
            points: [30],
            receivedResults: [1],
          },
          {
            name: 'Ben',
            predictions: [0],
            results: [0],
            points: [20],
            receivedResults: [0],
          },
          {
            name: 'Cia',
            predictions: [0],
            results: [0],
            points: [20],
            receivedResults: [0],
          },
        ],
        currentRound: 2,
        totalRounds: 5,
        gameStarted: true,
      });
      await openApp(game, { showIntroAnimation: true });
    });

    await test.step('Open correction without showing the intro or countdown', async () => {
      await game.getByTestId(T.app.correctLastRound).click();
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await expect(game.getByTestId(T.result.intro)).toHaveCount(0);
      await expect(game.getByTestId(T.result.introImage)).toHaveCount(0);
      await expect(game.getByTestId(T.result.submit)).toHaveAttribute('data-submit-ready', 'true');
      await expect(game.getByTestId(T.result.input(0))).toBeVisible();
    });
  });

  test('Last completed round correction preserves Wolke entries', async ({ game }) => {
    await test.step('Finish a Wolke round', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'], wolke: true });
      await submitPredictions(game, [1, 0, 0]);
      await submitResults(game, [1, 0, 0], 0);
    });
    await test.step('Reopen the round and verify the raw Wolke input is restored', async () => {
      await game.getByTestId(T.app.correctLastRound).click();
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await expect(game.getByTestId(T.result.input(0))).toHaveValue('1');
      await expect(game.getByTestId(T.result.wolke(0))).toBeChecked();
    });
    await test.step('Submit the unchanged correction and keep the Wolke marker', async () => {
      await submitResults(game, [1, 0, 0], 0);
      await expect(game.getByTestId(T.scoreboard.cell(0, 0, 'tricks'))).toHaveAttribute(
        'data-wolke',
        'true'
      );
      await expect(game.getByTestId(T.scoreboard.cell(0, 0, 'tricks'))).toHaveAttribute(
        'data-received-tricks',
        '1'
      );
    });
  });

  test('New game resets everything (with cancel and confirm)', async ({ game }) => {
    await test.step('Start a game and play one round', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
      await submitPredictions(game, [1, 0, 0]);
      await submitResults(game, [1, 0, 0]);
    });
    await test.step('Destructive link is spatially apart from the primary action', async () => {
      const link = await game.getByTestId(T.app.newGame).boundingBox();
      const primary = await game.getByTestId(T.app.nextRound).boundingBox();
      expect(link).not.toBeNull();
      expect(primary).not.toBeNull();
      expect(link!.y + link!.height).toBeLessThanOrEqual(primary!.y - 24);
    });
    await test.step('Confirm dialog is a modal and focuses the safe action', async () => {
      await game.getByTestId(T.app.newGame).click();
      const dialog = game.getByTestId(T.app.confirmDialog);
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('role', 'dialog');
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(game.getByTestId(T.app.confirmCancel)).toBeFocused();
      await game.keyboard.press('Tab');
      await expect(game.getByTestId(T.app.confirmYes)).toBeFocused();
      await game.keyboard.press('Tab');
      await expect(game.getByTestId(T.app.confirmCancel)).toBeFocused();
      await game.keyboard.press('Shift+Tab');
      await expect(game.getByTestId(T.app.confirmYes)).toBeFocused();
    });
    await test.step('Escape cancels and hands focus back to the trigger', async () => {
      await game.keyboard.press('Escape');
      await expect(game.getByTestId(T.app.confirmDialog)).toHaveCount(0);
      await expect(game.getByTestId(T.app.newGame)).toBeFocused();
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
    await test.step('Cancel leaves the game untouched', async () => {
      await game.getByTestId(T.app.newGame).click();
      await expect(game.getByTestId(T.app.confirmDialog)).toBeVisible();
      await game.getByTestId(T.app.confirmCancel).click();
      await expect(game.getByTestId(T.app.confirmDialog)).toHaveCount(0);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
    await test.step('Confirm returns to the configuration', async () => {
      await game.getByTestId(T.app.newGame).click();
      await game.getByTestId(T.app.confirmYes).click();
      await expect(game.getByTestId(T.config.root)).toBeVisible();
      await expect(game.getByTestId(T.scoreboard.table)).toHaveCount(0);
    });
  });

  test('Last round ends -> winner view', async ({ game }) => {
    await test.step('Seed a game on the last round (15/15)', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 15,
        totalRounds: 15,
        overlay: 'result',
        players: [
          { name: 'P0', predictions: new Array(15).fill(1), points: new Array(14).fill(400) },
          { name: 'P1', predictions: new Array(15).fill(1), points: new Array(14).fill(300) },
          { name: 'P2', predictions: new Array(15).fill(1), points: new Array(14).fill(200) },
        ],
      });
      await openApp(game);
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
    });
    await test.step('Finish the round -> game over, winner view appears', async () => {
      await submitResults(game, [5, 5, 5]);
      await expect(game.getByTestId(T.winner.container)).toBeVisible();
    });
    await test.step('The last round can also be corrected from the winner view', async () => {
      await game.getByTestId(T.winner.correctLastRound).click();
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await expect(game.getByTestId(T.result.input(0))).toHaveValue('5');
      await submitResults(game, [5, 5, 5]);
      await expect(game.getByTestId(T.winner.container)).toBeVisible();
    });
  });
});
