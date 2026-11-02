import { test, expect, openApp, seedGameState, SeedPlayer } from './fixtures';
import { T } from '../src/test-ids';

/**
 * Scoreboard: two-row header, three columns per player (prediction · tricks ·
 * points) and the full cell matrix.
 *
 * Every cell is asserted twice: through its `data-*` attributes (the machine-readable
 * value) and through its rendered number. The numeric text is NOT a localized string,
 * so checking it is allowed — it proves the attribute and what the user sees agree.
 */

/** Wolke rounds: entered 2 for prediction 3 -> diff 1 -> counts as 3 (correct). */
const PLAYED_ROUNDS = 3;
const TOTAL_ROUNDS = 6;

type RoundData = {
  prediction: number;
  /** tricks as entered by the user */
  entered: number;
  /** tricks after the app applied the Wolke rewrite — this is what scores */
  evaluated: number;
  wolke: boolean;
};

const GAME: Record<string, RoundData[]> = {
  // player 0: hit, hit, Wolke with difference 1 (entered 2 -> evaluated 3 -> correct)
  P0: [
    { prediction: 1, entered: 1, evaluated: 1, wolke: false },
    { prediction: 2, entered: 2, evaluated: 2, wolke: false },
    { prediction: 3, entered: 2, evaluated: 3, wolke: true },
  ],
  // player 1: miss (-10), miss (-10), hit (+40)
  P1: [
    { prediction: 1, entered: 0, evaluated: 0, wolke: false },
    { prediction: 2, entered: 3, evaluated: 3, wolke: false },
    { prediction: 2, entered: 2, evaluated: 2, wolke: false },
  ],
  // player 2: hit with 0 tricks, hit, Wolke without difference 1 (entered 4 -> evaluated prediction+1 = 2)
  P2: [
    { prediction: 0, entered: 0, evaluated: 0, wolke: false },
    { prediction: 1, entered: 1, evaluated: 1, wolke: false },
    { prediction: 1, entered: 4, evaluated: 2, wolke: true },
  ],
};

/** Points of a single round: correct -> +(20 + tricks*10), wrong -> -(|diff|*10). */
function roundPoints(round: RoundData): number {
  return round.prediction === round.evaluated
    ? 20 + round.evaluated * 10
    : -Math.abs(round.prediction - round.evaluated) * 10;
}

/** Cumulative points per round, derived from the same data the seed uses. */
function cumulative(rounds: RoundData[]): number[] {
  const points: number[] = [];
  rounds.reduce((acc, round, i) => {
    const next = acc + roundPoints(round);
    points[i] = next;
    return next;
  }, 0);
  return points;
}

function seedPlayer(name: string, rounds: RoundData[]): SeedPlayer {
  return {
    name,
    predictions: rounds.map((r) => r.prediction),
    results: rounds.map((r) => r.evaluated),
    receivedResults: rounds.map((r) => r.entered),
    wolkeUsed: rounds.map((r) => r.wolke),
    points: cumulative(rounds),
  };
}

async function seedPlayedGame(game: import('@playwright/test').Page) {
  await seedGameState(game, {
    gameStarted: true,
    currentRound: PLAYED_ROUNDS + 1,
    totalRounds: TOTAL_ROUNDS,
    overlay: 'none',
    useAnniversaryRules: true,
    players: [seedPlayer('P0', GAME.P0), seedPlayer('P1', GAME.P1), seedPlayer('P2', GAME.P2)],
  });
}

