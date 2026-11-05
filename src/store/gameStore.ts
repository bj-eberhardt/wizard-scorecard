import { create } from 'zustand';
import {
  GAME_STORAGE_KEY,
  INVALID_GAME_STORAGE_KEY,
  INVALID_LEGACY_GAME_STORAGE_KEY,
  LEGACY_GAME_STORAGE_KEY,
  loadPersistedGame,
  removeStorage,
  serializeGameState,
  toPersistedGame,
  writeStorage,
} from './persistence';
import { getDealerIndex, getStartPlayerIndex, roundsForCount } from '../domain/gameRules';
import { recalculateCumulativePoints } from '../domain/scoring';
import type { IntroOverlay, IntroTransition, OverlayState, Player } from '../domain/types';

export type { OverlayState, Player } from '../domain/types';

export const INTRO_TRANSITION_STORAGE_KEY = 'wizard_intro_transition_v1';

function readIntroTransition(): IntroTransition | null {
  try {
    const raw = sessionStorage.getItem(INTRO_TRANSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'target' in parsed &&
      (parsed.target === 'prediction' || parsed.target === 'result') &&
      'carryToNextResult' in parsed &&
      typeof parsed.carryToNextResult === 'boolean'
    ) {
      return parsed as IntroTransition;
    }
  } catch {
    // Ignore unavailable or malformed session state.
  }
  return null;
}

function writeIntroTransition(transition: IntroTransition | null) {
  try {
    if (transition) {
      sessionStorage.setItem(INTRO_TRANSITION_STORAGE_KEY, JSON.stringify(transition));
    } else {
      sessionStorage.removeItem(INTRO_TRANSITION_STORAGE_KEY);
    }
  } catch {
    // Ignore unavailable session storage; the in-memory transition still works.
  }
}

function getInitialIntroTransition(overlay: OverlayState): IntroTransition | null {
  const stored = readIntroTransition();
  if (stored) return stored;
  if (typeof window === 'undefined') return null;
  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'reload' && overlay !== 'none') {
    return { target: overlay as IntroOverlay, carryToNextResult: false };
  }
  return null;
}

interface GameState {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  gameStarted: boolean;
  useAnniversaryRules: boolean;
  useNotEqual: boolean;
  overlay: OverlayState;
  introTransition: IntroTransition | null;
  setPlayerNames: (names: string[]) => void;
  setTotalRounds: (rounds: number) => void;
  setPrediction: (playerIndex: number, value: number) => void;
  // value is the actual result; meta optionally contains Wolke metadata.
  setResult: (
    playerIndex: number,
    value: number,
    meta?: { wolkeUsed?: boolean; receivedTricks?: number; adjustedPrediction?: number }
  ) => void;
  advanceRound: () => void;
  correctLastRound: () => void;
  resetGame: () => void;
  rematch: () => void;
  setUseAnniversaryRules: (use: boolean) => void;
  setUseNotEqual: (use: boolean) => void;
  setOverlay: (o: OverlayState) => void;
  setIntroTransition: (transition: IntroTransition | null) => void;
  saveToStorage: () => void;
  getCurrentStartPlayerIndex: () => number;
  getCurrentDealerIndex: () => number;
}

