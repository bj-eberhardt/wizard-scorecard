import { test, expect, openApp, seedGameState, startGame } from './fixtures';
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

  test('Mobile: a wide board stays horizontally scrollable @mobile', async ({ game }) => {
    await test.step('Seed a six-player game', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 2,
        totalRounds: 3,
        overlay: 'none',
        players: ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'].map((name) => ({
          name,
          predictions: [1],
          points: [30],
        })),
      });
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
    await test.step('The centring wrapper never outgrows the viewport', async () => {
      // the board is wider than the screen on purpose: centring must shrink the scroll
      // container to the viewport, otherwise the right-hand players would be unreachable
      const metrics = await game.evaluate((sel) => {
        const table = document.querySelector(`[data-testid="${sel}"]`) as HTMLElement;
        const scroller = table.parentElement as HTMLElement;
        return {
          available: document.documentElement.clientWidth,
          scroller: scroller.clientWidth,
          table: table.getBoundingClientRect().width,
          scrollable: scroller.scrollWidth > scroller.clientWidth,
        };
      }, T.scoreboard.table);
      expect(metrics.table).toBeGreaterThan(metrics.available);
      expect(metrics.scroller).toBeLessThanOrEqual(metrics.available);
      expect(metrics.scrollable).toBe(true);
    });
  });

  test('Mobile: overlay steppers are reachable and bounded @mobile', async ({ game }) => {
    await test.step('Start a game with 3 players', async () => {
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
    });
    await test.step('Prediction steppers replace inputs on mobile', async () => {
      await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
      for (let i = 0; i < 3; i++) {
        await expect(game.getByTestId(T.prediction.input(i))).toBeHidden();
        await expect(game.getByTestId(T.prediction.stepper(i))).toBeVisible();
      }
    });
    await test.step('Stepper exposes ARIA state and enforces round 1 bounds', async () => {
      const stepper = game.getByTestId(T.prediction.stepper(0));
      const decrease = game.getByTestId(T.prediction.stepperDecrease(0));
      const increase = game.getByTestId(T.prediction.stepperIncrease(0));
      await expect(stepper).toHaveAttribute('role', 'spinbutton');
      await expect(stepper).toHaveAttribute('aria-valuemin', '0');
      await expect(stepper).toHaveAttribute('aria-valuemax', '1');
      await expect(decrease).toBeDisabled();
      await expect(increase).toHaveAttribute('aria-label', 'Increase');
      await increase.click();
      await expect(stepper).toHaveAttribute('aria-valuenow', '1');
      await expect(increase).toBeDisabled();
      await decrease.focus();
      await decrease.press('Enter');
      await expect(stepper).toHaveAttribute('aria-valuenow', '0');
    });
  });

  test('Mobile: holding a stepper button repeats and stops on release @mobile', async ({
    game,
  }) => {
    await test.step('Seed a round with room for repeated changes', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 4,
        totalRounds: 15,
        overlay: 'prediction',
        players: [
          { name: 'Anna', predictions: [0, 0, 0, 0], results: [], points: [] },
          { name: 'Ben', predictions: [0, 0, 0, 0], results: [], points: [] },
          { name: 'Cia', predictions: [0, 0, 0, 0], results: [], points: [] },
        ],
      });
      await openApp(game);
    });
    await test.step('Hold plus long enough to trigger repeated changes', async () => {
      const stepper = game.getByTestId(T.prediction.stepper(0));
      const increase = game.getByTestId(T.prediction.stepperIncrease(0));
      await expect(stepper).toHaveAttribute('aria-valuenow', '0');
      await increase.hover();
      await game.mouse.down();
      await game.waitForTimeout(1400);
      await game.mouse.up();
      await expect(stepper).toHaveAttribute('aria-valuenow', '4');
    });
    await test.step('Release stops further changes', async () => {
      const stepper = game.getByTestId(T.prediction.stepper(0));
      await game.waitForTimeout(250);
      await expect(stepper).toHaveAttribute('aria-valuenow', '4');
    });
  });

  test('Mobile: compact prediction rows keep the title visible at 302x600 @mobile', async ({
    game,
  }) => {
    await test.step('Open prediction overlay at the reported viewport size', async () => {
      await game.setViewportSize({ width: 302, height: 600 });
      await openApp(game);
      await startGame(game, { players: ['Anna', 'Ben', 'Cia'] });
    });
    await test.step('Title stays visible and name/stepper share one row', async () => {
      await expect(game.getByTestId(T.prediction.title)).toBeVisible();
      const formBox = await game.getByTestId(T.prediction.form).boundingBox();
      const nameBox = await game.getByTestId(T.prediction.playerName(0)).boundingBox();
      const stepperBox = await game.getByTestId(T.prediction.stepper(0)).boundingBox();
      expect(formBox).not.toBeNull();
      expect(nameBox).not.toBeNull();
      expect(stepperBox).not.toBeNull();
      expect(formBox?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((formBox?.x ?? 0) + (formBox?.width ?? 0)).toBeLessThanOrEqual(302);
      const nameCenter = (nameBox?.y ?? 0) + (nameBox?.height ?? 0) / 2;
      const stepperCenter = (stepperBox?.y ?? 0) + (stepperBox?.height ?? 0) / 2;
      // Chromium can round the two fractional centers differently on Linux and
      // Windows; a 4px difference still represents the same aligned row.
      expect(Math.abs(nameCenter - stepperCenter)).toBeLessThanOrEqual(4);
    });
  });
});
