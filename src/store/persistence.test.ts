import { describe, expect, it } from 'vitest';
import {
  migrateGameState,
  toPersistedGame,
  validateGameState,
  type PersistedGameV2,
} from './persistence';

function player(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Player',
    predictions: [],
    results: [],
    points: [],
    wolkeUsed: [],
    receivedResults: [],
    ...overrides,
  };
}

function game(overrides: Record<string, unknown> = {}) {
  return {
    version: 2,
    players: [player({ name: 'A' }), player({ name: 'B' }), player({ name: 'C' })],
    currentRound: 1,
    totalRounds: 5,
    gameStarted: true,
    useAnniversaryRules: false,
    useNotEqual: false,
    overlay: 'none',
    ...overrides,
  };
}

describe('game-state migration', () => {
  it('repairs an old Wolke result and recalculates its points', () => {
    const oldState = game({
      currentRound: 2,
      useAnniversaryRules: true,
      players: [
        player({
          name: 'A',
          predictions: [0],
          // Old app stored the Wolke-rewritten result (1), not the actual 3.
          results: [1],
          points: [-10],
          wolkeUsed: [true],
          receivedResults: [3],
        }),
        player({ name: 'B' }),
        player({ name: 'C' }),
      ],
    });

    const migrated = migrateGameState(oldState);

    expect(migrated?.players[0]).toMatchObject({
      predictions: [0],
      adjustedPredictions: [1],
      results: [3],
      points: [-20],
      receivedResults: [3],
    });
  });

  it('is idempotent after the first migration', () => {
    const oldState = game({
      currentRound: 2,
      useAnniversaryRules: true,
      players: [
        player({
          name: 'A',
          predictions: [3],
          results: [4],
          points: [50],
          wolkeUsed: [true],
          receivedResults: [4],
        }),
        player({ name: 'B' }),
        player({ name: 'C' }),
      ],
    });

    const once = migrateGameState(oldState);
    const twice = migrateGameState(once);

    expect(twice).toEqual(once);
  });

  it('backfills missing adjusted predictions from ordinary predictions', () => {
    const migrated = migrateGameState(
      game({
        players: [
          player({ name: 'A', predictions: [1, 2], results: [1, 2], points: [30, 70] }),
          player({ name: 'B' }),
          player({ name: 'C' }),
        ],
      })
    );

    expect(migrated?.players[0].adjustedPredictions).toEqual([1, 2]);
  });

  it('rejects sparse or null-containing arrays instead of serializing them', () => {
    expect(
      migrateGameState(
        game({
          players: [
            player({ name: 'A', predictions: [0, null] }),
            player({ name: 'B' }),
            player({ name: 'C' }),
          ],
        })
      )
    ).toBeNull();
  });

  it('rejects arrays longer than the configured number of rounds', () => {
    expect(
      migrateGameState(
        game({
          totalRounds: 2,
          players: [
            player({ name: 'A', predictions: [0, 0, 0] }),
            player({ name: 'B' }),
            player({ name: 'C' }),
          ],
        })
      )
    ).toBeNull();
  });

  it('preserves unknown fields while normalizing the known state', () => {
    const migrated = migrateGameState(
      game({
        futureField: { enabled: true },
        players: [player({ futurePlayerField: 42 }), player(), player()],
      })
    );

    expect(migrated).not.toBeNull();
    expect(migrated).not.toHaveProperty('futureField');
    expect(migrated?.players[0]).not.toHaveProperty('futurePlayerField');
  });

  it('backfills old in-memory players before serialization', () => {
    const state = {
      ...game(),
      players: [
        {
          name: 'A',
          predictions: [0, 0, 0],
          results: [0, 0, 0],
          points: [20, 40, 60],
          wolkeUsed: [false, false, false],
          receivedResults: [0, 0, 0],
        },
        player({ name: 'B' }),
        player({ name: 'C' }),
      ],
    } as unknown as Parameters<typeof toPersistedGame>[0];

    const persisted = toPersistedGame(state);

    expect(validateGameState(persisted)).toBe(true);
    expect(persisted.players[0].adjustedPredictions).toEqual([0, 0, 0]);
  });

  it('accepts a migrated state as the current persisted V2 contract', () => {
    const migrated = migrateGameState(game()) as PersistedGameV2;

    expect(validateGameState(migrated)).toBe(true);
  });
});
