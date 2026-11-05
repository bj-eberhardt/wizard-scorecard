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
  adjustedPrediction?: number;
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
    { prediction: 3, adjustedPrediction: 2, entered: 2, evaluated: 2, wolke: true },
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
    { prediction: 1, adjustedPrediction: 2, entered: 4, evaluated: 4, wolke: true },
  ],
};

/** Points of a single round: correct -> +(20 + tricks*10), wrong -> -(|diff|*10). */
function roundPoints(round: RoundData): number {
  const prediction = round.adjustedPrediction ?? round.prediction;
  return prediction === round.evaluated
    ? 20 + round.evaluated * 10
    : -Math.abs(prediction - round.evaluated) * 10;
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
    adjustedPredictions: rounds.map((r) => r.adjustedPrediction ?? r.prediction),
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
  /**
   * Free space to the left/right of an element inside the layout viewport.
   * Equal gaps mean the element sits on the page's centre line.
   */
  const sideGaps = (page: import('@playwright/test').Page, testId: string) =>
    page.evaluate((sel) => {
      const el = document.querySelector(`[data-testid="${sel}"]`);
      if (!el) throw new Error(`missing element: ${sel}`);
      const rect = el.getBoundingClientRect();
      const available = document.documentElement.clientWidth;
      return { left: rect.left, right: available - rect.right };
    }, testId);

  test('Board and primary action are centred on the page', async ({ game }) => {
    await test.step('Seed a played game with the scoreboard visible', async () => {
      await seedPlayedGame(game);
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
    await test.step('The table is centred instead of flush left', async () => {
      const gaps = await sideGaps(game, T.scoreboard.table);
      // a 3-player board is far narrower than the desktop viewport, so both gaps are big
      expect(gaps.left).toBeGreaterThan(40);
      expect(Math.abs(gaps.left - gaps.right)).toBeLessThanOrEqual(2);
    });
    await test.step('The primary button shares that centre line', async () => {
      const gaps = await sideGaps(game, T.app.nextRound);
      expect(Math.abs(gaps.left - gaps.right)).toBeLessThanOrEqual(2);
    });
  });

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
    await test.step('Round header shows the full word on desktop and names itself via aria-label', async () => {
      // the sticky round column is only narrowed on phones; here on desktop the full
      // "Runde"/"Round" label stays readable and the compact "#" span is display:none
      const roundHeader = game.getByTestId(T.scoreboard.roundHeader);
      await expect(roundHeader).toBeVisible();
      await expect(roundHeader).toHaveAttribute('rowspan', '2');
      await expect(roundHeader).toHaveAttribute('aria-label', /.+/);
      await expect(game.getByTestId(T.scoreboard.roundHeaderFull)).toBeVisible();
      await expect(game.getByTestId(T.scoreboard.roundHeaderShort)).toBeHidden();
      // the digits below still fit inside the column
      const headerBox = await roundHeader.boundingBox();
      const firstRoundCell = game
        .locator(`[data-testid="${T.scoreboard.table}"] tbody tr td`)
        .first();
      const cellBox = await firstRoundCell.boundingBox();
      expect(headerBox?.width ?? 0).toBeGreaterThanOrEqual(cellBox?.width ?? Infinity);
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
            ? `${data.evaluated}\u202F\u2601`
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
      // The cells are animation-free: no pulse, ring or scale marker on any of them.
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

  test('Compact toggle is viewport-independent: desktop starts full, toggles to compact and back', async ({
    game,
  }) => {
    const roundsByPlayer = [GAME.P0, GAME.P1, GAME.P2];
    /** Cumulative total after the last played round for a player's seeded rounds. */
    const totalOf = (rounds: RoundData[]) => cumulative(rounds)[PLAYED_ROUNDS - 1];

    await test.step('Seed a played game on the wide desktop viewport', async () => {
      await seedPlayedGame(game);
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });

    await test.step('Desktop defaults to the full three-column board', async () => {
      await expect(game.getByTestId(T.scoreboard.table)).toHaveAttribute('data-compact', 'false');
      for (let player = 0; player < 3; player++) {
        await expect(game.getByTestId(T.scoreboard.headerLabel(player, 'points'))).toBeVisible();
        await expect(game.getByTestId(T.scoreboard.headerPoints(player))).toHaveCount(0);
      }
    });

    await test.step('First click on the ghost link switches to compact', async () => {
      await game.getByTestId(T.scoreboard.compactToggle).click();
      await expect(game.getByTestId(T.scoreboard.table)).toHaveAttribute('data-compact', 'true');
      for (let player = 0; player < 3; player++) {
        await expect(game.getByTestId(T.scoreboard.headerPlayer(player))).toHaveAttribute(
          'colspan',
          '2'
        );
        await expect(game.getByTestId(T.scoreboard.headerLabel(player, 'points'))).toHaveCount(0);
        const points = game.getByTestId(T.scoreboard.headerPoints(player));
        await expect(points).toBeVisible();
        await expect(points).toHaveAttribute(
          'data-points',
          String(totalOf(roundsByPlayer[player]))
        );
      }
    });

    await test.step('Second click returns to the full board', async () => {
      await game.getByTestId(T.scoreboard.compactToggle).click();
      await expect(game.getByTestId(T.scoreboard.table)).toHaveAttribute('data-compact', 'false');
      for (let player = 0; player < 3; player++) {
        await expect(game.getByTestId(T.scoreboard.headerPlayer(player))).toHaveAttribute(
          'colspan',
          '3'
        );
        await expect(game.getByTestId(T.scoreboard.headerLabel(player, 'points'))).toBeVisible();
        await expect(game.getByTestId(T.scoreboard.headerPoints(player))).toHaveCount(0);
      }
    });
  });

  test('Round column narrows to "#" on mobile @mobile', async ({ game }) => {
    await test.step('Seed a played game', async () => {
      await seedPlayedGame(game);
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
    });
    await test.step('The compact label swaps in and the full word hides', async () => {
      const roundHeader = game.getByTestId(T.scoreboard.roundHeader);
      await expect(roundHeader).toBeVisible();
      // accessible name still the full word — never the symbol alone
      await expect(roundHeader).toHaveAttribute('aria-label', /.+/);
      await expect(game.getByTestId(T.scoreboard.roundHeaderShort)).toBeVisible();
      await expect(game.getByTestId(T.scoreboard.roundHeaderFull)).toBeHidden();
    });
    await test.step('The column is narrow but still fits two digits', async () => {
      const headerBox = await game.getByTestId(T.scoreboard.roundHeader).boundingBox();
      const width = headerBox?.width ?? 0;
      expect(width).toBeGreaterThan(0);
      // the whole point of the mobile abbreviation: much slimmer than the full word
      expect(width).toBeLessThan(48);
      const firstRoundCell = game
        .locator(`[data-testid="${T.scoreboard.table}"] tbody tr td`)
        .first();
      const cellBox = await firstRoundCell.boundingBox();
      expect(width).toBeGreaterThanOrEqual(cellBox?.width ?? Infinity);
    });
  });

  test('Compact view hides the points column and shows the total under each name @mobile', async ({
    game,
  }) => {
    /** Cumulative total after the last played round for a player's seeded rounds. */
    const totalOf = (rounds: RoundData[]) => cumulative(rounds)[PLAYED_ROUNDS - 1];

    await test.step('Seed a played game (mobile viewport defaults to compact)', async () => {
      await seedPlayedGame(game);
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toBeVisible();
      await expect(game.getByTestId(T.scoreboard.table)).toHaveAttribute('data-compact', 'true');
    });

    await test.step('The points column is not rendered at all', async () => {
      for (let player = 0; player < 3; player++) {
        await expect(game.getByTestId(T.scoreboard.headerLabel(player, 'points'))).toHaveCount(0);
        for (let round = 0; round < TOTAL_ROUNDS; round++) {
          await expect(game.getByTestId(T.scoreboard.cell(player, round, 'points'))).toHaveCount(0);
        }
      }
    });

    await test.step('Each name spans two columns and carries its total', async () => {
      const roundsByPlayer = [GAME.P0, GAME.P1, GAME.P2];
      for (let player = 0; player < 3; player++) {
        const nameCell = game.getByTestId(T.scoreboard.headerPlayer(player));
        await expect(nameCell).toHaveAttribute('colspan', '2');
        const points = game.getByTestId(T.scoreboard.headerPoints(player));
        await expect(points).toBeVisible();
        await expect(points).toHaveAttribute(
          'data-points',
          String(totalOf(roundsByPlayer[player]))
        );
      }
    });

    await test.step('Toggling compact off restores the full three-column board', async () => {
      await game.getByTestId(T.scoreboard.compactToggle).click();
      await expect(game.getByTestId(T.scoreboard.table)).toHaveAttribute('data-compact', 'false');
      for (let player = 0; player < 3; player++) {
        await expect(game.getByTestId(T.scoreboard.headerPlayer(player))).toHaveAttribute(
          'colspan',
          '3'
        );
        await expect(game.getByTestId(T.scoreboard.headerLabel(player, 'points'))).toBeVisible();
        await expect(game.getByTestId(T.scoreboard.headerPoints(player))).toHaveCount(0);
      }
    });
  });

  test('Compact view shows no total before the first round is scored @mobile', async ({ game }) => {
    await test.step('Seed a freshly started game (no round played yet)', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: 1,
        totalRounds: TOTAL_ROUNDS,
        overlay: 'none',
        players: [
          { name: 'P0', predictions: [], points: [] },
          { name: 'P1', predictions: [], points: [] },
          { name: 'P2', predictions: [], points: [] },
        ],
      });
      await openApp(game);
      await expect(game.getByTestId(T.scoreboard.table)).toHaveAttribute('data-compact', 'true');
    });
    await test.step('No header total is rendered while nothing is scored', async () => {
      for (let player = 0; player < 3; player++) {
        await expect(game.getByTestId(T.scoreboard.headerPoints(player))).toHaveCount(0);
      }
    });
  });

  test('Game over forces the full board on mobile and hides the toggle @mobile', async ({
    game,
  }) => {
    await test.step('Seed a finished game', async () => {
      await seedGameState(game, {
        gameStarted: true,
        currentRound: PLAYED_ROUNDS + 1,
        totalRounds: PLAYED_ROUNDS,
        overlay: 'none',
        useAnniversaryRules: true,
        players: [seedPlayer('P0', GAME.P0), seedPlayer('P1', GAME.P1), seedPlayer('P2', GAME.P2)],
      });
      await openApp(game);
      await expect(game.getByTestId(T.winner.container)).toBeVisible();
    });
    await test.step('The scoreboard still shows every column, toggle hidden', async () => {
      // App forces compact off at game over even though the viewport would default to it
      await expect(game.getByTestId(T.scoreboard.table)).toHaveAttribute('data-compact', 'false');
      await expect(game.getByTestId(T.scoreboard.compactToggle)).toHaveCount(0);
      for (let player = 0; player < 3; player++) {
        await expect(game.getByTestId(T.scoreboard.headerPlayer(player))).toHaveAttribute(
          'colspan',
          '3'
        );
        await expect(game.getByTestId(T.scoreboard.headerPoints(player))).toHaveCount(0);
      }
    });
  });
});
