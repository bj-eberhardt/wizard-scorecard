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
    Header.tsx / Footer.tsx / LanguageSwitcher.tsx / FullscreenButton.tsx / LoadingScreen.tsx
    InfoTooltip.tsx     # rule explainer modal (Wolke / NotEqual)
  hooks/
    useDialogA11y.ts    # shared modal focus behaviour (trap, Escape, focus restore)
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
Tailwind v4 (PostCSS via `@tailwindcss/postcss`), Zustand v5, i18next v17, lucide-react
(all UI icons — `Plus`/`X` in ConfigureGame, `CircleHelp` in InfoTooltip, `Maximize`/
`Minimize` in FullscreenButton — are lucide components, never a hand-drawn `<svg>`).

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
- **Dealer (shuffler):** derived only, never persisted — `dealerIndex = (startIndex - 1 +
  playerCount) % playerCount`, the seat to the LEFT of the start player (`getCurrentDealerIndex()`
  in `gameStore.ts`). That is also the LAST row of the rotated overlay order and therefore the
  player who predicts last (the `predictionNotEqualLast` case). `PredictionOverlay` names both
  roles in one info box under its title, as a single running sentence joined by a middot
  (two i18n keys, so each language keeps its own word order; cards per player = `currentRound`);
  the `ResultOverlay` and the scoreboard deliberately show nothing (UX-REVIEW F8, teilumgesetzt).
- **Default rounds by player count** (`roundsForCount`): 3→20, 4→15, 5→12, ≥6→10.
- **Config screen (F9):** starts with 3 player rows (prefilled from remembered names, min 3 /
  max 6); `+` (lucide `Plus`) appends a row, `×` (lucide `X`) removes one and shifts the rest up,
  so rows are always gap-free and the old `gapInNames` validation is gone. No `×` is rendered at
  exactly 3 rows. The rounds block shows only at ≥3 players as a segmented control "Standard (n)"
  (carries `data-default-rounds`) / "Eigene" (the manual `config-rounds` number input).
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
| `wizard_settings_v1` | `settingsStore.ts` (zustand `persist`) | remembered `playerNames` (6 slots), `useAnniversaryRules`, `useNotEqual`, explicit `language` choice (`'de' | 'en' | null`) |
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
  (`announcement_single|two|multiple`) chosen in code, not i18next plurals. The one
  exception is `predictionOverlay.dealerInfo_one|_other`: the dealt-card count is a plain
  grammatical number, so it goes through i18next's `count` mechanism — a single key would
  render the wrong German "1 Karten" in round 1.
- **Rule for agents:** never hardcode a UI string in a component — add a key and use
  `t(...)`. And never assert a UI string in tests — use `data-*` (§8).
