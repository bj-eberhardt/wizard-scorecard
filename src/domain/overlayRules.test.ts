import { describe, expect, it } from 'vitest';
import { getResultOverlayTiming, shouldSkipPredictionIntro } from './overlayRules';

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

describe('shouldSkipPredictionIntro', () => {
  it('skips the intro when returning from the result dialog', () => {
    expect(shouldSkipPredictionIntro(true)).toBe(true);
  });

  it('keeps the intro for a new prediction round', () => {
    expect(shouldSkipPredictionIntro(false)).toBe(false);
  });
});
