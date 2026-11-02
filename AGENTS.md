# AGENTS.md — Working guide for AI & human agents

This file documents how to work in this repository: commands, architecture, data
model, i18n, styling, and — most importantly — the conventions for writing and
running the Playwright E2E suite. Verify any claim against the source before
acting; this document describes the actual state of the code.

> Language note: product UI is bilingual (de/en). Development artifacts (code
> comments, test titles, `test.step` descriptions, this file) are written in
> **English** by convention.

---

## 1. What this project is

**Wizard Punkteblock** — a digital scoreboard for the card game *Wizard*. Built
with Vite + React 18 + TypeScript + Tailwind CSS v4, state in Zustand, fully
client-side with `localStorage` persistence. Deployment targets: GitHub Pages and
an nginx Docker image. The core usage scenario is a game table with one shared
phone: fast input, readable from a distance, error-tolerant.

---

## 2. Commands

| Task | Command | Notes |
|---|---|---|
| Install | `npm ci` (or `npm install`) | `engine-strict` is on — see §3 |
| Dev server | `npm run dev` | `vite --host`, **port 5173** |
| Production build | `npm run build` | outputs to `dist/`, `base: './'` |
| Preview build | `npm run preview` | `vite preview`, default **port 4173** |
| Lint | `npm run lint` | `eslint src e2e playwright.config.ts vite.config.ts` — includes the E2E suite |
| Format + lint | `npm run format` | `prettier --write` (src + e2e + configs) then `eslint` |
| Check formatting | `npm run prettier:check` | no writes; used by CI and the pre-commit hook |
| Type check | `npm run typecheck` | `tsc -p tsconfig.json --noEmit` over src + e2e + configs (Vite does NOT type-check) |
| Install hooks | `npm run prepare` | sets up Husky (`core.hooksPath=.husky/_`); runs automatically on `npm install` |
| E2E (all) | `npm run test:e2e` | builds + serves preview on 4173 itself |
| E2E (interactive UI) | `npm run test:e2e:ui` | Playwright UI runner (watch, click-to-run, time-travel) |
| E2E (headed) | `npm run test:e2e:headed` | `playwright test --headed` |
| E2E (report) | `npm run test:e2e:report` | open last HTML report |

**Port separation:** dev (5173) and E2E/preview (4173) never collide; they can run
simultaneously. The E2E webServer uses `--strictPort`, so a second concurrent E2E
run will fail loudly instead of silently using a stale server.

Husky is configured: `.husky/pre-commit` runs `npm run lint`, `npm run prettier:check`
and `npm run typecheck` (over `src` **and** `e2e`) and blocks the commit on failure —
the same scripts CI uses, so it behaves identically on Windows and Linux (glob
expansion happens in Node/prettier, not the shell). Fix issues with `npm run format`.
Hooks are installed by the `prepare` script on `npm install`. E2E itself is NOT run in
the hook (too slow) — that stays in CI / on demand.

---

## 3. Node version — hard requirement

- `package.json` → `engines.node: ">=24.0.0 <25.0.0"` (Node 24 LTS line).
- Repo-root **`.npmrc`** → `engine-strict=true`: `npm` **aborts** (not just warns)
  when the active Node does not match. If an install fails with `EBADENGINE`, switch
  to Node 24 (`nvm use 24`).
- Docker base image is `node:24-alpine`; all GitHub Actions use
  `actions/setup-node@v4` with `node-version: 24`.
- Keep Docker, CI, and `engines` in sync when ever bumping the LTS line.

---

## 4. Architecture & structure

