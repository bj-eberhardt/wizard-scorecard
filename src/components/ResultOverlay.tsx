import { useGameStore } from '../store/gameStore';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  // prevent immediate submit: disable OK for a short time after the overlay opens
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);
  // confirmation for all-zero inputs (not allowed accidentally for rounds > 1)
  const [confirmZero, setConfirmZero] = useState<boolean>(false);

  useEffect(() => {
    // enable submit after 2 seconds
    setSubmitDisabled(true);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setSubmitDisabled(false), 2000);
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
      setError(
        t('errors.valueTooSmall', {
          playerNames: tooSmallInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
        })
      );
      return;
    }

    const tooLargeInputPlayerIndex = results
      .map((val, i) => (val > currentRound ? i : -1))
      .filter((i) => i !== -1);

    if (tooLargeInputPlayerIndex.length > 0) {
      setError(
        t('errors.valueTooLarge', {
          playerNames: tooLargeInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
        })
      );
      return;
    }

    for (let i = 0; i < players.length; i++) {
      if (useAnniversaryRules && wolkeFlags[i] && results[i] < 1) {
        setError(t('errors.wolkeMinOne', { playerName: rotatedPlayers[i].name }));
        return;
      }
    }

    if (wolkeFlags.filter((i) => i).length > 1) {
      setError(t('errors.onlyOneWolke'));
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex  xs:items-[normal] items-center justify-center z-20">
      <form className="relative bg-white p-4 rounded shadow w-96" onSubmit={(e) => submit(e)}>
        <h2 className="text-lg font-bold mb-2">
          {t('resultOverlay.title', { round: currentRound })}
        </h2>
        {rotatedPlayers.map((p, i) => (
          <div key={p.name} className="flex justify-between mb-2">
            <div>
              <span>{p.name}</span>
              <span className="italic">
                &nbsp;{t('resultOverlay.tip', { tip: p.predictions[currentRound - 1] })}
              </span>
            </div>
            <div>
              <input
                autoFocus={i == 0}
                type="number"
                min={0}
                max={currentRound}
                value={results[i]}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const copy = [...results];
                  copy[i] = parseInt(e.target.value);
                  setResults(copy);
                }}
                className="border w-16 p-1"
              />
              {useAnniversaryRules && (
                <label className="text-xs ml-2 self-center">
                  <input
                    tabIndex={-1}
                    type="checkbox"
                    checked={wolkeFlags[i]}
                    onChange={(e) => {
                      const copy = [...wolkeFlags];
                      copy[i] = e.target.checked;
                      setWolkeFlags(copy);
                    }}
                  />{' '}
                  &nbsp;{t('resultOverlay.wolke')}
                </label>
              )}
            </div>
          </div>
        ))}
        {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
        {confirmZero && (
          <div className="bg-orange-100 text-orange-800 p-2 mb-2 rounded">{t('resultOverlay.confirmAllZero')}</div>
        )}
        {/* single info line above the buttons, shown once if any wolke is selected */}
        {anyWolkeSelected && (
          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-2">{t('resultOverlay.wolkeInfo')}</div>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setConfirmZero(false);
              setError('');
              setOverlay('prediction');
            }}
            className="flex-0 bg-gray-200 text-gray-800 px-3 py-2 rounded"
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
            className={`flex-1 px-4 py-2 rounded ${submitDisabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-500 text-white'}`}
          >
            {submitDisabled ? t('resultOverlay.submitButtonDisabled') : t('resultOverlay.submitButton')}
          </button>
        </div>
      </form>
    </div>
  );
}
