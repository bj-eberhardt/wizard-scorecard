export interface ResultOverlayTiming {
  skipIntroAnimation: boolean;
  submitDisabledInitially: boolean;
  submitLockMs: number;
}

export function getResultOverlayTiming(isCorrection: boolean, isE2E: boolean): ResultOverlayTiming {
  if (isCorrection) {
    return {
      skipIntroAnimation: true,
      submitDisabledInitially: false,
      submitLockMs: 0,
    };
  }

  return {
    skipIntroAnimation: false,
    submitDisabledInitially: true,
    submitLockMs: isE2E ? 0 : 2000,
  };
}

export function shouldSkipPredictionIntro(isReturningToResult: boolean): boolean {
  return isReturningToResult;
}