```
src/
  main.tsx              # React root, StrictMode, imports ./i18n/i18n and index.css
  App.tsx               # top-level screen router (state machine, see §5)
  e2eFlag.ts            # isE2E(): reads ?e2e=1 live from location.search
  test-ids.ts           # T: single source of truth for all data-testid values
  components/
    ConfigureGame.tsx   # player names, rounds, rule toggles, validation
    PredictionOverlay.tsx  # enter tricks per player (start-player rotated)
    ResultOverlay.tsx   # enter results, Wolke, submit-lock, all-zero confirm
    Scoreboard.tsx      # two-row header, three columns per player (prediction · tricks · points)
    WinnerView.tsx      # end screen incl. tie handling
    Header.tsx / Footer.tsx / FullscreenButton.tsx / LoadingScreen.tsx
    InfoTooltip.tsx     # rule explainer modal (Wolke / NotEqual)
  store/
    gameStore.ts        # the running game (zustand, manual localStorage save)
    settingsStore.ts    # remembered names/rules across games (zustand persist)
  i18n/
    i18n.ts             # init: LanguageDetector + react-i18next, fallback 'de'
    locales/de/translation.json
    locales/en/translation.json
e2e/
  fixtures.ts           # custom `game` fixture + page-object helpers
  *.spec.ts             # feature specs (see §8 coverage map)
playwright.config.ts    # projects, webServer, baseURL
vite.config.ts          # react plugin, base './', __APP_VERSION__ define
tsconfig.json           # includes: src, e2e, playwright.config.ts, vite.config.ts
.github/workflows/       # e2e.yml, pull_request.yml, build_and_push.yml, dependabot
Dockerfile              # node:24-alpine build -> nginx:alpine serve
```

**Tech stack:** React 18.3, TypeScript ~5.9 (`strict: true`, `noEmit`), Vite 8.3,
Tailwind v4 (PostCSS via `@tailwindcss/postcss`), Zustand v5, i18next v17.

**Type checking:** Vite/esbuild do NOT type-check. Use `npm run typecheck`
(`tsc -p tsconfig.json --noEmit`, `strict: true`), which covers `src`, `e2e` and the
root configs and is wired into the pre-commit hook and CI. `tsconfig.json` uses
`moduleResolution: "Bundler"` (required so `vite`, `@vitejs/plugin-react` and
`@playwright/test` resolve via their `exports` maps) and `@types/node` is installed for
`process`. Asset/CSS module types come from `src/vite-env.d.ts`
(`/// <reference types="vite/client" />`); add custom globals in `src/env.d.ts`.

---

## 5. Domain model & game rules (authoritative)

State lives in `useGameStore`. A game is a small state machine driven by `overlay`
and `currentRound` (see `App.tsx`):

- `!gameStarted` → `ConfigureGame` (under the `LoadingScreen` splash overlay).
- on start → `overlay: 'prediction'` → `'result'` → back to scoreboard
  (`overlay: 'none'`), each round advancing `currentRound`.
- **Game over** when `currentRound > totalRounds` → `WinnerView`.

Key rules (all implemented in `gameStore.ts` / `ResultOverlay.tsx`):

- **Start-player rotation:** `startIndex = (round - 1) % playerCount`. Overlay rows
  are rotated so row 0 is the current start player. Predictions/results map
  row-index → original player via `(i + startPlayerIndex) % playerCount`.
- **Default rounds by player count** (`roundsForCount`): 3→20, 4→15, 5→12, ≥6→10.
- **Points formula** (per round, cumulative):
  - prediction correct → `+ (20 + value * 10)`
  - prediction wrong → `- (|prediction - value| * 10)`
- **Wolke (anniversary rule, opt-in):** exactly one player per round may have it and
  its entered tricks value must be ≥ 1. It rewrites the effective result: if
  `|prediction - value| === 1` the result counts as the prediction (becomes
  correct), otherwise the effective result is `prediction + 1`. The raw entered
  tricks are still stored in `receivedResults` and shown in the scoreboard's tricks
  cell as `entered→evaluated` with a ☁ marker (separated by a narrow no-break space
  U+202F so the string stays inside the fixed column width).
- **NotEqual rule (opt-in):** the sum of all predictions in a round may not equal the
  round's trick count; the last player to predict must adjust (error
  `predictionNotEqualLast`).
- **All-zero guard:** submitting all `0` in round > 1 needs a second confirming
  click.

