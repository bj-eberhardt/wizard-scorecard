export function roundsForCount(playerCount: number): number {
  if (playerCount === 3) return 20;
  if (playerCount === 4) return 15;
  if (playerCount === 5) return 12;
  if (playerCount >= 6) return 10;
  return 0;
}

export function getStartPlayerIndex(round: number, playerCount: number): number {
  return (round - 1) % playerCount;
}

export function getDealerIndex(round: number, playerCount: number): number {
  if (playerCount < 1) return 0;
  return (getStartPlayerIndex(round, playerCount) - 1 + playerCount) % playerCount;
}

export function rotateByStartIndex<T>(items: readonly T[], startIndex: number): T[] {
  return [...items.slice(startIndex), ...items.slice(0, startIndex)];
}

export function getOriginalPlayerIndex(
  visibleIndex: number,
  startPlayerIndex: number,
  playerCount: number
): number {
  return (visibleIndex + startPlayerIndex) % playerCount;
}

export type PredictionValidation =
  | { valid: true }
  | {
      valid: false;
      kind: 'tooSmall' | 'tooLarge';
      playerIndexes: number[];
    }
  | {
      valid: false;
      kind: 'notEqual';
      lastPlayerIndex: number;
    };

export function validatePredictions(
  predictions: readonly number[],
  round: number,
  useNotEqual: boolean
): PredictionValidation {
  const tooSmall = predictions
    .map((value, index) => (value < 0 ? index : -1))
    .filter((index) => index !== -1);
  if (tooSmall.length > 0) {
    return { valid: false, kind: 'tooSmall', playerIndexes: tooSmall };
  }

  const tooLarge = predictions
    .map((value, index) => (value > round ? index : -1))
    .filter((index) => index !== -1);
  if (tooLarge.length > 0) {
    return { valid: false, kind: 'tooLarge', playerIndexes: tooLarge };
  }

  if (useNotEqual && predictions.reduce((sum, value) => sum + value, 0) === round) {
    return {
      valid: false,
      kind: 'notEqual',
      lastPlayerIndex: Math.max(0, predictions.length - 1),
    };
  }

  return { valid: true };
}