- **Language switching:** the footer shows two flag buttons (🇩🇪/🇬🇧, `role="group"`,
  `aria-label`, `aria-pressed`, ids `T.footer.langButton(lng)`); the click persists `language` in
  `settingsStore` AND calls `i18n.changeLanguage`. On boot `i18n.ts` reads the persisted choice
  directly from `wizard_settings_v1` (localStorage) and passes it as `lng` — an explicit choice
  **overrides the browser detector** (and therefore also the fixture's `i18nextLng`). Without a
  stored choice the detector behaves as before (`fallbackLng: 'de'`). `document.documentElement.lang`
  is synced at init and on `languageChanged` — `index.html`'s `lang="de"` is only the boot value.
  The flags themselves are **inline SVG** in `LanguageSwitcher.tsx`, not flag emoji: lucide ships no
  country symbols, and on Windows emoji of regional indicators render as the letters "DE"/"GB".
  Because they are graphics, a test can never assert them as text — `data-lang`/`aria-pressed`
  carry the state.
- **The footer is an always-visible fixed bar** (`Footer.tsx`: `fixed inset-x-0 bottom-0 z-30`),
  mounted in both `App.tsx` branches, so the language is switchable on every screen and every
  device — start, scoreboard, winner — **and while a round overlay is open**. Its z-30 sits above
  the two full-screen overlays (`PredictionOverlay`, `ResultOverlay`, `z-20`) so the flag buttons
  stay clickable mid-round, but below the modal dialogs (`z-50`) and the splash (`z-[1000]`),
  which are allowed to cover it. The overlays deliberately **do not** host a second switcher —
  the language choice lives only in `LanguageSwitcher` (its own component, rendered by the footer).
  Because the bar overlays page content, every scroll container reserves its height: both `App.tsx`
  root wrappers use `pb-28`, the sticky next-round button is raised to `bottom-24`, and the overlays
  are `overflow-y-auto` with `pb-28` so their submit buttons never hide behind the footer.

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
   - `data-default-rounds` on the config's "standard" rounds segment → the auto round count
     for the current player count (the manual `config-rounds` input only exists in "custom" mode)
   - `data-submit-ready="true|false"` on the result submit button
   - `data-start-player="true"` on the first (rotated) **prediction** row only — the
     result overlay has no role marker and no such attribute
   - `data-dealer-index` / `data-cards` on the dealer line and `data-start-index` on the
     start-player line (both inside the prediction overlay's single role info box) — the
     indices are ORIGINAL roster indices, not visible row numbers, so a rotation change
     cannot silently re-label them
   - winner container: `data-winner-count`, `data-points`, `data-winner-names="a|b"`
   - scoreboard cells: `data-prediction`, `data-tricks`, `data-received-tricks`,
     `data-points`, `data-wolke="true|false"`; header cells via
     `headerPlayer(i)` / `headerLabel(i, kind)` (kind: `prediction|tricks|points`)
   - `data-autofocus` marks the control that receives initial focus inside a modal dialog
     (consumed by `useDialogA11y`; asserted with `toBeFocused()`, never via text)
   - `data-lang` on the footer flag buttons → the language code each button switches to
   **Accessibility state is asserted the same way** — `role`/`aria-*` attributes and
   `toBeFocused()`/`keyboard.press(...)` — so a locale change can never break those tests.
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
  states). `locale: 'de' | 'en'` sets `i18nextLng` before load — note that a persisted
  explicit language choice in `wizard_settings_v1` OVERRIDES it (tests seed/clear the
  settings key accordingly).
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
- `configure-game.spec.ts` — names/rounds/rules/validation, `roundsForCount`, info dialogs incl.
  their keyboard path (modal attributes, focus trap, Escape, focus return — F12);
  F9 flow: add/remove player rows (gap-free by construction), standard/custom rounds segments
- `prediction.spec.ts` — submit, prefill, start-player rotation, dealer/start-player info
  lines (round-1 wrap-around + one-seat-on), too-small/large, not-equal
- `result.spec.ts` — points formula, all-zero confirm, Wolke rules, revert
- `scoreboard.spec.ts` — two-row header, the full cell matrix (all players × all rounds,
  incl. both Wolke branches), point sums/deltas, the centred table and primary button
  (equal left/right gaps), and that no prediction cell carries an
  animation/highlight class (the old F5 pulse must not come back)
- `game-flow.spec.ts` — integration: persistence across reload, round advance, reset, last round
  → winner; plus the F11 action separation (bounding-box distance of the destructive link from
  the primary button) and the F12 confirm-dialog keyboard path
- `winner.spec.ts` — 1 / 2 / N winners via seeded finished games
- `i18n.spec.ts` — same testid structure under `de` and `en` (proves locale-safety); plus the
  footer language switcher: the two flag buttons, `aria-pressed`, `<html lang>` sync, persistence across
  reload, that the stored choice overrides the detector (`data-lang`/`aria-*`, no text asserts), and
  that the footer is present on **every** screen (start, scoreboard, winner — switching works
  mid-game) while neither overlay contains a switcher of its own.
- `responsive.spec.ts` — desktop vs mobile fullscreen button, mobile overlay input, and that a
  six-player board on a phone is still wider than the viewport and still horizontally scrollable
  (the centring wrapper must shrink to the screen, not outgrow it)
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
- **Everything sits on the page's centre line** (UX-REVIEW F24): header, config column,
  scoreboard, primary and destructive action, winner card. The board is centred by its scroll
  wrapper (`flex justify-center` + `overflow-x-auto max-w-full`, no `w-full`): the wrapper
  shrinks to the table, so a 3-player board is not flush left on a desktop screen, and it is
  still capped at the viewport, so a 6-player board keeps scrolling horizontally on a phone.
  Buttons are centred by a wrapper `div` (`flex justify-center`) rather than by widening them;
  the sticky next-round button keeps `sticky bottom-24 z-[200]` **on that wrapper** (`bottom-24`, not
  `bottom-2`, so it clears the always-visible fixed footer bar underneath it). Narrow
  centred columns use `max-w-md mx-auto` (config form, winner card, InfoTooltip panel) — that
  is a deliberate content width, not a leftover. `scoreboard.spec.ts` asserts equal left/right
  gaps for table and primary button; the `@mobile` test in `responsive.spec.ts` asserts the
  board is still wider than the viewport and still scrollable.
- The scoreboard cells are **animation-free by decision** (UX-REVIEW F5): the pulse hint that
  once flagged the last played round is removed, so `Scoreboard.tsx` has no `useState`/`useEffect`,
  no timer and no `matchMedia` there. Do not re-introduce a highlight animation to indicate
  clickability — the cells are not clickable at all; the way into the next round is the sticky
  primary button (see F11 in `UX-REVIEW.md`).
- **Action layout of the scoreboard screen** (UX-REVIEW F11): the destructive "new game" action is
  a centred ghost link ABOVE the table, the primary "next round" button keeps its **content
  width** and is `sticky bottom-2`. Do not move the destructive action back into the sticky bar and
  do not widen the primary button to full width — `game-flow.spec.ts` measures the distance between
  the two and will fail.
- **Modal dialogs** (UX-REVIEW F12) share `src/hooks/useDialogA11y.ts`: `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby` with a `useId()` id (never a hard-coded one), the safe
  control carrying `data-autofocus`, Escape bound to the **cancel** path, and focus returned to the
  trigger on close. A new dialog gets the hook, not a copy of the effect. Note that a
  programmatically focused element shows no `:focus-visible` ring in Chromium — the ring appears
  from the first Tab on, which is also how the `ux-shots/capture-f12.mjs` proofs are produced.

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
- A `vite preview` left over from an earlier run keeps port 4173, and
  `reuseExistingServer: !CI` then **reuses it without rebuilding** — the suite silently
  tests the previous bundle. If a layout change shows no effect, check
  `Get-NetTCPConnection -LocalPort 4173` and compare the `dist/` timestamp with your edits;
  `npm run build` alone refreshes it in place (preview serves from disk).