`resetGame()` clears the store and removes `wizard_state_v1`. `gameStore` writes
`localStorage` after every mutation via an internal `save()`.

---

## 6. Persistence (localStorage keys)

| Key | Owner | Contents |
|---|---|---|
| `wizard_state_v1` | `gameStore.ts` | full running game (`players`, `currentRound`, `totalRounds`, `gameStarted`, `useAnniversaryRules`, `useNotEqual`, `overlay`) |
| `wizard_settings_v1` | `settingsStore.ts` (zustand `persist`) | remembered `playerNames` (6 slots), `useAnniversaryRules`, `useNotEqual` |
| `i18nextLng` | i18next browser detector | active language |

E2E fixtures clear both game/settings keys before every test. See §8.

---

## 7. Internationalization (i18n)

- Config: `src/i18n/i18n.ts` — `LanguageDetector`, `fallbackLng: 'de'`, resources
  bundled (no runtime HTTP load), `escapeValue: false`.
- Locales: `src/i18n/locales/{de,en}/translation.json` — **identical key trees**;
  a missing key in either is a bug. Add every new string to BOTH files.
- Namespace is the default `translation`; access with `useTranslation()` → `t('a.b.c')`.
- Interpolation uses `{{var}}`; pluralization in `winnerView` uses suffixed keys
  (`announcement_single|two|multiple`) chosen in code, not i18next plurals.
- **Rule for agents:** never hardcode a UI string in a component — add a key and use
  `t(...)`. And never assert a UI string in tests — use `data-*` (§8).

---

## 8. E2E testing with Playwright (the important part)

### 8.1 Guiding principles
1. **Select only by `data-testid`, never by text or CSS class.** All ids come from
   the single source of truth `src/test-ids.ts` (`T`), which BOTH the components and
   the specs import — a rename breaks the build, not the tests silently.
2. **Never assert localized text.** Any state a human reads as text (error message,
   winner, submit-lock) is additionally exposed as a `data-*` attribute; tests assert
   the attribute (i18n key / number / boolean), not the string. **Pure numbers are not
   localized** — a cell that can only ever render `30` or `-` may also be asserted with
   `toHaveText('30')`, which proves attribute and visible value agree. Anything that can
   ever become a word stays attribute-only. Attributes in use:
   - `data-error-key` on error banners → the i18n key, e.g. `configureGame.errors.minPlayers`, `errors.wolkeMinOne`
   - `data-submit-ready="true|false"` on the result submit button
   - `data-start-player="true"` on the first (rotated) prediction/result row
   - winner container: `data-winner-count`, `data-points`, `data-winner-names="a|b"`
   - scoreboard cells: `data-prediction`, `data-tricks`, `data-received-tricks`,
     `data-points`, `data-wolke="true|false"`; header cells via
     `headerPlayer(i)` / `headerLabel(i, kind)` (kind: `prediction|tricks|points`)
3. **Keep it fast.** Advanced states are *seeded*, not clicked through; artificial
   delays are bypassed (except in `waiting.spec.ts`).
4. **Rich `test.step` descriptions** in English, one `await test.step('…', async () …)`
   per logical step so failures are readable in the report/UI timeline.

### 8.2 The `?e2e=1` bypass
`src/e2eFlag.ts` → `isE2E()` returns true when the query string has `e2e`. It zeroes:
- the 2s loading splash (`LoadingScreen`), and
- the 2s result submit-lock (`ResultOverlay`).

All specs open the app via `openApp(game)` which defaults to `/?e2e=1`. Only
`e2e/waiting.spec.ts` deliberately opens **without** the flag
(`openApp(game, { e2e: false })`) to test those real delays. Behaviour without the
flag is unchanged for real users. If you add another artificial delay in the product,
gate it with `isE2E()` and cover the un-bypassed path in `waiting.spec.ts`.

### 8.3 Config & projects
`playwright.config.ts`:
- `baseURL: 'http://localhost:4173'`, production build via `vite preview`
  (`webServer.command: 'npm run build && npm run preview -- --port 4173 --strictPort'`,
  `reuseExistingServer: !CI`).
