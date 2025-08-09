import { create } from 'zustand';

export interface Player {
  name: string;
  predictions: number[];
  results: number[];
  points: number[];
}

type OverlayState = 'prediction' | 'result' | 'none';

interface GameState {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  gameStarted: boolean;
  useAnniversaryRules: boolean;
  overlay: OverlayState;
  setPlayerNames: (names: string[]) => void;
  setPrediction: (playerIndex: number, value: number) => void;
  setResult: (playerIndex: number, value: number) => void;
  advanceRound: () => void;
  resetGame: () => void;
  setUseAnniversaryRules: (use: boolean) => void;
  setOverlay: (o: OverlayState) => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'wizard_state_v1';

// helper to compute total rounds by player count
function roundsForCount(n: number) {
  if (n === 3) return 3; // TODO adjust 20;
  if (n === 4) return 15;
  if (n === 5) return 12;
  if (n >= 6) return 10;
  return 0;
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
  const initialTotalRounds: number = saved?.totalRounds ?? 0;
  const initialGameStarted: boolean = saved?.gameStarted ?? false;
  const initialUseAnniversaryRules: boolean = saved?.useAnniversaryRules ?? false;
  const initialOverlay: OverlayState = saved?.overlay ?? 'none';

  const save = () => {
    try {
      const s = {
        players: get().players,
        currentRound: get().currentRound,
        totalRounds: get().totalRounds,
        gameStarted: get().gameStarted,
        useAnniversaryRules: get().useAnniversaryRules,
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
    overlay: initialOverlay,
    setPlayerNames: (names: string[]) => {
      const players = names.map(name => ({
        name,
        predictions: [],
        results: [],
        points: [],
      }));
      const totalRounds = roundsForCount(players.length);
      set({ players, totalRounds, gameStarted: true, currentRound: 1 }, false);
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
    setResult: (i, value) => {
      const players = JSON.parse(JSON.stringify(get().players));
      const r = get().currentRound - 1;
      const prediction = players[i].predictions?.[r] ?? 0;
      const lastPoints = players[i].points?.[r - 1] ?? 0;
      const correct = prediction === value;
      const points = correct ? 20 + value * 10 : -Math.abs(prediction - value) * 10;
      if (!players[i].results) players[i].results = [];
      if (!players[i].points) players[i].points = [];
      players[i].results[r] = value;
      players[i].points[r] = lastPoints + points;
      set({ players }, false);
      save();
    },
    advanceRound: () => {
      set({ currentRound: get().currentRound + 1 }, false);
      save();
    },
    resetGame: () => {
      set({ players: [], currentRound: 1, totalRounds: 0, gameStarted: false, useAnniversaryRules: false, overlay: 'none' }, false);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    },
    setUseAnniversaryRules: (use) => {
      set({ useAnniversaryRules: use }, false);
      save();
    },
    setOverlay: (o) => {
      set({ overlay: o }, false);
      save();
    },
    saveToStorage: save,
  };
});
