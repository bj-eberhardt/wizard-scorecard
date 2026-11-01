import { test, expect, openApp, seedGameState } from './fixtures';
import { T } from '../src/test-ids';

/**
 * WinnerView tie logic. Reached by seeding a finished game (currentRound >
 * totalRounds) so no rounds need to be played. Winner count/points/names are
 * read from data-* attributes.
 */

async function seedFinished(game: import('@playwright/test').Page, finalPoints: number[]) {
  await seedGameState(game, {
    gameStarted: true,
    currentRound: 4, // > totalRounds -> game over
    totalRounds: 3,
    overlay: 'none',
    players: finalPoints.map((p, i) => ({
      name: `P${i}`,
      predictions: [1, 1, 1],
      results: [1, 1, 1],
      points: [Math.round(p / 3), Math.round((2 * p) / 3), p],
    })),
  });
}

test.describe('Winner view', () => {
  test('A single clear winner', async ({ game }) => {
    await test.step('Seed a finished game with a clear winner', async () => {
      await seedFinished(game, [100, 50, 200]);
      await openApp(game);
    });
    await test.step('Exactly one winner with 200 points', async () => {
      const winner = game.getByTestId(T.winner.container);
      await expect(winner).toBeVisible();
      await expect(winner).toHaveAttribute('data-winner-count', '1');
      await expect(winner).toHaveAttribute('data-points', '200');
      await expect(winner).toHaveAttribute('data-winner-names', 'P2');
    });
  });

  test('Two winners (tie)', async ({ game }) => {
    await test.step('Seed a tie at the top', async () => {
      await seedFinished(game, [200, 200, 100]);
      await openApp(game);
    });
    await test.step('Two winners, names separated by a pipe', async () => {
      const winner = game.getByTestId(T.winner.container);
      await expect(winner).toHaveAttribute('data-winner-count', '2');
      await expect(winner).toHaveAttribute('data-winner-names', 'P0|P1');
    });
  });

  test('Multiple winners (all equal)', async ({ game }) => {
    await test.step('Seed a three-way tie', async () => {
      await seedFinished(game, [150, 150, 150]);
      await openApp(game);
    });
    await test.step('All three are winners', async () => {
      const winner = game.getByTestId(T.winner.container);
      await expect(winner).toHaveAttribute('data-winner-count', '3');
      await expect(winner).toHaveAttribute('data-points', '150');
    });
  });
});