- `fullyParallel: true`; `timeout: 30s`, `expect.timeout: 5s`; CI: `retries 1`,
  `workers 2`; `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`.
- Two projects, each test runs **exactly once**:
  - `chromium-desktop` — everything **not** tagged `@mobile` (`grepInvert: /@mobile/`)
  - `chromium-mobile` — Pixel 7 emulation, only tests whose **title contains `@mobile`**
- So: to run a test on mobile, put `@mobile` at the end of its title. Do not tag a
  test both ways.

### 8.4 Fixtures & page-object helpers (`e2e/fixtures.ts`)
Use these instead of re-implementing flows:
- `game` — the test's `Page` with `localStorage` cleared via `addInitScript`.
- `openApp(page, { e2e = true, locale?, waitReady = true })` — navigate; readiness is
  the generic `#root` not-empty check (works for config screen AND seeded in-game
  states). `locale: 'de' | 'en'` sets `i18nextLng` before load.
- `seedGameState(page, partialState)` — inject a `wizard_state_v1` object BEFORE boot
  to jump straight to mid-game / game-over / tie states without clicking rounds.
- `startGame(page, { players, rounds?, wolke?, notEqual? })` — fill config + start,
  asserts the prediction overlay is shown.
- `submitPredictions(page, values)` / `submitResults(page, values, wolkeIdx?)` —
  fill current round rows (already start-player rotated) and submit; `submitResults`
  waits for `data-submit-ready="true"`.
- `openNextRound(page)` — click the scoreboard's next-round button.
- `expectError(page, testId, errorKey)` — banner visible AND carries `data-error-key`.

Row order note: inputs are indexed by **visible row** (rotated), so helper `values[]`
map to the rotated players, not the roster order.

### 8.5 Coverage map (specs → area)
- `configure-game.spec.ts` — names/rounds/rules/validation, `roundsForCount`, info dialogs
- `prediction.spec.ts` — submit, prefill, start-player rotation, too-small/large, not-equal
- `result.spec.ts` — points formula, all-zero confirm, Wolke rules, revert
- `scoreboard.spec.ts` — two-row header, the full cell matrix (all players × all rounds,
  incl. both Wolke branches), point sums/deltas, and that no prediction cell carries an
  animation/highlight class (the old F5 pulse must not come back)
- `game-flow.spec.ts` — integration: persistence across reload, round advance, reset, last round → winner
- `winner.spec.ts` — 1 / 2 / N winners via seeded finished games
- `i18n.spec.ts` — same testid structure under `de` and `en` (proves locale-safety)
- `responsive.spec.ts` — desktop vs mobile fullscreen button, mobile overlay input
- `waiting.spec.ts` — real (un-bypassed) splash + submit-lock timing, no `?e2e`

### 8.6 Adding a new selector / test — checklist
1. Add the id under the right group in `src/test-ids.ts` (`T`). Use a function for
   indexed elements (e.g. `cell(player, round, kind)`).
2. Attach `data-testid={T.…}` in the component. If the state is textual, also expose
   a `data-*` attribute carrying the i18n key or a number/boolean.
3. Write/extend a spec using `game.getByTestId(...)` + `test.step(...)`; prefer existing
   fixtures over new boilerplate. Seed state instead of playing many rounds.
4. Assert attributes, not strings. Tag `@mobile` in the title only if it belongs to the
   mobile project.
5. Run it locally: `npm run test:e2e:ui` (or scoped `npx playwright test e2e/foo.spec.ts`).
6. Keep `src/test-ids.ts`, `gameStore.ts`, and both translation.json in sync when adding
   features.

---

## 9. CI (GitHub Actions)

- `e2e.yml` — on push/PR to `master` + `workflow_dispatch`: Node 24, `npm ci`,
  Playwright Chromium (with `~/.cache/ms-playwright` cache keyed on `package-lock`),
  `npx playwright test` (webServer builds/serves itself), uploads `playwright-report/`
  + `test-results/` (7-day retention) with `if: always()`.