test.describe('Scoreboard', () => {
  test('Header labels each of the three columns per player', async ({ game }) => {
    await test.step('Seed a played game (3 rounds of 6)', async () => {
      await seedPlayedGame(game);
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
    await test.step('Player name spans all three columns', async () => {
      for (let player = 0; player < 3; player++) {
        const nameCell = game.getByTestId(T.scoreboard.headerPlayer(player));
        await expect(nameCell).toBeVisible();
        await expect(nameCell).toHaveAttribute('colspan', '3');
      }
    });
    await test.step('Every player group has a prediction/tricks/points label', async () => {
      for (let player = 0; player < 3; player++) {
        for (const kind of ['prediction', 'tricks', 'points'] as const) {
          await expect(game.getByTestId(T.scoreboard.headerLabel(player, kind))).toBeVisible();
        }
      }
    });
    await test.step('All three sub-columns share one width', async () => {
      // the columns are fixed-width on purpose: with auto layout the longest header
      // label would stretch its column and the group would become uneven (mobile)
      const widthOf = async (locator: ReturnType<typeof game.getByTestId>) => {
        const box = await locator.boundingBox();
        const width = box?.width ?? 0;
        expect(width).toBeGreaterThan(0);
        return width;
      };
      for (const index of [0, 1]) {
        const widths = [
          await widthOf(game.getByTestId(T.scoreboard.headerLabel(index, 'prediction'))),
          await widthOf(game.getByTestId(T.scoreboard.headerLabel(index, 'tricks'))),
          await widthOf(game.getByTestId(T.scoreboard.headerLabel(index, 'points'))),
          await widthOf(game.getByTestId(T.scoreboard.cell(index, 0, 'prediction'))),
          await widthOf(game.getByTestId(T.scoreboard.cell(index, 0, 'tricks'))),
          await widthOf(game.getByTestId(T.scoreboard.cell(index, 0, 'points'))),
        ];
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
      }
    });
  });

  test('Complete cell matrix shows the correct values', async ({ game }) => {
    await test.step('Seed a played game', async () => {
      await seedPlayedGame(game);
      await openApp(game);
    });
    await test.step('One row per round is rendered', async () => {
      await expect(game.locator(`[data-testid="${T.scoreboard.table}"] tbody tr`)).toHaveCount(
        TOTAL_ROUNDS
      );
    });

    for (const [name, rounds] of Object.entries(GAME)) {
      const player = Number(name.slice(1));
      await test.step(`${name}: every played round carries prediction/tricks/points`, async () => {
        for (let round = 0; round < PLAYED_ROUNDS; round++) {
          const data = rounds[round];
          const expectedText = data.wolke
            ? `${data.entered}\u2192${data.evaluated} \u2601`
            : String(data.evaluated);

          const prediction = game.getByTestId(T.scoreboard.cell(player, round, 'prediction'));
          await expect(prediction).toHaveAttribute('data-prediction', String(data.prediction));
          await expect(prediction.locator('span')).toHaveText(String(data.prediction));

          const tricks = game.getByTestId(T.scoreboard.cell(player, round, 'tricks'));
          await expect(tricks).toHaveAttribute('data-tricks', String(data.evaluated));
          await expect(tricks).toHaveAttribute('data-received-tricks', String(data.entered));
          await expect(tricks).toHaveAttribute('data-wolke', data.wolke ? 'true' : 'false');
          await expect(tricks).toHaveText(expectedText);

          const points = game.getByTestId(T.scoreboard.cell(player, round, 'points'));
          const cumulativePoints = cumulative(rounds)[round];
          await expect(points).toHaveAttribute('data-points', String(cumulativePoints));
          await expect(points).toHaveText(String(cumulativePoints));
        }
      });
      await test.step(`${name}: unplayed rounds are empty`, async () => {
        for (let round = PLAYED_ROUNDS; round < TOTAL_ROUNDS; round++) {
          await expect(
            game.getByTestId(T.scoreboard.cell(player, round, 'prediction'))
          ).toHaveAttribute('data-prediction', '');
          await expect(
            game.getByTestId(T.scoreboard.cell(player, round, 'tricks'))
          ).toHaveAttribute('data-tricks', '');
          await expect(
            game.getByTestId(T.scoreboard.cell(player, round, 'tricks'))
          ).toHaveAttribute('data-wolke', 'false');
          await expect(
            game.getByTestId(T.scoreboard.cell(player, round, 'points'))
          ).toHaveAttribute('data-points', '');
          await expect(game.getByTestId(T.scoreboard.cell(player, round, 'points'))).toHaveText(
            '-'
          );
        }
      });
    }

    await test.step('Cumulative points equal the sum of the per-round deltas', async () => {
      for (const [name, rounds] of Object.entries(GAME)) {
        const player = Number(name.slice(1));
        let expected = 0;
        for (let round = 0; round < PLAYED_ROUNDS; round++) {
          expected += roundPoints(rounds[round]);
          const shown = Number(
            await game
              .getByTestId(T.scoreboard.cell(player, round, 'points'))
              .getAttribute('data-points')
          );
          // the displayed cumulative value must match the recomputed total, and the
          // delta between two rows must match the formula of the round itself
          expect(shown).toBe(expected);
          const previous =
            round === 0
              ? 0
              : Number(
                  await game
                    .getByTestId(T.scoreboard.cell(player, round - 1, 'points'))
                    .getAttribute('data-points')
                );
          expect(shown - previous).toBe(roundPoints(rounds[round]));
        }
      }
    });

    await test.step('No prediction cell carries an animation highlight', async () => {
      // UX-REVIEW F5: the one-time pulse on the last played round is gone — it
      // re-fired on every render, marked the finished round instead of the upcoming
      // one and lit up all players at once. No cell may ever animate or ring again.
      for (let player = 0; player < 3; player++) {
        for (let round = 0; round < TOTAL_ROUNDS; round++) {
          const span = game
            .getByTestId(T.scoreboard.cell(player, round, 'prediction'))
            .locator('span');
          await expect(span).toBeVisible();
          const cls = (await span.getAttribute('class')) ?? '';
          expect(cls).not.toMatch(/animate-|transition|ring-|scale-|bg-yellow/);
        }
      }
    });
  });
});
