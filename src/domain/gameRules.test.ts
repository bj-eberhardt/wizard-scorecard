import { describe, expect, it } from 'vitest';
import {
  getDealerIndex,
  getOriginalPlayerIndex,
  getStartPlayerIndex,
  roundsForCount,
  rotateByStartIndex,
  validatePredictions,
} from './gameRules';
import { validateResultSum } from './scoring';

describe('game rules', () => {
  it('uses the standard number of rounds for each player count', () => {
    expect(roundsForCount(3)).toBe(20);
    expect(roundsForCount(4)).toBe(15);
    expect(roundsForCount(5)).toBe(12);
    expect(roundsForCount(6)).toBe(10);
  });

  it('rotates visible players from the round start player', () => {
    expect(rotateByStartIndex(['A', 'B', 'C', 'D'], 2)).toEqual(['C', 'D', 'A', 'B']);
    expect(getStartPlayerIndex(1, 4)).toBe(0);
    expect(getStartPlayerIndex(4, 4)).toBe(3);
    expect(getStartPlayerIndex(5, 4)).toBe(0);
  });

  it('derives the dealer immediately before the start player', () => {
    expect(getDealerIndex(1, 4)).toBe(3);
    expect(getDealerIndex(4, 4)).toBe(2);
    expect(getOriginalPlayerIndex(0, 3, 4)).toBe(3);
    expect(getOriginalPlayerIndex(2, 3, 4)).toBe(1);
  });

  it('reports prediction range errors before the not-equal rule', () => {
    expect(validatePredictions([-1, 1, 0], 1, true)).toEqual({
      valid: false,
      kind: 'tooSmall',
      playerIndexes: [0],
    });
    expect(validatePredictions([2, 0, 0], 1, true)).toEqual({
      valid: false,
      kind: 'tooLarge',
      playerIndexes: [0],
    });
  });

  it('rejects a prediction sum equal to the round when Not Equal is active', () => {
    expect(validatePredictions([1, 0, 0], 1, true)).toEqual({
      valid: false,
      kind: 'notEqual',
      lastPlayerIndex: 2,
    });
    expect(validatePredictions([0, 0, 0], 1, true)).toEqual({ valid: true });
  });

  it('validates classic and Anniversary result sums', () => {
    expect(validateResultSum([2, 1, 2], 5, false)).toEqual({
      valid: true,
      actual: 5,
      expected: [5],
    });
    expect(validateResultSum([1, 1, 1], 5, true)).toEqual({
      valid: false,
      actual: 3,
      expected: [4, 5],
    });
    expect(validateResultSum([2, 1, 1], 5, true)).toEqual({
      valid: true,
      actual: 4,
      expected: [4, 5],
    });
  });

  it('does not mutate rotated input', () => {
    const players = ['A', 'B', 'C'];
    const rotated = rotateByStartIndex(players, 1);
    expect(players).toEqual(['A', 'B', 'C']);
    expect(rotated).toEqual(['B', 'C', 'A']);
  });
});