- `pull_request.yml` — Prettier check + `npm run lint` (comments on failures), then a
  Docker build/run smoke test against `<title>Wizard Punkteblock</title>`.
- `build_and_push.yml` — on `master` push: builds, deploys GitHub Pages, bumps version
  (`npm version patch`), builds/pushes the Docker image, creates a release. Skips itself
  on version-bump commits.
- `dependabot.yml` / `dependabot-automerge.yml` — dependency updates.

A PR to `master` therefore gates on: prettier-clean, lint-clean, Docker smoke, and the
E2E suite. Run `npm run format` and `npm run test:e2e` locally before pushing.

---

## 10. Code style & conventions

- **ESLint** (flat `eslint.config.js`): `@eslint/js` + `typescript-eslint` +
  `@eslint-react` (`recommended-typescript`). `npm run lint` covers `src`, `e2e`,
  `playwright.config.ts` and `vite.config.ts`. For `e2e/**` the React-specific rules
  (`rules-of-hooks`, `no-missing-key`) are switched **off** — Playwright fixtures are
  not React (the `use` fixture param would otherwise be a false positive). Current
  `src` warnings (setState-in-effect, array-index key) are tolerated; **errors** are not.
- **Prettier**: no config file → defaults. `prettier`/`prettier:check`/`format` cover
  `src/**/*.{ts,tsx,js,jsx}`, `e2e/**/*.ts` and the two root configs.
- TypeScript `strict`; import with the `T` id object and store hooks; functional
  components; Tailwind utility classes for styling.
- Forms use `noValidate` and app-level validation (so localized `data-error-key`
  banners are reachable, not native browser bubbles).
- The trick inputs in `PredictionOverlay`/`ResultOverlay` deliberately have **no
  `max` attribute** (only `min={0}`): an HTML `max` belongs to the browser's
  range validation, which keeps the app's own `predictionTooLarge` / `valueTooLarge`
  checks unreachable. Range limits are enforced in the submit handlers only.
- `base: './'` — assets are relative, so the app works under GitHub Pages sub-paths and
  the query string `?e2e=1` is preserved on load.
- The scoreboard's three sub-columns are deliberately **fixed-width** (`w-12` = 48 px,
  `px-0.5 text-xs`): the table is auto-layout, so the longest cell content — a header
  label — would otherwise stretch its column and unbalance the whole table (this is what
  made the old "Vorhersage" column ~1.7× too wide). Keep header labels short (de `Tipp`,
  en `Bid`) and padding at `px-0.5` so the widest unbreakable string (`4→2☁`) still fits;
  `scoreboard.spec.ts` guards that all three widths are equal within 1 px. The `<table>` has
  **no `w-full`** for the same reason — with fixed data columns, a full-width table hands
  every leftover pixel to the "Runde" column and stretches it into an empty block.
- The scoreboard cells are **animation-free by decision** (UX-REVIEW F5): the pulse hint that
  once flagged the last played round is removed, so `Scoreboard.tsx` has no `useState`/`useEffect`,
  no timer and no `matchMedia` there. Do not re-introduce a highlight animation to indicate
  clickability — make the affordance permanent instead (see F12 in `UX-REVIEW.md`).

---

## 11. Gotchas for agents

- `npm run build`/`preview` never type-check; run `npm run typecheck` (also in the pre-commit hook and CI).
- Engine mismatch aborts install because of `.npmrc engine-strict=true` — this is
  intentional; switch Node, do not delete the flag.
- `src/assets/animation.gif` exists but is **unreferenced** — do not assume it is used.
- Adding a translation key: put it in BOTH `de` and `en`, otherwise `fallbackLng: 'de'`
  hides the gap and tests won't notice.
- Keep E2E assertions free of **localized** text or a locale change will break them; the
  `i18n.spec.ts` suite enforces that discipline structurally. Plain numbers are the
  exception — they cannot be translated, so asserting a cell's visible digits is safe.
- Do not put E2E into a pre-commit hook (slow by design); it belongs to CI.
