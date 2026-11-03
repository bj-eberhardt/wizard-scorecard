// Regenerates the README screenshots (docs/1-de.png … docs/4-en.png) from a production
// build. Platform-independent: it starts the Vite preview server in-process (no
// child process to orphan), drives it with Playwright, and writes the four mobile
// views the README embeds:
//   1 = configuration, 2 = prediction overlay, 3 = result overlay, 4 = scoreboard.
// Run via `npm run docs:screenshots` (which builds first). Override the port with
// PREVIEW_PORT if 4173 is taken.
import { preview } from 'vite';
import { chromium } from 'playwright';

const OUT_DIR = 'docs';
const STATE_KEY = 'wizard_state_v1';
const LANGUAGES = [
  { code: 'de', browserLocale: 'de-DE' },
  { code: 'en', browserLocale: 'en-US' },
];
// narrow portrait viewport, matching the README's tall mobile shots
const VIEWPORT = { width: 320, height: 640 };

// Pre-filled board for shot 4 (3 players, rounds 1–3 played). Loaded straight
// from localStorage, so these values are not re-validated.
const seedState = {
  gameStarted: true,
  currentRound: 4,
  totalRounds: 10,
  overlay: 'none',
  useAnniversaryRules: true,
  useNotEqual: false,
  players: [
    {
      name: 'Anna',
      predictions: [2, 1, 3],
      results: [2, 0, 2],
      receivedResults: [2, 0, 2],
      wolkeUsed: [false, false, true],
      points: [40, 30, 20],
    },
    {
      name: 'Ben',
      predictions: [1, 3, 0],
      results: [1, 2, 1],
      receivedResults: [1, 2, 1],
      wolkeUsed: [false, false, false],
      points: [30, 10, 0],
    },
    {
      name: 'Cia',
      predictions: [0, 2, 4],
      results: [0, 2, 3],
      receivedResults: [0, 2, 3],
      wolkeUsed: [false, false, false],
      points: [20, 40, 30],
    },
  ],
};

async function newMobilePage(browser, language, { seed = false } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: language.browserLocale,
  });
  await context.addInitScript((lng) => localStorage.setItem('i18nextLng', lng), language.code);
  if (seed) {
    await context.addInitScript(
      (payload) => localStorage.setItem(payload.key, JSON.stringify(payload.data)),
      { key: STATE_KEY, data: seedState }
    );
  }
  const page = await context.newPage();
  return { context, page };
}

// In-process preview server over `dist` (build first). No strictPort: if 4173 is
// busy Vite picks the next one and `resolvedUrls` reflects the real address.
const server = await preview({
  preview: { port: Number(process.env.PREVIEW_PORT) || 4173 },
});
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
console.log('serving preview at', base);

const browser = await chromium.launch();
try {
  for (const language of LANGUAGES) {
    console.log('capturing language', language.code);

    // --- shots 1–3: one live flow (config → prediction → result) ---
    const { context, page } = await newMobilePage(browser, language);
    try {
      await page.goto(`${base}/?e2e=1`);
      await page.getByTestId('config-root').waitFor({ state: 'visible' });
      await page.fill('[data-testid="config-player-name-0"]', 'Anna');
      await page.fill('[data-testid="config-player-name-1"]', 'Ben');
      await page.fill('[data-testid="config-player-name-2"]', 'Cia');
      await page.screenshot({
        path: `${OUT_DIR}/1-${language.code}.png`,
        fullPage: true,
      });
      console.log('wrote', `${OUT_DIR}/1-${language.code}.png`);

      await page.getByTestId('config-start-button').click();
      await page.getByTestId('prediction-overlay').waitFor({ state: 'visible' });
      // round 1 allows predictions of 0/1 only (app validation), so keep values small
      await page.fill('[data-testid="prediction-input-0"]', '1');
      await page.fill('[data-testid="prediction-input-1"]', '0');
      await page.fill('[data-testid="prediction-input-2"]', '1');
      await page.waitForTimeout(200); // let the overlay settle before shooting
      await page.screenshot({ path: `${OUT_DIR}/2-${language.code}.png` });
      console.log('wrote', `${OUT_DIR}/2-${language.code}.png`);

      await page.getByTestId('prediction-submit').click();
      await page.getByTestId('result-overlay').waitFor({ state: 'visible' });
      await page.fill('[data-testid="result-input-0"]', '1');
      await page.fill('[data-testid="result-input-1"]', '0');
      await page.fill('[data-testid="result-input-2"]', '0');
      await page.waitForTimeout(200); // the e2e submit-lock releases on a 0 ms timer + render tick
      await page.screenshot({ path: `${OUT_DIR}/3-${language.code}.png` });
      console.log('wrote', `${OUT_DIR}/3-${language.code}.png`);
    } finally {
      await context.close();
    }

    // --- shot 4: seeded scoreboard ---
    const { context: c4, page: p4 } = await newMobilePage(browser, language, {
      seed: true,
    });
    try {
      await p4.goto(`${base}/?e2e=1`);
      await p4.getByTestId('scoreboard-table').waitFor({ state: 'visible' });
      await p4.screenshot({
        path: `${OUT_DIR}/4-${language.code}.png`,
        fullPage: true,
      });
      console.log('wrote', `${OUT_DIR}/4-${language.code}.png`);
    } finally {
      await c4.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
