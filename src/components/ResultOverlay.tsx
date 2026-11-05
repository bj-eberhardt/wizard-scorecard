import { useGameStore } from '../store/gameStore';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';
import { isE2E } from '../e2eFlag';
import { NumberStepper } from './NumberStepper';
import { ValidationError } from './ValidationError';
import { IntroAnimation } from './IntroAnimation';
import resultIntro from '../assets/result-intro.gif';
import {
  getOriginalPlayerIndex,
  getStartPlayerIndex,
  rotateByStartIndex,
} from '../domain/gameRules';
import { evaluateWolke, validateResultSum } from '../domain/scoring';
import { getResultOverlayTiming } from '../domain/overlayRules';

export function ResultOverlay({
  close,
  skipIntroAnimation = false,
}: {
  close: () => void;
  skipIntroAnimation?: boolean;
}) {
  const { t } = useTranslation();
  const {
    players,
    currentRound,
    setResult,
    advanceRound,
    useAnniversaryRules,
    setOverlay,
    setSkipPredictionIntro,
  } = useGameStore();
  const startPlayerIndex = getStartPlayerIndex(currentRound, players.length);
  const rotatedPlayers = rotateByStartIndex(players, startPlayerIndex);
  const isCorrection = players.some(
    (player) =>
      typeof player.receivedResults?.[currentRound - 1] === 'number' ||
      typeof player.results?.[currentRound - 1] === 'number'
  );
  const overlayTiming = getResultOverlayTiming(isCorrection, isE2E());
  const [results, setResults] = useState<number[]>(() => {
    const roundIndex = currentRound - 1;
    return rotatedPlayers.map((player) =>
      isCorrection
        ? (player.receivedResults?.[roundIndex] ?? player.results?.[roundIndex] ?? 0)
        : (player.predictions?.[roundIndex] ?? 0)
    );
  });
  const [wolkeFlags, setWolkeFlags] = useState<boolean[]>(() =>
    rotatedPlayers.map((player) => !!player.wolkeUsed?.[currentRound - 1])
  );
  const [error, setError] = useState<string>('');
  // raw i18n key of the current error, exposed via data-error-key for E2E
  const [errorKey, setErrorKey] = useState<string>('');
  // prevent immediate submit: disable OK for a short time after the overlay opens
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(
    () => overlayTiming.submitDisabledInitially
  );
  const timerRef = useRef<number | null>(null);

  // A correction reopens a round that already has stored result data. It should be
  // immediately submittable; the short anti-accidental-submit lock is for new rounds.
  const showError = (key: string, options?: Record<string, unknown>) => {
    setError(t(key, options));
    setErrorKey(key);
  };

  useEffect(() => {
    // enable submit after 2 seconds (immediately in e2e runs to keep tests fast)
    // This state update is intentional: it is the timer's state transition.
    // eslint-disable-next-line @eslint-react/set-state-in-effect
    setSubmitDisabled(overlayTiming.submitDisabledInitially);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    if (!overlayTiming.submitDisabledInitially && overlayTiming.submitLockMs === 0) return;
    timerRef.current = window.setTimeout(
      () => setSubmitDisabled(false),
      overlayTiming.submitLockMs
    );
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [overlayTiming.submitDisabledInitially, overlayTiming.submitLockMs]);

  const clearError = () => {
    if (error) setError('');
    if (errorKey) setErrorKey('');
  };
  const anyWolkeSelected = useAnniversaryRules && wolkeFlags.some((v) => v);

  const submit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (submitDisabled) return;

    const tooSmallInputPlayerIndex = results
      .map((val, i) => (val < 0 ? i : -1))
      .filter((i) => i !== -1);

    if (tooSmallInputPlayerIndex.length > 0) {
      showError('errors.valueTooSmall', {
        playerNames: tooSmallInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
      });
      return;
    }

    const tooLargeInputPlayerIndex = results
      .map((val, i) => (val > currentRound ? i : -1))
      .filter((i) => i !== -1);

    if (tooLargeInputPlayerIndex.length > 0) {
      showError('errors.valueTooLarge', {
        playerNames: tooLargeInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
      });
      return;
    }

    for (let i = 0; i < players.length; i++) {
      if (useAnniversaryRules && wolkeFlags[i] && results[i] < 1) {
        showError('errors.wolkeMinOne', { playerName: rotatedPlayers[i].name });
        return;
      }
    }

    if (wolkeFlags.filter((i) => i).length > 1) {
      showError('errors.onlyOneWolke');
      return;
    }

    const sumValidation = validateResultSum(results, currentRound, useAnniversaryRules);
    if (!sumValidation.valid) {
      showError(useAnniversaryRules ? 'errors.resultSumAnniversary' : 'errors.resultSum', {
        round: currentRound,
        roundMinusOne: currentRound - 1,
      });
      return;
    }

    results.forEach((val, i) => {
      const originalIndex = getOriginalPlayerIndex(i, startPlayerIndex, players.length);
      const prediction = players[originalIndex].predictions[currentRound - 1];
      const wolke = evaluateWolke(prediction, val, useAnniversaryRules, wolkeFlags[i]);
      // pass the raw entered value (received tricks) so it can be shown in the tooltip
      setResult(originalIndex, wolke.effectiveResult, {
        wolkeUsed: wolke.wolkeApplied,
        receivedTricks: val,
        adjustedPrediction: wolke.adjustedPrediction,
      });
    });
    advanceRound();
    close();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start md:items-center justify-center overflow-y-auto z-20 px-4 py-4 md:py-6"
      data-testid={T.result.overlay}
    >
      <form
        className="relative bg-panel border border-line p-4 rounded-lg shadow-2xl w-96 max-w-full max-h-[calc(100dvh-2rem)] overflow-y-auto"
        noValidate
        onSubmit={(e) => submit(e)}
      >
        <h2 className="relative z-20 text-lg font-bold mb-2">
          {t('resultOverlay.title', { round: currentRound })}
        </h2>
        <IntroAnimation
          src={resultIntro}
          testId={T.result.intro}
          imageTestId={T.result.introImage}
          overlayClassName="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-panel transition-opacity duration-500"
          durationMs={5000}
          skipAnimation={skipIntroAnimation || overlayTiming.skipIntroAnimation}
        >
          {rotatedPlayers.map((p, i) => (
            <div
              key={p.name}
              data-testid={T.result.playerRow(i)}
              className="flex min-w-0 flex-col gap-2 mb-2 xs:flex-row xs:items-center xs:justify-between"
            >
              <div className="min-w-0 flex-1">
                <span className="break-words">{p.name}</span>
                <span className="italic">
                  &nbsp;{t('resultOverlay.tip', { tip: p.predictions[currentRound - 1] })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end xs:self-auto">
                {/* No `max` attribute: the browser would block submission with a native,
                  unlocalized bubble before our app validation can run. Range checks are
                  owned by `valueTooSmall` / `valueTooLarge` below. */}
                <div className="hidden md:block">
                  <input
                    autoFocus={i == 0}
                    type="number"
                    min={0}
                    value={results[i]}
                    data-testid={T.result.input(i)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      clearError();
                      const copy = [...results];
                      copy[i] = parseInt(e.target.value);
                      setResults(copy);
                    }}
                    className="border border-line bg-surface text-ink rounded p-1 w-16 text-right tabular-nums"
                  />
                </div>
                <div className="md:hidden">
                  <NumberStepper
                    value={results[i]}
                    min={0}
                    max={currentRound}
                    onChange={(value) => {
                      clearError();
                      const copy = [...results];
                      copy[i] = value;
                      setResults(copy);
                    }}
                    decreaseLabel={t('numberStepper.decrease')}
                    increaseLabel={t('numberStepper.increase')}
                    testId={T.result.stepper(i)}
                  />
                </div>
                {useAnniversaryRules && (
                  <label className="text-xs shrink-0 self-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={wolkeFlags[i]}
                      data-testid={T.result.wolke(i)}
                      onChange={(e) => {
                        clearError();
                        const copy = [...wolkeFlags];
                        copy[i] = e.target.checked;
                        setWolkeFlags(copy);
                      }}
                      className="accent-gold"
                    />{' '}
                    &nbsp;{t('resultOverlay.wolke')}
                  </label>
                )}
              </div>
            </div>
          ))}
          {error && <ValidationError message={error} errorKey={errorKey} testId={T.result.error} />}
          {/* single info line above the buttons, shown once if any wolke is selected */}
          {anyWolkeSelected && (
            <div
              className="text-sm text-ink-soft bg-white/5 p-2 rounded mb-2"
              data-testid={T.result.wolkeInfo}
            >
              {t('resultOverlay.wolkeInfo')}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setError('');
                setErrorKey('');
                setSkipPredictionIntro(true);
                setOverlay('prediction');
              }}
              data-testid={T.result.revert}
              className="btn-secondary flex-0 px-3"
              title={t('resultOverlay.revertButton')}
            >
              ↶
            </button>
            <button
              type={'submit'}
              onClick={(e) => submit(e)}
              disabled={submitDisabled}
              aria-disabled={submitDisabled}
              aria-busy={submitDisabled}
              data-submit-ready={submitDisabled ? 'false' : 'true'}
              data-testid={T.result.submit}
              className={`flex-1 px-4 py-2 rounded-md ${submitDisabled ? 'min-h-11 bg-white/10 text-ink-soft cursor-not-allowed' : 'btn-primary'}`}
            >
              {submitDisabled
                ? t('resultOverlay.submitButtonDisabled')
                : t('resultOverlay.submitButton')}
            </button>
          </div>
        </IntroAnimation>
      </form>
    </div>
  );
}
