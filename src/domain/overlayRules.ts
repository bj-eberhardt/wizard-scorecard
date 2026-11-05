import type { IntroTransition } from './types';

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

export function getIntroTransitionAfterPrediction(
  transition: IntroTransition | null
): IntroTransition | null {
  if (transition?.target === 'prediction' && transition.carryToNextResult) {
    return { target: 'result', carryToNextResult: false };
  }
  return null;
}
