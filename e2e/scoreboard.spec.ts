import { test, expect, openApp, seedGameState } from './fixtures';
import { T } from '../src/test-ids';

/**
 * Scoreboard: table rendering, tooltip data attributes and reduced-motion
 * handling of the pulse hint. Values are read from data-* attributes.
 */

async function seedPlayedGame(game: import('@playwright/test').Page) {
  await seedGameState(game, {
    gameStarted: true,
    currentRound: 3,
    totalRounds: 15,
    overlay: 'none',
    players: [
      {
        name: 'P0',
        predictions: [1, 2],
        results: [1, 2],
        receivedResults: [1, 2],
        wolkeUsed: [false, false],
        points: [30, 60],
      },
      {
        name: 'P1',
        predictions: [1, 1],
        results: [1, 2],
        receivedResults: [1, 2],
        wolkeUsed: [false, false],
        points: [30, 40],
      },
      {
        name: 'P2',
        predictions: [1, 1],
        results: [1, 1],
        receivedResults: [1, 1],
        wolkeUsed: [false, false],
        points: [30, 60],
      },
    ],
  });
}

test.describe('Scoreboard', () => {
  test('Renders all round rows and cell values', async ({ game }) => {
    await test.step('Seed a played game (round 3, 15 rounds)', async () => {
      await seedPlayedGame(game);
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
    await test.step('15 round rows are present', async () => {
      await expect(game.locator(`[data-testid="${T.scoreboard.table}"] tbody tr`)).toHaveCount(15);
    });
    await test.step('Points/prediction cells carry the correct data', async () => {
      await expect(game.getByTestId(T.scoreboard.cell(0, 1, 'points'))).toHaveAttribute(
        'data-points',
        '60'
      );
      await expect(game.getByTestId(T.scoreboard.cell(0, 1, 'prediction'))).toHaveAttribute(
        'data-prediction',
        '2'
      );
      // a not-yet-played round has empty values
      await expect(game.getByTestId(T.scoreboard.cell(0, 2, 'points'))).toHaveAttribute(
        'data-points',
        ''
      );
    });
  });

  test('Tooltip provides prediction, tricks and round points', async ({ game }) => {
    await test.step('Seed a played game', async () => {
      await seedPlayedGame(game);
      await openApp(game);
    });
    await test.step('Hover on a prediction cell (P0, round 2) opens the tooltip', async () => {
      await game.getByTestId(T.scoreboard.cell(0, 1, 'prediction')).hover();
      const tooltip = game.getByTestId(T.scoreboard.tooltip);
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveAttribute('data-prediction', '2');
      await expect(tooltip).toHaveAttribute('data-tricks', '2');
      await expect(tooltip).toHaveAttribute('data-points', '30'); // 60 - 30
      await expect(tooltip).toHaveAttribute('data-wolke', 'false');
    });
  });

  test.describe('Pulse hint respects reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('No animate-pulse under prefers-reduced-motion', async ({ game }) => {
      await test.step('Seed a game and load the scoreboard', async () => {
        await seedPlayedGame(game);
        await openApp(game);
      });
      await test.step('The last played round does not pulse', async () => {
        // lastPlayedIndex = currentRound-2 = 1
        const span = game.getByTestId(T.scoreboard.cell(0, 1, 'prediction')).locator('span');
        await expect(span).toBeVisible();
        const cls = (await span.getAttribute('class')) ?? '';
        expect(cls.includes('animate-pulse')).toBe(false);
      });
    });
  });
});
