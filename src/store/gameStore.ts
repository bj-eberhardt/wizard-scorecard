import { create } from 'zustand';

export interface Player {
  name: string;
  predictions: number[];
  results: number[];
  points: number[];
}

interface GameState {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  gameStarted: boolean;
  setPlayerNames: (names: string[]) => void;
  setPrediction: (playerIndex: number, value: number) => void;
  setResult: (playerIndex: number, value: number) => void;
  advanceRound: () => void;
  resetGame: () => void;
  useAnniversaryRules: boolean;
  setUseAnniversaryRules: (use: boolean) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  players: [],
  currentRound: 1,
  totalRounds: 0,
  gameStarted: false,
  setPlayerNames: (names) => {
    const rounds = names.length === 3 ? 20 : names.length === 4 ? 15 : names.length === 5 ? 12 : 10;
    set({
      players: names.map(name => ({
        name,
        predictions: [],
        results: [],
        points: [],
      })),
      totalRounds: rounds,
      gameStarted: true,
    });
  },
  setPrediction: (i, value) => {
    const players = [...get().players];
    players[i].predictions[get().currentRound - 1] = value;
    set({ players });
  },
  setResult: (i, value) => {
    const players = [...get().players];
    const r = get().currentRound - 1;
    const prediction = players[i].predictions[r];
    const lastPoints = players[i].points[r - 1] ?? 0;
    const correct = prediction === value;
    const points = correct ? 20 + value * 10 : -Math.abs(prediction - value) * 10;
    players[i].results[r] = value;
    players[i].points[r] = lastPoints + points;
    set({ players });
  },
  advanceRound: () => set({ currentRound: get().currentRound + 1 }),
  resetGame: () => set({ players: [], currentRound: 1, totalRounds: 0, gameStarted: false }),
  useAnniversaryRules: false,
  setUseAnniversaryRules: (use) => set({ useAnniversaryRules: use }),
}));
