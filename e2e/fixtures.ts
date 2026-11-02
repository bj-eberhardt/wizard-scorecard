import { test as base, expect, type Page } from '@playwright/test';
import { T } from '../src/test-ids';

/**
 * Shared E2E helpers for the Wizard Punkteblock.
 *
 * Conventions enforced here:
 *  - Every test starts with a clean localStorage (both game + settings keys).
 *  - The app is opened with `?e2e=1` so artificial delays (splash, submit lock)
 *    are bypassed unless a test explicitly opts out.
 *  - All interaction goes through `data-testid` selectors (imported from the
 *    same `src/test-ids.ts` the components use). Localized state is asserted via
 *    `data-*` attributes, never via visible text.
 */

export const STATE_KEY = 'wizard_state_v1';
export const SETTINGS_KEY = 'wizard_settings_v1';

export type SeedPlayer = {
  name: string;
  predictions?: number[];
  results?: number[];
  points?: number[];
  wolkeUsed?: boolean[];
  receivedResults?: number[];
};

export type SeedState = {
  players?: SeedPlayer[];
  currentRound?: number;
  totalRounds?: number;
  gameStarted?: boolean;
  useAnniversaryRules?: boolean;
  useNotEqual?: boolean;
  overlay?: 'prediction' | 'result' | 'none';
};

type Fixtures = {
  /** Page that already has localStorage cleared via an init script. */
  game: Page;
};

export const test = base.extend<Fixtures>({
  game: async ({ page }, use) => {
    // Runs before every navigation/test load: guarantees a clean slate.
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await use(page);
  },
});

/** Navigate to the app. By default with the e2e bypass enabled. */
export async function openApp(
  page: Page,
  opts: { e2e?: boolean; locale?: 'de' | 'en'; waitReady?: boolean } = {}
) {
  const { e2e = true, locale, waitReady = true } = opts;
  if (locale) {
    await page.addInitScript((lng) => localStorage.setItem('i18nextLng', lng), locale);
  }
  const url = e2e ? '/?e2e=1' : '/';
  await page.goto(url);
  if (waitReady) {
    // Generic readiness: React has mounted and rendered its first screen.
    // Works for the config screen AND for seeded in-game states (scoreboard or
    // an overlay), where no config-root exists.
    await expect(page.locator('#root')).not.toBeEmpty();
  }
}

/**
 * Inject a game state into localStorage BEFORE the app boots.
 * Used to reach advanced states (mid-game, game-over, ties) instantly without
 * clicking through many rounds. Applied after the clean-slate init script, so it
 * wins for the first load.
 */
export async function seedGameState(page: Page, state: SeedState) {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem(payload.key, JSON.stringify(payload.data));
    },
    { key: STATE_KEY, data: state }
  );
}

/** Fill player names (+ optional rounds/rules) and start the game. */
export async function startGame(
  page: Page,
  opts: { players: string[]; rounds?: number; wolke?: boolean; notEqual?: boolean }
) {
  const { players, rounds, wolke = false, notEqual = false } = opts;
  await expect(page.getByTestId(T.config.root)).toBeVisible();

  // The config starts with 3 rows (localStorage is cleared per test);
  // every further player needs a click on the "+" button first.
  for (let i = 3; i < players.length; i++) {
    await page.getByTestId(T.config.addPlayer).click();
  }
  for (let i = 0; i < players.length; i++) {
    await page.getByTestId(T.config.playerName(i)).fill(players[i]);
  }
  if (typeof rounds === 'number') {
    // rounds default to the segmented "standard" mode; the manual input only
    // exists after switching to "custom"
    await page.getByTestId(T.config.roundsModeCustom).click();
    await page.getByTestId(T.config.rounds).fill(String(rounds));
  }
  if (wolke) await page.getByTestId(T.config.anniversary).check();
  if (notEqual) await page.getByTestId(T.config.notEqual).check();

  await page.getByTestId(T.config.startButton).click();
  await expect(page.getByTestId(T.prediction.overlay)).toBeVisible();
}

/** Enter predictions for the current round (order = start-player rotated) and submit. */
export async function submitPredictions(page: Page, values: number[]) {
  for (let i = 0; i < values.length; i++) {
    await page.getByTestId(T.prediction.input(i)).fill(String(values[i]));
  }
  await page.getByTestId(T.prediction.submit).click();
  await expect(page.getByTestId(T.result.overlay)).toBeVisible();
}

/** Enter results for the current round and finish it (waits for submit-ready). */
export async function submitResults(page: Page, values: number[], wolkeIdx?: number) {
  for (let i = 0; i < values.length; i++) {
    await page.getByTestId(T.result.input(i)).fill(String(values[i]));
  }
  if (typeof wolkeIdx === 'number') {
    await page.getByTestId(T.result.wolke(wolkeIdx)).check();
  }
  const submit = page.getByTestId(T.result.submit);
  await expect(submit).toHaveAttribute('data-submit-ready', 'true');
  await submit.click();
}

/** Assert an error banner is visible and carries the expected i18n key. */
export async function expectError(page: Page, testId: string, errorKey: string) {
  const el = page.getByTestId(testId);
  await expect(el).toBeVisible();
  await expect(el).toHaveAttribute('data-error-key', errorKey);
}

/** Open the "next round" prediction overlay from the scoreboard. */
export async function openNextRound(page: Page) {
  await page.getByTestId(T.app.nextRound).click();
  await expect(page.getByTestId(T.prediction.overlay)).toBeVisible();
}

export { expect };