export const useGameStore = create<GameState>((set, get) => {
  const saved = loadPersistedGame();

  const initialPlayers: Player[] = saved?.players ?? [];
  const initialCurrentRound: number = saved?.currentRound ?? 1;
  // backward compatible: if saved.totalRounds is missing or 0, compute from player count
  const initialTotalRounds: number =
    saved?.totalRounds ?? (initialPlayers.length ? roundsForCount(initialPlayers.length) : 0);
  const initialGameStarted: boolean = saved?.gameStarted ?? false;
  const initialUseAnniversaryRules: boolean = saved?.useAnniversaryRules ?? false;
  const initialUseNotEqual: boolean = saved?.useNotEqual ?? false;
  const initialOverlay: OverlayState = saved?.overlay ?? 'none';
  const initialIntroTransition = getInitialIntroTransition(initialOverlay);

  const save = () => {
    const state = get();
    const persisted = toPersistedGame(state);
    try {
      writeStorage(GAME_STORAGE_KEY, serializeGameState(persisted));
    } catch (error) {
      console.warn('Save failed because the game state was invalid.', error);
    }
  };

  return {
    players: initialPlayers,
    currentRound: initialCurrentRound,
    totalRounds: initialTotalRounds,
    gameStarted: initialGameStarted,
    useAnniversaryRules: initialUseAnniversaryRules,
    useNotEqual: initialUseNotEqual,
    overlay: initialOverlay,
    introTransition: initialIntroTransition,
    setPlayerNames: (names: string[]) => {
      const players = names.map((name) => ({
        name,
        predictions: [],
        adjustedPredictions: [],
        results: [],
        points: [],
        wolkeUsed: [],
        receivedResults: [],
      }));
      const rounds = roundsForCount(players.length);
      set(
        {
          players,
          totalRounds: rounds,
          gameStarted: true,
          currentRound: 1,
          introTransition: null,
        },
        false
      );
      writeIntroTransition(null);
      save();
    },
    setTotalRounds: (r) => {
      const rounds = r > 0 ? r : get().totalRounds;
      set({ totalRounds: rounds }, false);
      save();
    },
    setPrediction: (i, value) => {
      const players = JSON.parse(JSON.stringify(get().players));
      const r = get().currentRound - 1;
      if (!players[i].predictions) players[i].predictions = [];
      players[i].predictions[r] = value;
      set({ players }, false);
      save();
    },
    setResult: (i, value, meta) => {
      const players = JSON.parse(JSON.stringify(get().players));
      const r = get().currentRound - 1;
      if (!players[i].results) players[i].results = [];
      if (!players[i].adjustedPredictions) players[i].adjustedPredictions = [];
      if (!players[i].points) players[i].points = [];
      if (!players[i].wolkeUsed) players[i].wolkeUsed = [];
      if (!players[i].receivedResults) players[i].receivedResults = [];
      // Older persisted games do not have adjusted predictions yet. Backfill every
      // earlier round before writing the current one so the array contains no JSON holes.
      for (let roundIndex = 0; roundIndex <= r; roundIndex++) {
        if (typeof players[i].adjustedPredictions[roundIndex] !== 'number') {
          players[i].adjustedPredictions[roundIndex] = players[i].predictions[roundIndex] ?? 0;
        }
      }
      players[i].results[r] = value;
      players[i].adjustedPredictions[r] =
        meta?.adjustedPrediction ?? players[i].predictions[r] ?? 0;
      // store wolke flag and original prediction for this round
      players[i].wolkeUsed[r] = meta?.wolkeUsed ?? false;
      // store the raw entered tricks (received) so we can display what was typed
      players[i].receivedResults[r] = meta?.receivedTricks ?? value;
      players[i].points = recalculateCumulativePoints(
        players[i].predictions,
        players[i].results,
        players[i].points.slice(0, r),
        players[i].adjustedPredictions
      );
      set({ players }, false);
      save();
    },
    advanceRound: () => {
      set({ currentRound: get().currentRound + 1 }, false);
      save();
    },
    correctLastRound: () => {
      const { currentRound, gameStarted } = get();
      if (!gameStarted || currentRound <= 1) return;
      set({ currentRound: currentRound - 1, overlay: 'result' }, false);
      save();
    },
    resetGame: () => {
      set(
        {
          players: [],
          currentRound: 1,
          totalRounds: 0,
          gameStarted: false,
          useAnniversaryRules: false,
          useNotEqual: false,
          overlay: 'none',
          introTransition: null,
        },
        false
      );
      writeIntroTransition(null);
      try {
        removeStorage(GAME_STORAGE_KEY);
        removeStorage(LEGACY_GAME_STORAGE_KEY);
        removeStorage(INVALID_GAME_STORAGE_KEY);
        removeStorage(INVALID_LEGACY_GAME_STORAGE_KEY);
      } catch {
        // ignore
      }
    },
    rematch: () => {
      const oldPlayers = get().players;
      if (oldPlayers.length < 2) return;
      // Rotate: last becomes first, everyone else shifts down
      const rotated = [oldPlayers[oldPlayers.length - 1], ...oldPlayers.slice(0, -1)];
      // Clear round data, keep name
      const fresh: Player[] = rotated.map((p) => ({
        name: p.name,
        predictions: [],
        adjustedPredictions: [],
        results: [],
        points: [],
        wolkeUsed: [],
        receivedResults: [],
      }));
      set(
        {
          players: fresh,
          currentRound: 1,
          gameStarted: true,
          overlay: 'prediction',
          introTransition: null,
        },
        false
      );
      writeIntroTransition(null);
      save();
    },
    setUseAnniversaryRules: (use) => {
      set({ useAnniversaryRules: use }, false);
      save();
    },
    setUseNotEqual: (use) => {
      set({ useNotEqual: use }, false);
      save();
    },
    setOverlay: (o) => {
      set({ overlay: o }, false);
      save();
    },
    setIntroTransition: (transition) => {
      set({ introTransition: transition }, false);
      writeIntroTransition(transition);
    },
    saveToStorage: save,
    getCurrentStartPlayerIndex: () => {
      return getStartPlayerIndex(get().currentRound, get().players.length);
    },
    getCurrentDealerIndex: () => {
      return getDealerIndex(get().currentRound, get().players.length);
    },
  };
});
