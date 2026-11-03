import { create } from 'zustand';

export interface Player {
  name: string;
  predictions: number[];
  results: number[];
  points: number[];
  // per-round flag whether 'Wolke' (anniversary rule) was applied
  wolkeUsed?: boolean[];
  // store the original prediction at the time of result (for display/history)
  receivedResults?: number[];
}

type OverlayState = 'prediction' | 'result' | 'none';

interface GameState {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  gameStarted: boolean;
  useAnniversaryRules: boolean;
  useNotEqual: boolean;
  overlay: OverlayState;
  setPlayerNames: (names: string[]) => void;
  setTotalRounds: (rounds: number) => void;
  setPrediction: (playerIndex: number, value: number) => void;
  // value is the actual result (after applying wolke logic), meta optionally contains wolkeUsed and originalPrediction
  setResult: (
    playerIndex: number,
    value: number,
    meta?: { wolkeUsed?: boolean; receivedTricks?: number }
  ) => void;
  advanceRound: () => void;
  correctLastRound: () => void;
  resetGame: () => void;
  rematch: () => void;
  setUseAnniversaryRules: (use: boolean) => void;
  setUseNotEqual: (use: boolean) => void;
  setOverlay: (o: OverlayState) => void;
  saveToStorage: () => void;
  getCurrentStartPlayerIndex: () => number;
  getCurrentDealerIndex: () => number;
}

const STORAGE_KEY = 'wizard_state_v1';

// helper to compute total rounds by player count
export function roundsForCount(n: number) {
  if (n === 3) return 20;
  if (n === 4) return 15;
  if (n === 5) return 12;
  if (n >= 6) return 10;
  return 0;
}

// helper to get the starting player index for the current round
function getStartPlayerIndex(round: number, playerCount: number): number {
  return (round - 1) % playerCount;
}

/**
 * Helper to get the dealer (shuffler) index for the current round. Wizard rule: the
 * player to the LEFT of the dealer opens the round, so the dealer is the seat directly
 * before the start player — which is the LAST row of the rotated overlay order and, in
 * that order, also the player who predicts last (`errors.predictionNotEqualLast`).
 * Derived on demand, never stored: it adds nothing to the persisted game state.
 */
function getDealerIndex(round: number, playerCount: number): number {
  if (playerCount < 1) return 0;
  return (getStartPlayerIndex(round, playerCount) - 1 + playerCount) % playerCount;
}

function loadFromStorage(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load state', e);
    return null;
  }
}

export const useGameStore = create<GameState>((set, get) => {
  // try load
  const saved = loadFromStorage();

  const initialPlayers: Player[] = saved?.players ?? [];
  const initialCurrentRound: number = saved?.currentRound ?? 1;
  // backward compatible: if saved.totalRounds is missing or 0, compute from player count
  const initialTotalRounds: number =
    saved?.totalRounds ?? (initialPlayers.length ? roundsForCount(initialPlayers.length) : 0);
  const initialGameStarted: boolean = saved?.gameStarted ?? false;
  const initialUseAnniversaryRules: boolean = saved?.useAnniversaryRules ?? false;
  const initialUseNotEqual: boolean = saved?.useNotEqual ?? false;
  const initialOverlay: OverlayState = saved?.overlay ?? 'none';

  const save = () => {
    try {
      const s = {
        players: get().players,
        currentRound: get().currentRound,
        totalRounds: get().totalRounds,
        gameStarted: get().gameStarted,
        useAnniversaryRules: get().useAnniversaryRules,
        useNotEqual: get().useNotEqual,
        overlay: get().overlay,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      console.error('Save failed', e);
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
    setPlayerNames: (names: string[]) => {
      const players = names.map((name) => ({
        name,
        predictions: [],
        results: [],
        points: [],
        wolkeUsed: [],
        receivedResults: [],
      }));
      const rounds = roundsForCount(players.length);
      set({ players, totalRounds: rounds, gameStarted: true, currentRound: 1 }, false);
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
      const prediction = players[i].predictions?.[r] ?? 0;
      const lastPoints = players[i].points?.[r - 1] ?? 0;
      const correct = prediction === value;
      const points = correct ? 20 + value * 10 : -Math.abs(prediction - value) * 10;
      if (!players[i].results) players[i].results = [];
      if (!players[i].points) players[i].points = [];
      if (!players[i].wolkeUsed) players[i].wolkeUsed = [];
      if (!players[i].receivedResults) players[i].receivedResults = [];
      players[i].results[r] = value;
      // store wolke flag and original prediction for this round
      players[i].wolkeUsed[r] = meta?.wolkeUsed ?? false;
      // store the raw entered tricks (received) so we can display what was typed
      players[i].receivedResults[r] = meta?.receivedTricks ?? value;
      players[i].points[r] = lastPoints + points;
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
        },
        false
      );
      try {
        localStorage.removeItem(STORAGE_KEY);
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
        results: [],
        points: [],
        wolkeUsed: [],
        receivedResults: [],
      }));
      set({ players: fresh, currentRound: 1, gameStarted: true, overlay: 'prediction' }, false);
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
    saveToStorage: save,
    getCurrentStartPlayerIndex: () => {
      return getStartPlayerIndex(get().currentRound, get().players.length);
    },
    getCurrentDealerIndex: () => {
      return getDealerIndex(get().currentRound, get().players.length);
    },
  };
});
