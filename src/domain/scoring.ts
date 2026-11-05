export function calculateRoundPoints(prediction: number, effectiveResult: number): number {
  return prediction === effectiveResult
    ? 20 + effectiveResult * 10
    : -Math.abs(prediction - effectiveResult) * 10;
}

export interface ResultSumValidation {
  valid: boolean;
  actual: number;
  expected: number[];
}

export function validateResultSum(
  enteredResults: readonly number[],
  round: number,
  useAnniversaryRules: boolean
): ResultSumValidation {
  const actual = enteredResults.reduce((sum, value) => sum + value, 0);
  const expected = useAnniversaryRules ? [round - 1, round] : [round];
  return { valid: expected.includes(actual), actual, expected };
}

export function recalculateCumulativePoints(
  predictions: readonly number[],
  effectiveResults: readonly number[],
  preservedPoints: readonly number[] = []
): number[] {
  let cumulative = 0;
  return effectiveResults.map((result, roundIndex) => {
    const preserved = preservedPoints[roundIndex];
    if (typeof preserved === 'number') {
      cumulative = preserved;
      return preserved;
    }

    cumulative += calculateRoundPoints(predictions[roundIndex] ?? 0, result);
    return cumulative;
  });
}

export interface WolkeEvaluation {
  effectiveResult: number;
  wolkeApplied: boolean;
}

export function evaluateWolke(
  prediction: number,
  enteredResult: number,
  useAnniversaryRules: boolean,
  wolkeSelected: boolean
): WolkeEvaluation {
  if (!useAnniversaryRules || !wolkeSelected) {
    return { effectiveResult: enteredResult, wolkeApplied: false };
  }

  return {
    effectiveResult: Math.abs(prediction - enteredResult) === 1 ? prediction : prediction + 1,
    wolkeApplied: true,
  };
}
