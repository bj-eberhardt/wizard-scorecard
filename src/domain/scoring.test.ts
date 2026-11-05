import { describe, expect, it } from 'vitest';
import { calculateRoundPoints, evaluateWolke, recalculateCumulativePoints } from './scoring';

describe('scoring rules', () => {
  it('awards the correct points for hits and misses', () => {
    expect(calculateRoundPoints(0, 0)).toBe(20);
    expect(calculateRoundPoints(3, 3)).toBe(50);
    expect(calculateRoundPoints(3, 1)).toBe(-20);
    expect(calculateRoundPoints(1, 3)).toBe(-20);
  });

  it('recalculates cumulative points for all completed results', () => {
    expect(recalculateCumulativePoints([0, 2, 1], [0, 1, 1])).toEqual([20, 10, 40]);
    expect(recalculateCumulativePoints([1, 0], [0, 0])).toEqual([-10, 10]);
  });

  it('preserves an existing cumulative prefix when only a later round is entered', () => {
    expect(recalculateCumulativePoints([1, 2], [1, 2], [30])).toEqual([30, 70]);
  });

  it('leaves results unchanged when Wolke is not active', () => {
    expect(evaluateWolke(3, 2, false, true)).toEqual({
      effectiveResult: 2,
      wolkeApplied: false,
    });
    expect(evaluateWolke(3, 2, true, false)).toEqual({
      effectiveResult: 2,
      wolkeApplied: false,
    });
  });

  it('turns a one-trick difference into a correct result with Wolke', () => {
    expect(evaluateWolke(3, 2, true, true)).toEqual({
      effectiveResult: 3,
      wolkeApplied: true,
    });
  });

  it('uses prediction plus one for other Wolke differences', () => {
    expect(evaluateWolke(3, 0, true, true)).toEqual({
      effectiveResult: 4,
      wolkeApplied: true,
    });
  });
});
