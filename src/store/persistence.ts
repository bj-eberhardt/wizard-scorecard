import type { Player } from '../domain/types';
import { evaluateWolke, recalculateCumulativePoints } from '../domain/scoring';

export const LEGACY_GAME_STORAGE_KEY = 'wizard_state_v1';
export const GAME_STORAGE_KEY = 'wizard_state_v2';
export const INVALID_GAME_STORAGE_KEY = 'wizard_state_v2_backup';
export const INVALID_LEGACY_GAME_STORAGE_KEY = 'wizard_state_v1_backup';

export type PersistedOverlay = 'prediction' | 'result' | 'none';

export interface PersistedPlayerV2 {
  name: string;
  predictions: number[];
  adjustedPredictions?: number[];
  results: number[];
  points: number[];
  wolkeUsed: boolean[];
  receivedResults: number[];
}

export interface PersistedGameV2 {
  version: 2;
  players: PersistedPlayerV2[];
  currentRound: number;
  totalRounds: number;
  gameStarted: boolean;
  useAnniversaryRules: boolean;
  useNotEqual: boolean;
  overlay: PersistedOverlay;
}

type LegacyGame = {
  version?: unknown;
  players?: unknown;
  currentRound?: unknown;
  totalRounds?: unknown;
  gameStarted?: unknown;
  useAnniversaryRules?: unknown;
  useNotEqual?: unknown;
  overlay?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteInteger(value) && value >= 0;
}

function isNumberArray(value: unknown, nonNegative = false): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => (nonNegative ? isNonNegativeInteger(item) : isFiniteInteger(item)))
  );
}

function isBooleanArray(value: unknown): value is boolean[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'boolean');
}

function hasAllowedArrayLength(value: readonly unknown[], totalRounds: number): boolean {
  return value.length <= totalRounds;
}

/** Validate only the persisted data shape; unknown properties are intentionally ignored. */
export function validateGameState(input: unknown): input is PersistedGameV2 {
  if (!isRecord(input) || input.version !== 2) return false;
  if (!Array.isArray(input.players) || input.players.length < 3 || input.players.length > 6) {
    return false;
  }
  if (!isNonNegativeInteger(input.currentRound) || input.currentRound < 1) return false;
  if (!isNonNegativeInteger(input.totalRounds) || input.totalRounds < 1) return false;
  const totalRounds = input.totalRounds;
  if (input.currentRound > totalRounds + 1) return false;
  if (typeof input.gameStarted !== 'boolean') return false;
  if (typeof input.useAnniversaryRules !== 'boolean') return false;
  if (typeof input.useNotEqual !== 'boolean') return false;
  if (input.overlay !== 'prediction' && input.overlay !== 'result' && input.overlay !== 'none') {
    return false;
  }

  return input.players.every((player) => {
    if (!isRecord(player) || typeof player.name !== 'string' || player.name.trim() === '') {
      return false;
    }
    if (!isNumberArray(player.predictions, true)) return false;
    if (
      player.adjustedPredictions !== undefined &&
      !isNumberArray(player.adjustedPredictions, true)
    ) {
      return false;
    }
    if (!isNumberArray(player.results, true)) return false;
    if (!isNumberArray(player.points)) return false;
    if (!isBooleanArray(player.wolkeUsed)) return false;
    if (!isNumberArray(player.receivedResults, true)) return false;

    return [
      player.predictions,
      ...(player.adjustedPredictions ? [player.adjustedPredictions] : []),
      player.results,
      player.points,
      player.wolkeUsed,
      player.receivedResults,
    ].every((array) => hasAllowedArrayLength(array, totalRounds));
  });
}

function migratePlayer(
  player: unknown,
  useAnniversaryRules: boolean,
  totalRounds: number
): PersistedPlayerV2 | null {
  if (!isRecord(player) || typeof player.name !== 'string' || player.name.trim() === '') {
    return null;
  }

  const predictions = player.predictions ?? [];
  const hasAdjustedPredictions = Array.isArray(player.adjustedPredictions);
  const adjustedPredictions = player.adjustedPredictions ?? [];
  const results = player.results ?? [];
  const points = player.points ?? [];
  const wolkeUsed = player.wolkeUsed ?? [];
  const hasReceivedResults = Array.isArray(player.receivedResults);
  const receivedResults = player.receivedResults ?? results;

  if (
    !isNumberArray(predictions, true) ||
    !isNumberArray(adjustedPredictions, true) ||
    !isNumberArray(results, true) ||
    !isNumberArray(points) ||
    !isBooleanArray(wolkeUsed) ||
    !isNumberArray(receivedResults, true)
  ) {
    return null;
  }

  const isLegacyResultShape = !hasAdjustedPredictions;
  const actualResults = isLegacyResultShape && hasReceivedResults ? receivedResults : results;
  const migratedAdjustedPredictions = isLegacyResultShape
    ? predictions.map((prediction, roundIndex) => {
        const result = actualResults[roundIndex];
        return useAnniversaryRules && wolkeUsed[roundIndex] && typeof result === 'number'
          ? evaluateWolke(prediction, result, true, true).adjustedPrediction
          : prediction;
      })
    : predictions.map((prediction, roundIndex) => adjustedPredictions[roundIndex] ?? prediction);
  const migratedPoints = isLegacyResultShape
    ? recalculateCumulativePoints(predictions, actualResults, [], migratedAdjustedPredictions)
    : points;

  const migrated: PersistedPlayerV2 = {
    name: player.name,
    predictions,
    adjustedPredictions: migratedAdjustedPredictions,
    results: actualResults,
    points: migratedPoints,
    wolkeUsed,
    receivedResults,
  };

  if (
    ![
      migrated.predictions,
      migrated.adjustedPredictions,
      migrated.results,
      migrated.points,
      migrated.wolkeUsed,
      migrated.receivedResults,
    ].every((array) => (array?.length ?? 0) <= totalRounds)
  ) {
    return null;
  }

  return migrated;
}

