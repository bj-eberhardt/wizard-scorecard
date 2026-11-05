import { describe, expect, it } from 'vitest';
import { getIntroTransitionAfterPrediction, getResultOverlayTiming } from './overlayRules';

describe('getResultOverlayTiming', () => {
  it('skips both intro and submit lock for corrections', () => {
    expect(getResultOverlayTiming(true, false)).toEqual({
      skipIntroAnimation: true,
      submitDisabledInitially: false,
      submitLockMs: 0,
    });
  });

  it('keeps the normal submit lock outside e2e runs', () => {
    expect(getResultOverlayTiming(false, false)).toEqual({
      skipIntroAnimation: false,
      submitDisabledInitially: true,
      submitLockMs: 2000,
    });
  });

  it('keeps the intro but removes only the artificial lock in e2e runs', () => {
    expect(getResultOverlayTiming(false, true)).toEqual({
      skipIntroAnimation: false,
      submitDisabledInitially: true,
      submitLockMs: 0,
    });
  });
});

describe('getIntroTransitionAfterPrediction', () => {
  it('carries a return transition from prediction to result', () => {
    expect(
      getIntroTransitionAfterPrediction({ target: 'prediction', carryToNextResult: true })
    ).toEqual({
      target: 'result',
      carryToNextResult: false,
    });
  });

  it('clears a normal or already consumed transition', () => {
    expect(getIntroTransitionAfterPrediction(null)).toBeNull();
    expect(
      getIntroTransitionAfterPrediction({ target: 'prediction', carryToNextResult: false })
    ).toBeNull();
    expect(
      getIntroTransitionAfterPrediction({ target: 'result', carryToNextResult: false })
    ).toBeNull();
  });
});
