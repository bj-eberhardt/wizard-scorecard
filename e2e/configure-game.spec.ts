import { test, expect, openApp, expectError } from './fixtures';
import type { Page } from '@playwright/test';
import { T } from '../src/test-ids';

/**
 * ConfigureGame: player input, round defaults/bounds, rule toggles and validation.
 * All assertions use data-testid / data-error-key (never localized text).
 *
 * The screen starts with 3 rows and grows via the "+" button (T.config.addPlayer)
 * up to 6; a row can only be removed while more than 3 rows exist. Rounds use a
 * segmented control — the standard segment carries `data-default-rounds`, the
 * manual number input (T.config.rounds) only appears after activating the custom
 * segment.
 */

/** Grow the roster from 3 to `count` rows by clicking "+". */
async function addPlayersTo(game: Page, count: number) {
  for (let i = 3; i < count; i++) {
    await game.getByTestId(T.config.addPlayer).click();
  }
}

test.describe('Configure game', () => {
  test('Happy path: 4 players start the game', async ({ game }) => {
    await test.step('Open app and expect the configuration screen', async () => {
      await openApp(game);
      await expect(game.getByTestId(T.config.root)).toBeVisible();
    });

    await test.step('Add a 4th row and enter four player names', async () => {
      await addPlayersTo(game, 4);
      const names = ['Anna', 'Ben', 'Cia', 'Dieter'];
      for (let i = 0; i < names.length; i++) {
        await game.getByTestId(T.config.playerName(i)).fill(names[i]);
      }
    });

    await test.step('Standard round mode defaults to 15 (via data-default-rounds)', async () => {
      await expect(game.getByTestId(T.config.roundsModeStandard)).toHaveAttribute(
        'data-default-rounds',
        '15'
      );
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
        await addPlayersTo(game, c.count);
        for (let i = 0; i < c.count; i++) {
          await game.getByTestId(T.config.playerName(i)).fill(`P${i + 1}`);
        }
        await expect(game.getByTestId(T.config.roundsModeStandard)).toHaveAttribute(
          'data-default-rounds',
          c.expected
        );
      });
    }
  });

  test('Custom rounds input only appears after switching mode', async ({ game }) => {
    await test.step('With 3 players, rounds start in standard mode (no manual input)', async () => {
      await openApp(game);
      for (let i = 0; i < 3; i++) {
        await game.getByTestId(T.config.playerName(i)).fill(`P${i + 1}`);
      }
      await expect(game.getByTestId(T.config.rounds)).toHaveCount(0);
    });
    await test.step('Activating custom mode reveals the number input', async () => {
      await game.getByTestId(T.config.roundsModeCustom).click();
      await expect(game.getByTestId(T.config.rounds)).toBeVisible();
    });
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

  test('Validation: rounds below minimum', async ({ game }) => {
    await test.step('3 players, custom mode, set rounds to 2', async () => {
      await openApp(game);
      for (let i = 0; i < 3; i++) {
        await game.getByTestId(T.config.playerName(i)).fill(`P${i + 1}`);
      }
      await game.getByTestId(T.config.roundsModeCustom).click();
      await game.getByTestId(T.config.rounds).fill('2');
      await game.getByTestId(T.config.startButton).click();
    });
    await test.step('Error "min 5 rounds"', async () => {
      await expectError(game, T.config.error, 'configureGame.errors.roundsTooSmall');
    });
  });

  test('Validation: rounds above maximum', async ({ game }) => {
    await test.step('3 players (default 20, max 40), custom mode, set rounds to 41', async () => {
      await openApp(game);
      for (let i = 0; i < 3; i++) {
        await game.getByTestId(T.config.playerName(i)).fill(`P${i + 1}`);
      }
      await game.getByTestId(T.config.roundsModeCustom).click();
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

    await test.step('Info dialog is keyboard operable', async () => {
      await game.getByTestId(T.config.infoNotEqual).click();
      const dialog = game.getByTestId(T.infoModal.dialog);
      await expect(dialog).toHaveAttribute('role', 'dialog');
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(game.getByTestId(T.infoModal.close)).toBeFocused();
      await game.keyboard.press('Tab');
      await expect(game.getByTestId(T.infoModal.close)).toBeFocused();
      await game.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(game.getByTestId(T.config.infoNotEqual)).toBeFocused();
    });
  });

  test('Player rows: add then remove shifts the remaining rows up', async ({ game }) => {
    await test.step('At 3 rows no remove button exists', async () => {
      await openApp(game);
      await expect(game.getByTestId(T.config.removePlayer(0))).toHaveCount(0);
    });

    await test.step('Add a 4th row and name the first two', async () => {
      await game.getByTestId(T.config.addPlayer).click();
      await game.getByTestId(T.config.playerName(0)).fill('Anna');
      await game.getByTestId(T.config.playerName(1)).fill('Ben');
    });

    await test.step('Remove the first row -> Ben shifts up to row 0', async () => {
      await expect(game.getByTestId(T.config.removePlayer(0))).toBeVisible();
      await game.getByTestId(T.config.removePlayer(0)).click();
      await expect(game.getByTestId(T.config.playerName(0))).toHaveValue('Ben');
    });
  });
});
