import { test, expect, openApp, seedGameState } from './fixtures';
import { T } from '../src/test-ids';

/**
 * WinnerView: tie logic (original), ranking list, stats panel, rematch, and export (F16/F25/F26).
 * Reached by seeding a finished game (currentRound > totalRounds) so no rounds need to be played.
 * Winner count/points/names are read from data-* attributes.
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

  test('Ranking rows with correct data attributes', async ({ game }) => {
    await test.step('Seed a finished game with distinct scores', async () => {
      await seedFinished(game, [100, 50, 200]);
      await openApp(game);
    });
    await test.step('Ranking: P2 first, P0 second, P1 third', async () => {
      const row0 = game.getByTestId(T.winner.rankRow(0));
      await expect(row0).toHaveAttribute('data-points', '200');
      await expect(row0).toHaveAttribute('data-rank', '1');
      await expect(row0).toHaveAttribute('data-tied', 'false');

      // Index 1 has P0 with 100
      const row1 = game.getByTestId(T.winner.rankRow(1));
      await expect(row1).toHaveAttribute('data-points', '100');

      // Index 2 has P1 with 50
      const row2 = game.getByTestId(T.winner.rankRow(2));
      await expect(row2).toHaveAttribute('data-points', '50');
    });
  });

  test('Tied players share a rank', async ({ game }) => {
    await test.step('Seed a tie between two players', async () => {
      await seedFinished(game, [200, 200, 100]);
      await openApp(game);
    });
    await test.step('Two players at rank 1, tied flag true', async () => {
      const row0 = game.getByTestId(T.winner.rankRow(0));
      await expect(row0).toHaveAttribute('data-tied', 'true');
      await expect(row0).toHaveAttribute('data-rank', '1');
      // The second player should also be rank 1 (competition ranking)
      const row1 = game.getByTestId(T.winner.rankRow(1));
      await expect(row1).toHaveAttribute('data-rank', '1');
      // Third player gets rank 3 (skip rank 2)
      const row2 = game.getByTestId(T.winner.rankRow(2));
      await expect(row2).toHaveAttribute('data-rank', '3');
    });
  });

  test('Stats panel toggle', async ({ game }) => {
    await test.step('Seed a finished game', async () => {
      await seedFinished(game, [100, 50, 200]);
      await openApp(game);
    });
    await test.step('Stats panel is collapsed by default', async () => {
      const toggle = game.getByTestId(T.winner.statsToggle);
      await expect(toggle).toHaveAttribute('data-stats-open', 'false');
    });
    await test.step('Expand reveals stat rows with data attributes', async () => {
      await game.getByTestId(T.winner.statsToggle).click();
      await expect(game.getByTestId(T.winner.statsToggle)).toHaveAttribute(
        'data-stats-open',
        'true'
      );
      // Stat row for the winner (index 0): hitCorrect=3, hitTotal=3 (all predictions correct)
      const statRow = game.getByTestId(T.winner.statRow(0));
      await expect(statRow).toHaveAttribute('data-hit-correct', '3');
      await expect(statRow).toHaveAttribute('data-hit-total', '3');
    });
    await test.step('Hit rate is 100 for all-correct predictions', async () => {
      const row0 = game.getByTestId(T.winner.rankRow(0));
      await expect(row0).toHaveAttribute('data-hit-rate', '100');
    });
  });

  test('Rematch starts prediction overlay with rotated order', async ({ game }) => {
    await test.step('Seed a finished game (3 players)', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 4,
        totalRounds: 3,
        overlay: 'none',
        players: [
          { name: 'Alice', predictions: [1, 1, 1], results: [1, 1, 1], points: [30, 60, 100] },
          { name: 'Bob', predictions: [1, 1, 1], results: [1, 1, 1], points: [20, 40, 50] },
          { name: 'Cara', predictions: [1, 1, 1], results: [1, 1, 1], points: [40, 80, 200] },
        ],
      });
      await openApp(game);
    });
    await test.step('Click rematch', async () => {
      await game.getByTestId(T.winner.rematch).click();
      await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
    });
    await test.step('Roster rotated: last player (Cara) is now first', async () => {
      // Submit predictions quickly to reach scoreboard
      await game.getByTestId(T.prediction.submit).click();
      await expect(game.getByTestId(T.result.overlay)).toBeVisible();
      await game.getByTestId(T.result.submit).click();
      // After round 1, scoreboard is shown
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
      // Check scoreboard header order: player 0 is Cara (the old last player)
      const header0 = game.getByTestId(T.scoreboard.headerPlayer(0));
      await expect(header0).toContainText('Cara');
    });
  });

  test('Save image triggers a download with correct filename prefix', async ({ game }) => {
    await test.step('Seed a finished game', async () => {
      await seedFinished(game, [100, 50, 200]);
      await openApp(game);
    });
    await test.step('Click save image and intercept download', async () => {
      const downloadPromise = game.waitForEvent('download');
      await game.getByTestId(T.winner.saveImage).click();
      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^wizard-\d{4}-\d{2}-\d{2}-/);
      expect(filename).toMatch(/\.png$/);
    });
  });

  test('Copy text sets data-copied attribute', async ({ game }) => {
    await test.step('Grant clipboard permissions', async () => {
      await game.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: 'http://localhost:4173',
      });
    });
    await test.step('Seed a finished game', async () => {
      await seedFinished(game, [100, 50, 200]);
      await openApp(game, { locale: 'de' });
    });
    await test.step('Click copy and verify attribute', async () => {
      await game.getByTestId(T.winner.copyText).click();
      await expect(game.getByTestId(T.winner.copyText)).toHaveAttribute('data-copied', 'true');
      const copiedText = await game.evaluate(() => navigator.clipboard.readText());
      expect(copiedText).toMatch(/\d{2}\.\d{2}\.\d{4}/);
      expect(copiedText).toMatch(/:\s*\d+%/);
    });
  });

  test('Query flag hides image export but keeps text export', async ({ game }) => {
    await test.step('Seed a finished game and enable the image-export flag', async () => {
      await seedFinished(game, [100, 50, 200]);
      await game.goto('/?e2e=1&hideSaveImage=1');
      await expect(game.getByTestId(T.winner.container)).toBeVisible();
    });
    await test.step('Only the text export remains available', async () => {
      await expect(game.getByTestId(T.winner.saveImage)).toHaveCount(0);
      await expect(game.getByTestId(T.winner.copyText)).toBeVisible();
    });
  });

  test('Confetti container is present in the DOM', async ({ game }) => {
    await test.step('Seed a finished game', async () => {
      await seedFinished(game, [100, 50, 200]);
      await openApp(game);
    });
    await test.step('Confetti container exists with data-reduced-motion', async () => {
      const confetti = game.getByTestId(T.winner.confetti);
      await expect(confetti).toHaveCount(1);
      // In headless Chromium, reduced motion is NOT set, so confetti should be rendered
      await expect(confetti).toHaveAttribute('data-reduced-motion', 'false');
    });
  });

  test('Mixed stats with Wolke success and failure', async ({ game }) => {
    await test.step('Seed a finished game with Wolke usage', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 5,
        totalRounds: 4,
        overlay: 'none',
        useAnniversaryRules: true,
        players: [
          {
            name: 'Alice',
            predictions: [2, 3, 1, 0],
            results: [2, 3, 2, 0],
            points: [40, 90, 80, 100],
            wolkeUsed: [false, true, true, false],
            receivedResults: [2, 2, 3, 0],
          },
          {
            name: 'Bob',
            predictions: [1, 1, 1, 1],
            results: [1, 1, 1, 1],
            points: [30, 60, 90, 120],
            wolkeUsed: [false, false, false, false],
            receivedResults: [1, 1, 1, 1],
          },
          {
            name: 'Cara',
            predictions: [0, 0, 0, 0],
            results: [0, 0, 0, 0],
            points: [20, 40, 60, 80],
            wolkeUsed: [false, false, false, false],
            receivedResults: [0, 0, 0, 0],
          },
        ],
      });
      await openApp(game);
    });
    await test.step('Open stats panel', async () => {
      await game.getByTestId(T.winner.statsToggle).click();
      await expect(game.getByTestId(T.winner.statsToggle)).toHaveAttribute(
        'data-stats-open',
        'true'
      );
    });
    await test.step('Alice: 3/4 hits (75%), Wolke 2× with 1 success', async () => {
      // Alice has 100 pts → rank 2 (Bob has 120)
      const aliceRow = game.getByTestId(T.winner.rankRow(1)); // rank 2
      await expect(aliceRow).toHaveAttribute('data-hit-rate', '75');
      const aliceStat = game.getByTestId(T.winner.statRow(1));
      await expect(aliceStat).toHaveAttribute('data-hit-correct', '3');
      await expect(aliceStat).toHaveAttribute('data-hit-total', '4');
      await expect(aliceStat).toHaveAttribute('data-wolke-count', '2');
      await expect(aliceStat).toHaveAttribute('data-wolke-success', '1');
      await expect(aliceStat).toHaveAttribute('data-best-round', '50');
      await expect(aliceStat).toHaveAttribute('data-worst-round', '-10');
    });
    await test.step('Bob: 4/4 hits (100%), no Wolke', async () => {
      // Bob has 120 pts → rank 1
      const bobRow = game.getByTestId(T.winner.rankRow(0));
      await expect(bobRow).toHaveAttribute('data-hit-rate', '100');
      const bobStat = game.getByTestId(T.winner.statRow(0));
      await expect(bobStat).toHaveAttribute('data-hit-correct', '4');
      await expect(bobStat).toHaveAttribute('data-hit-total', '4');
      await expect(bobStat).toHaveAttribute('data-wolke-count', '0');
      await expect(bobStat).toHaveAttribute('data-wolke-success', '0');
    });
    await test.step('Gap shown for non-leaders, hidden for leader', async () => {
      // Alice (rank 2) has a gap of 20 (Bob leads with 120, Alice 100)
      const aliceStat = game.getByTestId(T.winner.statRow(1));
      await expect(aliceStat).toHaveAttribute('data-gap', '20');
      // Bob (rank 1) has no gap — empty attribute
      const bobStat = game.getByTestId(T.winner.statRow(0));
      await expect(bobStat).toHaveAttribute('data-gap', '');
    });
    await test.step('Wolke text branch: saved when success > 0', async () => {
      // Alice: 2 Wolke, 1 rescued -> the "saved" branch renders
      const aliceStat = game.getByTestId(T.winner.statRow(1));
      await expect(aliceStat.locator('[data-wolke-branch]')).toHaveAttribute(
        'data-wolke-branch',
        'saved'
      );
    });
  });

  test('Wolke without effect shows the no-effect branch', async ({ game }) => {
    await test.step('Seed a game where the Wolke never rescued a bid', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 3,
        totalRounds: 2,
        overlay: 'none',
        useAnniversaryRules: true,
        players: [
          {
            name: 'Wolke',
            predictions: [1, 1],
            // |1-4| > 1 both rounds -> effective result = prediction + 1 = 2, still a miss
            results: [2, 2],
            points: [-30, -60],
            wolkeUsed: [true, true],
            receivedResults: [4, 4],
          },
          { name: 'Solo', predictions: [1, 1], results: [1, 1], points: [30, 60] },
          { name: 'Dritter', predictions: [0, 0], results: [0, 0], points: [20, 40] },
        ],
      });
      await openApp(game);
    });
    await test.step('Open stats and expect the no-effect branch', async () => {
      await game.getByTestId(T.winner.statsToggle).click();
      // Wolke player is last (rank 3) -> statRow index 2
      const row = game.getByTestId(T.winner.statRow(2));
      await expect(row).toHaveAttribute('data-wolke-count', '2');
      await expect(row).toHaveAttribute('data-wolke-success', '0');
      await expect(row.locator('[data-wolke-branch]')).toHaveAttribute(
        'data-wolke-branch',
        'no-effect'
      );
    });
  });

  test('Hit rate rounding: 7/9 = 78%', async ({ game }) => {
    await test.step('Seed a 9-round game with 7 correct', async () => {
      // 7 hits out of 9 → Math.round(7/9*100) = 78
      const preds = [1, 2, 1, 2, 1, 2, 1, 0, 0];
      const res = [1, 2, 1, 2, 1, 2, 1, 1, 1];
      const pts: number[] = [];
      let cum = 0;
      for (let r = 0; r < 9; r++) {
        const delta = preds[r] === res[r] ? 20 + res[r] * 10 : -Math.abs(preds[r] - res[r]) * 10;
        cum += delta;
        pts.push(cum);
      }
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 10,
        totalRounds: 9,
        overlay: 'none',
        players: [
          { name: 'X', predictions: preds, results: res, points: pts },
          {
            name: 'Y',
            predictions: Array(9).fill(0),
            results: Array(9).fill(0),
            points: Array(9).fill(20),
          },
          {
            name: 'Z',
            predictions: Array(9).fill(0),
            results: Array(9).fill(0),
            points: Array(9).fill(10),
          },
        ],
      });
      await openApp(game);
    });
    await test.step('Hit rate shows 78 (rounded)', async () => {
      // X has the most points → rank 1
      const row0 = game.getByTestId(T.winner.rankRow(0));
      await expect(row0).toHaveAttribute('data-hit-rate', '78');
    });
  });
});