/** Convert both the unversioned V1 shape and V2 into the current format. */
export function migrateGameState(input: unknown): PersistedGameV2 | null {
  if (!isRecord(input)) return null;
  if (input.version !== undefined && input.version !== 2) return null;

  const raw = input as LegacyGame;
  if (
    !Array.isArray(raw.players) ||
    !isNonNegativeInteger(raw.currentRound) ||
    !isNonNegativeInteger(raw.totalRounds) ||
    typeof raw.gameStarted !== 'boolean' ||
    typeof raw.useAnniversaryRules !== 'boolean' ||
    typeof raw.useNotEqual !== 'boolean' ||
    (raw.overlay !== 'prediction' && raw.overlay !== 'result' && raw.overlay !== 'none')
  ) {
    return null;
  }

  const players = raw.players.map((player) =>
    migratePlayer(player, raw.useAnniversaryRules as boolean, raw.totalRounds as number)
  );
  if (players.some((player): player is null => player === null)) return null;

  const migrated: PersistedGameV2 = {
    version: 2,
    players: players as PersistedPlayerV2[],
    currentRound: raw.currentRound,
    totalRounds: raw.totalRounds,
    gameStarted: raw.gameStarted,
    useAnniversaryRules: raw.useAnniversaryRules,
    useNotEqual: raw.useNotEqual,
    overlay: raw.overlay,
  };

  return validateGameState(migrated) ? migrated : null;
}

export function parsePersistedGame(raw: string | null): PersistedGameV2 | null {
  if (raw === null) return null;
  try {
    return migrateGameState(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function serializeGameState(state: PersistedGameV2): string {
  if (!validateGameState(state)) throw new Error('Cannot serialize invalid game state');
  return JSON.stringify(state);
}

export function toPersistedGame(
  state: Pick<
    PlayerStateForPersistence,
    | 'players'
    | 'currentRound'
    | 'totalRounds'
    | 'gameStarted'
    | 'useAnniversaryRules'
    | 'useNotEqual'
    | 'overlay'
  >
): PersistedGameV2 {
  return {
    version: 2,
    players: state.players.map((player) => ({
      name: player.name,
      predictions: player.predictions,
      // Backfill this field for older games before validation. Using map avoids
      // sparse arrays, which JSON serializes as null and the validator rejects.
      adjustedPredictions: player.predictions.map(
        (prediction, roundIndex) => player.adjustedPredictions?.[roundIndex] ?? prediction
      ),
      results: player.results,
      points: player.points,
      wolkeUsed: player.wolkeUsed ?? [],
      receivedResults: player.receivedResults ?? player.results,
    })),
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    gameStarted: state.gameStarted,
    useAnniversaryRules: state.useAnniversaryRules,
    useNotEqual: state.useNotEqual,
    overlay: state.overlay,
  };
}

export interface PlayerStateForPersistence {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  gameStarted: boolean;
  useAnniversaryRules: boolean;
  useNotEqual: boolean;
  overlay: PersistedOverlay;
}

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read localStorage key ${key}`, error);
    return null;
  }
}

export function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to write localStorage key ${key}`, error);
    return false;
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove localStorage key ${key}`, error);
  }
}

/** Load V2 first, then migrate V1. Invalid data is deliberately discarded. */
export function loadPersistedGame(): PersistedGameV2 | null {
  const currentRaw = readStorage(GAME_STORAGE_KEY);
  if (currentRaw !== null) {
    const current = parsePersistedGame(currentRaw);
    if (current) {
      // A valid V2 payload may still use an older V2 shape. Persist the normalized
      // representation so migration is completed even without a later user action.
      const normalized = serializeGameState(current);
      if (normalized !== currentRaw) {
        if (!writeStorage(GAME_STORAGE_KEY, normalized)) {
          console.warn('Game state was migrated in memory but could not be persisted.');
        }
      }
      return current;
    }
    console.warn('Stored V2 game state is invalid; resetting the game.');
    // Keep a recovery copy. A failed migration must never destroy the only
    // remaining game data before the user has had a chance to recover it.
    writeStorage(INVALID_GAME_STORAGE_KEY, currentRaw);
    removeStorage(GAME_STORAGE_KEY);
  }

  const legacyRaw = readStorage(LEGACY_GAME_STORAGE_KEY);
  if (legacyRaw === null) return null;
  const migrated = parsePersistedGame(legacyRaw);
  if (!migrated) {
    console.warn('Stored legacy game state is invalid; resetting the game.');
    writeStorage(INVALID_LEGACY_GAME_STORAGE_KEY, legacyRaw);
    removeStorage(LEGACY_GAME_STORAGE_KEY);
    return null;
  }

  if (writeStorage(GAME_STORAGE_KEY, serializeGameState(migrated))) {
    removeStorage(LEGACY_GAME_STORAGE_KEY);
  } else {
    console.warn('Legacy game state was loaded but could not be migrated to V2.');
  }
  return migrated;
}
