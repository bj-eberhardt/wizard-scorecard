import { test, expect, openApp, expectError } from './fixtures';
import { T } from '../src/test-ids';

/**
 * ConfigureGame: player input, round defaults/bounds, rule toggles and validation.
 * All assertions use data-testid / data-error-key (never localized text).
 */

test.describe('Configure game', () => {
  test('Happy path: 4 players start the game', async ({ game }) => {
    await test.step('Open app and expect the configuration screen', async () => {
      await openApp(game);
      await expect(game.getByTestId(T.config.root)).toBeVisible();
    });

    await test.step('Enter four player names', async () => {
      const names = ['Anna', 'Ben', 'Cia', 'Dieter'];
      for (let i = 0; i < names.length; i++) {
        await game.getByTestId(T.config.playerName(i)).fill(names[i]);
      }
    });

    await test.step('Round count is auto-set to the default (15)', async () => {
      await expect(game.getByTestId(T.config.rounds)).toHaveValue('15');
    });

    await test.step('Start game -> prediction overlay appears', async () => {
      await game.getByTestId(T.config.startButton).click();
      await expect(game.getByTestId(T.prediction.overlay)).toBeVisible();
    });
  });

  test('Round default follows the player count (roundsForCount)', async ({ game }) => {
    const cases = [
      { count: 3, expected: '20' },
      { count: 4, expected: '15' },
      { count: 5, expected: '12' },
      { count: 6, expected: '10' },
    ];

    for (const c of cases) {
      await test.step(`${c.count} players -> default ${c.expected} rounds`, async () => {
        await openApp(game);
        for (let i = 0; i < c.count; i++) {
          await game.getByTestId(T.config.playerName(i)).fill(`P${i + 1}`);
        }
        await expect(game.getByTestId(T.config.rounds)).toHaveValue(c.expected);
      });
    }
  });

  test('Validation: fewer than 3 players', async ({ game }) => {
    await test.step('Enter only two names and start', async () => {
      await openApp(game);
      await game.getByTestId(T.config.playerName(0)).fill('Anna');
      await game.getByTestId(T.config.playerName(1)).fill('Ben');
      await game.getByTestId(T.config.startButton).click();
    });
    await test.step('Error "min 3 players" verified through data-error-key', async () => {
      await expectError(game, T.config.error, 'configureGame.errors.minPlayers');
      await expect(game.getByTestId(T.prediction.overlay)).toHaveCount(0);
    });
  });

  test('Validation: duplicate player names', async ({ game }) => {
    await test.step('Enter the same name twice', async () => {
      await openApp(game);
      await game.getByTestId(T.config.playerName(0)).fill('Anna');
      await game.getByTestId(T.config.playerName(1)).fill('Ben');
      await game.getByTestId(T.config.playerName(2)).fill('Anna');
      await game.getByTestId(T.config.startButton).click();
    });
    await test.step('Error "names must be unique"', async () => {
      await expectError(game, T.config.error, 'configureGame.errors.uniqueNames');
    });
  });

  test('Validation: gap in the name list', async ({ game }) => {
    await test.step('Fill fields 1 and 3 and 4, leave field 2 empty', async () => {
      await openApp(game);
      await game.getByTestId(T.config.playerName(0)).fill('Anna');
      await game.getByTestId(T.config.playerName(2)).fill('Cia');
      await game.getByTestId(T.config.playerName(3)).fill('Dieter');
      await game.getByTestId(T.config.startButton).click();
    });
    await test.step('Error "enter names without gaps"', async () => {
      await expectError(game, T.config.error, 'configureGame.errors.gapInNames');
    });
  });

  test('Validation: rounds below minimum', async ({ game }) => {
    await test.step('3 players, set rounds to 2', async () => {
      await openApp(game);
      for (let i = 0; i < 3; i++) {
        await game.getByTestId(T.config.playerName(i)).fill(`P${i + 1}`);
      }
      await game.getByTestId(T.config.rounds).fill('2');
      await game.getByTestId(T.config.startButton).click();
    });
    await test.step('Error "min 5 rounds"', async () => {
      await expectError(game, T.config.error, 'configureGame.errors.roundsTooSmall');
    });
  });

  test('Validation: rounds above maximum', async ({ game }) => {
    await test.step('3 players (default 20, max 40), set rounds to 41', async () => {
      await openApp(game);
      for (let i = 0; i < 3; i++) {
        await game.getByTestId(T.config.playerName(i)).fill(`P${i + 1}`);
      }
      await game.getByTestId(T.config.rounds).fill('41');
      await game.getByTestId(T.config.startButton).click();
    });
    await test.step('Error "max 40 rounds"', async () => {
      await expectError(game, T.config.error, 'configureGame.errors.roundsTooLarge');
    });
  });

  test('Rule toggles and info dialogs', async ({ game }) => {
    await test.step('Enable the anniversary rule (Wolke)', async () => {
      await openApp(game);
      await game.getByTestId(T.config.anniversary).check();
      await expect(game.getByTestId(T.config.anniversary)).toBeChecked();
    });

    await test.step("Enable the 'not equal' rule", async () => {
      await game.getByTestId(T.config.notEqual).check();
      await expect(game.getByTestId(T.config.notEqual)).toBeChecked();
    });

    await test.step('Open and close the Wolke info dialog', async () => {
      await game.getByTestId(T.config.infoWolke).click();
      await expect(game.getByTestId(T.infoModal.dialog)).toBeVisible();
      await game.getByTestId(T.infoModal.close).click();
      await expect(game.getByTestId(T.infoModal.dialog)).toHaveCount(0);
    });
  });

  test('Remove a player via the × button', async ({ game }) => {
    await test.step('Enter names and remove the first one', async () => {
      await openApp(game);
      await game.getByTestId(T.config.playerName(0)).fill('Anna');
      await game.getByTestId(T.config.playerName(1)).fill('Ben');
      await game.getByTestId(T.config.removePlayer(0)).click();
    });
    await test.step('First field is empty afterwards', async () => {
      await expect(game.getByTestId(T.config.playerName(0))).toHaveValue('');
      await expect(game.getByTestId(T.config.playerName(1))).toHaveValue('Ben');
    });
  });
});
