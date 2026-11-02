/**
 * Single source of truth for E2E test selectors.
 *
 * Components attach these values as `data-testid` attributes and the Playwright
 * specs import the very same object, so a rename can never silently break tests.
 *
 * IMPORTANT: localized state (error messages, winner announcements, submit-lock)
 * is additionally exposed through `data-*` attributes so tests never assert on
 * visible text (which changes with the active language).
 */

export type CellKind = 'points' | 'prediction' | 'tricks';

export const T = {
  loading: {
    splash: 'loading-splash',
  },
  config: {
    root: 'config-root',
    playerName: (i: number) => `config-player-name-${i}`,
    removePlayer: (i: number) => `config-remove-player-${i}`,
    addPlayer: 'config-add-player',
    rounds: 'config-rounds',
    roundsModeStandard: 'config-rounds-mode-standard',
    roundsModeCustom: 'config-rounds-mode-custom',
    anniversary: 'config-anniversary',
    notEqual: 'config-not-equal',
    infoWolke: 'config-info-wolke',
    infoNotEqual: 'config-info-not-equal',
    startButton: 'config-start-button',
    error: 'config-error',
  },
  prediction: {
    overlay: 'prediction-overlay',
    playerRow: (i: number) => `prediction-row-${i}`,
    input: (i: number) => `prediction-input-${i}`,
    submit: 'prediction-submit',
    error: 'prediction-error',
    // the two info lines under the title: dealer (shuffles & deals) and start player
    dealerInfo: 'prediction-dealer-info',
    startPlayerInfo: 'prediction-start-player-info',
  },
  result: {
    overlay: 'result-overlay',
    playerRow: (i: number) => `result-row-${i}`,
    input: (i: number) => `result-input-${i}`,
    wolke: (i: number) => `result-wolke-${i}`,
    submit: 'result-submit',
    revert: 'result-revert',
    error: 'result-error',
    confirmZero: 'result-confirm-zero',
    wolkeInfo: 'result-wolke-info',
  },
  scoreboard: {
    table: 'scoreboard-table',
    headerPlayer: (player: number) => `scoreboard-header-player-${player}`,
    headerLabel: (player: number, kind: CellKind) => `scoreboard-header-label-${kind}-${player}`,
    cell: (player: number, round: number, kind: CellKind) =>
      `scoreboard-cell-${kind}-${player}-${round}`,
  },
  winner: {
    container: 'winner-container',
  },
  app: {
    nextRound: 'app-next-round',
    newGame: 'app-new-game',
    confirmDialog: 'app-confirm-dialog',
    confirmYes: 'app-confirm-yes',
    confirmCancel: 'app-confirm-cancel',
  },
  header: {
    fullscreen: 'header-fullscreen',
  },
  footer: {
    root: 'footer',
    // desktop: one flag button per supported language, indexed by the i18n code
    langButton: (lng: 'de' | 'en') => `footer-lang-${lng}`,
    // mobile: one compact chip that cycles between the two supported languages
    langToggle: 'footer-lang-toggle',
    copyright: 'footer-copyright',
  },
  infoModal: {
    dialog: 'info-modal-dialog',
    close: 'info-modal-close',
  },
} as const;
