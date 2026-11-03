# Wizard Scoreboard — Development Guide

Local development, production builds, README screenshots, and Playwright E2E tests.
For the product overview and deployment details, see [README.md](README.md).

## Contents

- [Requirements](#requirements)
- [Local development](#local-development)
- [Production build and preview](#production-build-and-preview)
- [README screenshots](#readme-screenshots)
- [E2E tests](#e2e-tests)
  - [Commands](#commands)
  - [Projects and mobile tests](#projects-and-mobile-tests)
  - [Test conventions](#test-conventions)
- [CI](#ci)

## Requirements

| Tool                | Requirement                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js             | **24** (`package.json` → `engines.node: ">=24.0.0 <25.0.0"`). The root `.npmrc` has `engine-strict=true`; use `nvm use 24` if npm rejects another version.              |
| npm                 | Included with Node. Run `npm ci` to install the locked dependencies.                                                                                                    |
| Git + Husky         | `npm run prepare` installs the hooks automatically during `npm install`. The pre-commit hook runs lint, formatting, and type checks.                                    |
| Playwright Chromium | Install with `npx playwright install chromium`; required for E2E tests and screenshot generation.                                                                       |
| Docker (optional)   | The image uses `node:24-alpine` for the build and `nginx:alpine` to serve it.                                                                                           |
| Ports               | Dev: **5173**. Preview/E2E: **4173**. Both may run at the same time. The E2E web server uses `--strictPort`, so a second E2E run fails instead of using a stale server. |

## Local development

```bash
npm ci
npm run dev
```

`npm run dev` runs `vite --host`:

- Default URL: <http://localhost:5173/>
- Listens on all interfaces and prints LAN URLs, so a phone on the same network can open the app.
- If port 5173 is busy, Vite uses the next available port and prints the actual URL.
- The dev server is independent of the E2E/preview server on port 4173.

## Production build and preview

```bash
npm run build     # writes static assets to dist/
npm run preview   # serves dist/, usually on port 4173
```

Important build behavior:

- `vite.config.ts` uses `base: './'`; local builds therefore work on any web server and subpath.
- `npm run preview` falls back to another port if 4173 is busy. The E2E web server does not.
- GitHub Pages overrides the base path:

  ```bash
  npm run build -- --base "/wizard-scorecard/"
  ```

- The CI release ZIP uses that GitHub Pages base and therefore only works under
  `/wizard-scorecard/`. Use a relative local build, or provide the correct `--base`, for another
  deployment path.

### Docker image

Build and run the local nginx image:

```bash
docker build -t wizard-scoreboard .
docker run --rm -p 8080:80 wizard-scoreboard
```

Open <http://localhost:8080/>. The published Docker Hub image is documented in [README.md](README.md).

## README screenshots

Generate the German and English README screenshots from a production build:

```bash
npm run docs:screenshots
# equivalent to: npm run build && node scripts/capture-readme.mjs
```

The script starts an in-process Vite preview server, drives the app with Playwright, and writes:

| Files                | View                                               |
| -------------------- | -------------------------------------------------- |
| `docs/1-{de,en}.png` | Configuration with three player names (`fullPage`) |
| `docs/2-{de,en}.png` | Prediction overlay with entered tricks             |
| `docs/3-{de,en}.png` | Result overlay with entered tricks                 |
| `docs/4-{de,en}.png` | Scoreboard after three rounds (`fullPage`)         |

Screenshot settings:

- Mobile portrait viewport: `320 × 640`, `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true`.
- Language runs: `de-DE`/`de` and `en-US`/`en` (`locale` and `i18nextLng`).
- The app opens with `/?e2e=1`, bypassing the splash and submit-lock delays.
- Shot 4 seeds `wizard_state_v1` directly: three players, rounds 1–3 played, one Wolke in round 3.
- Default preview port: 4173. Override it in PowerShell:

  ```powershell
  $env:PREVIEW_PORT = "4213"; npm run docs:screenshots
  ```

The README capture script is versioned at `scripts/capture-readme.mjs`. Other
`ux-shots/capture-*.mjs` scripts create local UX evidence; `ux-shots/` is ignored by Git.
After updating screenshots, review `git status` and commit the changed `docs/*.png` files.

## E2E tests

The Playwright suite runs against a production build served by Vite preview on port 4173.

### Commands

```bash
npm run test:e2e          # complete suite; builds and starts preview automatically
npm run test:e2e:ui       # interactive UI runner with watch and time-travel debugging
npm run test:e2e:headed   # run with a visible browser
npm run test:e2e:report   # open the last HTML report
```

The UI runner supports selecting individual specs/tests, watch mode, and per-step screenshots,
DOM, network, and console inspection.

### Projects and mobile tests

`playwright.config.ts` defines two projects:

- `chromium-desktop`: every test not tagged `@mobile`.
- `chromium-mobile`: Pixel 7 emulation; only tests whose title contains `@mobile`.

Each test runs exactly once. Add `@mobile` at the end of a test title for mobile-only coverage.

### Test conventions

- **E2E bypass:** open `/?e2e=1` to skip the 2-second loading splash and result submit lock. The
  production path is unchanged; `waiting.spec.ts` covers the real delays without the flag.
- **Selectors:** use `data-testid` only. IDs are defined centrally in
  [`src/test-ids.ts`](src/test-ids.ts); do not select by text or CSS class.
- **Locale-safe assertions:** assert state attributes instead of localized strings, for example
  `data-error-key`, `data-winner-count`, and `data-submit-ready`.
- **Seed advanced states:** inject `localStorage` through `seedGameState` in
  [`e2e/fixtures.ts`](e2e/fixtures.ts) instead of clicking through many rounds.
- **Fixtures:** prefer the shared `game` fixture and helpers such as `openApp`, `startGame`,
  `submitPredictions`, `submitResults`, and `openNextRound`.

## CI

The E2E suite runs from `.github/workflows/e2e.yml` on pushes and pull requests targeting
`master`. The workflow installs Node 24 and Chromium, then runs the same Playwright suite used
locally. Reports and test artifacts are uploaded on every run, including failures.
