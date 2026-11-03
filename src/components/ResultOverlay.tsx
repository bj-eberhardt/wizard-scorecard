import { useGameStore } from '../store/gameStore';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';
import { isE2E } from '../e2eFlag';

export function ResultOverlay({ close }: { close: () => void }) {
  const { t } = useTranslation();
  const {
    players,
    currentRound,
    setResult,
    advanceRound,
    useAnniversaryRules,
    getCurrentStartPlayerIndex,
    setOverlay,
  } = useGameStore();
  const [results, setResults] = useState<number[]>(Array(players.length).fill(0));
  const [wolkeFlags, setWolkeFlags] = useState<boolean[]>(Array(players.length).fill(false));
  const [error, setError] = useState<string>('');
  // raw i18n key of the current error, exposed via data-error-key for E2E
  const [errorKey, setErrorKey] = useState<string>('');
  // prevent immediate submit: disable OK for a short time after the overlay opens
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);
  // confirmation for all-zero inputs (not allowed accidentally for rounds > 1)
  const [confirmZero, setConfirmZero] = useState<boolean>(false);

  const showError = (key: string, options?: Record<string, unknown>) => {
    setError(t(key, options));
    setErrorKey(key);
  };

  useEffect(() => {
    // enable submit after 2 seconds (immediately in e2e runs to keep tests fast)
    setSubmitDisabled(true);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setSubmitDisabled(false), isE2E() ? 0 : 2000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  // reset confirmation if user changes any input
  useEffect(() => {
    if (confirmZero) setConfirmZero(false);
    if (error) setError('');
  }, [results, wolkeFlags]);

  const startPlayerIndex = getCurrentStartPlayerIndex();
  const rotatedPlayers = [
    ...players.slice(startPlayerIndex),
    ...players.slice(0, startPlayerIndex),
  ];
  const anyWolkeSelected = useAnniversaryRules && wolkeFlags.some((v) => v);

  const submit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (submitDisabled) return;

    // If not first round and all results are zero, require an explicit confirm click
    const allZero = results.every((v) => v === 0);
    if (currentRound !== 1 && allZero && !confirmZero) {
      setConfirmZero(true);
      return;
    }

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

    results.forEach((val, i) => {
      const originalIndex = (i + startPlayerIndex) % players.length;
      let actualResult = val;
      const prediction = players[originalIndex].predictions[currentRound - 1];
      let wolkeApplied = false;
      if (useAnniversaryRules && wolkeFlags[i]) {
        wolkeApplied = true;
        if (Math.abs(prediction - val) === 1) {
          actualResult = prediction;
        } else {
          actualResult = prediction + 1;
        }
      }
      // pass the raw entered value (received tricks) so it can be shown in the tooltip
      setResult(originalIndex, actualResult, { wolkeUsed: wolkeApplied, receivedTricks: val });
    });
    // clear confirm state and proceed
    setConfirmZero(false);
    advanceRound();
    close();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex  xs:items-[normal] items-center justify-center overflow-y-auto z-20 px-4 py-6 md:pb-28"
      data-testid={T.result.overlay}
    >
      <form
        className="relative bg-panel border border-line p-4 rounded-lg shadow-2xl w-96"
        noValidate
        onSubmit={(e) => submit(e)}
      >
        <h2 className="text-lg font-bold mb-2">
          {t('resultOverlay.title', { round: currentRound })}
        </h2>
        {rotatedPlayers.map((p, i) => (
          <div
            key={p.name}
            data-testid={T.result.playerRow(i)}
            className="flex justify-between mb-2"
          >
            <div>
              <span>{p.name}</span>
              <span className="italic">
                &nbsp;{t('resultOverlay.tip', { tip: p.predictions[currentRound - 1] })}
              </span>
            </div>
            <div>
              {/* No `max` attribute: the browser would block submission with a native,
                  unlocalized bubble before our app validation can run. Range checks are
                  owned by `valueTooSmall` / `valueTooLarge` below. */}
              <input
                autoFocus={i == 0}
                type="number"
                min={0}
                value={results[i]}
                data-testid={T.result.input(i)}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const copy = [...results];
                  copy[i] = parseInt(e.target.value);
                  setResults(copy);
                }}
                className="border border-line bg-surface text-ink rounded p-1 w-16 text-right tabular-nums"
              />
              {useAnniversaryRules && (
                <label className="text-xs ml-2 self-center">
                  <input
                    tabIndex={-1}
                    type="checkbox"
                    checked={wolkeFlags[i]}
                    data-testid={T.result.wolke(i)}
                    onChange={(e) => {
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
        {error && (
          <div
            className="bg-danger-soft text-danger p-2 mb-2 rounded"
            data-testid={T.result.error}
            data-error-key={errorKey}
          >
            {error}
          </div>
        )}
        {confirmZero && (
          <div
            className="bg-warn-soft text-yellow-200 p-2 mb-2 rounded"
            data-testid={T.result.confirmZero}
          >
            {t('resultOverlay.confirmAllZero')}
          </div>
        )}
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
              setConfirmZero(false);
              setError('');
              setErrorKey('');
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
      </form>
    </div>
  );
}
