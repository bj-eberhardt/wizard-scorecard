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
  results: readonly number[],
  preservedPoints: readonly number[] = [],
  adjustedPredictions: readonly number[] = []
): number[] {
  let cumulative = 0;
  return results.map((result, roundIndex) => {
    const preserved = preservedPoints[roundIndex];
    if (typeof preserved === 'number') {
      cumulative = preserved;
      return preserved;
    }

    cumulative += calculateRoundPoints(
      adjustedPredictions[roundIndex] ?? predictions[roundIndex] ?? 0,
      result
    );
    return cumulative;
  });
}

export interface WolkeEvaluation {
  effectiveResult: number;
  adjustedPrediction: number;
  wolkeApplied: boolean;
}

function adjustPredictionForWolke(prediction: number, enteredResult: number): number {
  if (enteredResult === prediction) return prediction + 1;
  return prediction + Math.sign(enteredResult - prediction);
}

export function evaluateWolke(
  prediction: number,
  enteredResult: number,
  useAnniversaryRules: boolean,
  wolkeSelected: boolean
): WolkeEvaluation {
  if (!useAnniversaryRules || !wolkeSelected) {
    return {
      effectiveResult: enteredResult,
      adjustedPrediction: prediction,
      wolkeApplied: false,
    };
  }

  return {
    effectiveResult: enteredResult,
    adjustedPrediction: adjustPredictionForWolke(prediction, enteredResult),
    wolkeApplied: true,
  };
}
