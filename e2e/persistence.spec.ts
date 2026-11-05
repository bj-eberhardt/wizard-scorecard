import {
  test,
  expect,
  openApp,
  seedGameState,
  seedLegacyGameState,
  STATE_KEY,
  LEGACY_STATE_KEY,
  SETTINGS_KEY,
} from './fixtures';
import { T } from '../src/test-ids';

const players = [
  { name: 'Anna', predictions: [], results: [], points: [] },
  { name: 'Ben', predictions: [], results: [], points: [] },
  { name: 'Cia', predictions: [], results: [], points: [] },
];

async function seedRaw(page: import('@playwright/test').Page, key: string, data: unknown) {
  await page.addInitScript(
    ({ key: storageKey, data: storageData }) => {
      localStorage.setItem(storageKey, JSON.stringify(storageData));
    },
    { key, data }
  );
}

test.describe('Persistence and migration', () => {
  test('loads a valid V2 game and resumes its overlay', async ({ game }) => {
    await seedGameState(game, {
      gameStarted: true,
      currentRound: 1,
      totalRounds: 5,
      overlay: 'prediction',
      players,
    });

    await openApp(game);

    await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
    await expect(game.getByTestId(T.config.root)).toHaveCount(0);
  });

  test('migrates a legacy V1 game and removes V1 after a successful V2 write', async ({ game }) => {
    await seedLegacyGameState(game, {
      gameStarted: true,
      currentRound: 1,
      totalRounds: 5,
      overlay: 'prediction',
      players,
    });

    await openApp(game);

    await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
    await expect
      .poll(() => game.evaluate((key) => localStorage.getItem(key), STATE_KEY))
      .not.toBeNull();
    await expect
      .poll(() => game.evaluate((key) => localStorage.getItem(key), LEGACY_STATE_KEY))
      .toBeNull();

    const migrated = await game.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
      STATE_KEY
    );
    expect(migrated.version).toBe(2);
    expect(migrated.players[0].wolkeUsed).toEqual([]);
    expect(migrated.players[0].receivedResults).toEqual([]);
  });

  test('rejects malformed JSON and starts a new game without touching settings', async ({
    game,
  }) => {
    await game.addInitScript(() => {
      localStorage.setItem('wizard_state_v2', '{not-json');
      localStorage.setItem(
        'wizard_settings_v1',
        JSON.stringify({
          state: {
            playerNames: ['Saved'],
            useAnniversaryRules: false,
            useNotEqual: false,
            language: 'de',
          },
          version: 2,
        })
      );
    });

    await openApp(game);

    await expect(game.getByTestId(T.config.root)).toBeVisible();
    await expect(game.getByTestId(T.footer.root)).toBeVisible();
    await expect(game.evaluate((key) => localStorage.getItem(key), STATE_KEY)).toBeNull();
    await expect(game.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)).not.toBeNull();
  });

  test('ignores unknown V2 fields', async ({ game }) => {
    await seedRaw(game, STATE_KEY, {
      version: 2,
      currentRound: 1,
      totalRounds: 5,
      gameStarted: true,
      useAnniversaryRules: false,
      useNotEqual: false,
      overlay: 'prediction',
      futureField: { value: true },
      players: players.map((player) => ({ ...player, futurePlayerField: 'ignored' })),
    });

    await openApp(game);

    await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
  });

  test('resetGame removes both V2 and legacy keys', async ({ game }) => {
    await seedGameState(game, {
      gameStarted: true,
      currentRound: 1,
      totalRounds: 5,
      overlay: 'none',
      players,
    });
    await openApp(game);
    await game.evaluate((key) => localStorage.setItem(key, '{}'), LEGACY_STATE_KEY);

    await game.getByTestId(T.app.newGame).click();
    await game.getByTestId(T.app.confirmYes).click();

    await expect(game.getByTestId(T.config.root)).toBeVisible();
    await expect(game.evaluate((key) => localStorage.getItem(key), STATE_KEY)).toBeNull();
    await expect(game.evaluate((key) => localStorage.getItem(key), LEGACY_STATE_KEY)).toBeNull();
  });

  test('continues in memory when game storage writes fail', async ({ game }) => {
    await game.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'wizard_state_v2') throw new Error('storage full');
        originalSetItem.call(this, key, value);
      };
    });

    await openApp(game);
    await expect(game.getByTestId(T.config.root)).toBeVisible();
    for (let i = 3; i < 4; i++) await game.getByTestId(T.config.addPlayer).click();
    for (const [index, name] of ['Anna', 'Ben', 'Cia', 'Dora'].entries()) {
      await game.getByTestId(T.config.playerName(index)).fill(name);
    }
    await game.getByTestId(T.config.startButton).click();

    await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
  });

  test('normalizes corrupt settings without crashing or changing the language contract', async ({
    game,
  }) => {
    await seedRaw(game, SETTINGS_KEY, {
      state: {
        playerNames: ['Valid', 42],
        useAnniversaryRules: 'yes',
        useNotEqual: null,
        language: 'fr',
      },
      version: 2,
    });

    await openApp(game, { locale: 'en' });

    await expect(game.getByTestId(T.config.root)).toBeVisible();
    await expect(game.locator('html')).toHaveAttribute('lang', 'en');
  });
});

for (const [label, invalid] of [
  [
    'an invalid overlay',
    {
      version: 2,
      currentRound: 1,
      totalRounds: 5,
      gameStarted: true,
      useAnniversaryRules: false,
      useNotEqual: false,
      overlay: 'unknown',
      players,
    },
  ],
  [
    'an invalid player count',
    {
      version: 2,
      currentRound: 1,
      totalRounds: 5,
      gameStarted: true,
      useAnniversaryRules: false,
      useNotEqual: false,
      overlay: 'none',
      players: players.slice(0, 2),
    },
  ],
  [
    'negative predictions',
    {
      version: 2,
      currentRound: 1,
      totalRounds: 5,
      gameStarted: true,
      useAnniversaryRules: false,
      useNotEqual: false,
      overlay: 'none',
      players: [{ ...players[0], predictions: [-1] }, players[1], players[2]],
    },
  ],
] as const) {
  test(`rejects ${label}`, async ({ game }) => {
    await seedRaw(game, STATE_KEY, invalid);
    await openApp(game);
    await expect(game.getByTestId(T.config.root)).toBeVisible();
    await expect(game.evaluate((key) => localStorage.getItem(key), STATE_KEY)).toBeNull();
  });
}
