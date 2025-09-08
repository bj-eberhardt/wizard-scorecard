import { useGameStore } from '../store/gameStore';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';


export function ResultOverlay({ close }: { close: () => void }) {
  const { t } = useTranslation();
  const { players, currentRound, setResult, advanceRound, useAnniversaryRules, getCurrentStartPlayerIndex } = useGameStore();
  const [results, setResults] = useState<number[]>(Array(players.length).fill(0));
  const [wolkeFlags, setWolkeFlags] = useState<boolean[]>(Array(players.length).fill(false));
  const [error, setError] = useState<string>('');

  const startPlayerIndex = getCurrentStartPlayerIndex();
  const rotatedPlayers = [...players.slice(startPlayerIndex), ...players.slice(0, startPlayerIndex)];

  const submit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const tooSmallInputPlayerIndex = results
      .map((val, i) => (val < 0 ? i : -1))
      .filter((i) => i !== -1);

    if (tooSmallInputPlayerIndex.length > 0) {
      setError(
        t('errors.valueTooSmall', {
          playerNames: tooSmallInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', ')
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
          playerNames: tooLargeInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', ')
        })
      );
      return;
    }

    for (let i = 0; i < players.length; i++) {
      if (useAnniversaryRules && wolkeFlags[i] && results[i] < 1) {
        setError(
          t('errors.wolkeMinOne', { playerName: rotatedPlayers[i].name })
        );
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
      if (useAnniversaryRules && wolkeFlags[i]) {
        const prediction = players[originalIndex].predictions[currentRound - 1];
        if (Math.abs(prediction - val) === 1) {
          actualResult = prediction;
        } else {
          actualResult = prediction + 1;
        }
      }
      setResult(originalIndex, actualResult);
    });
    advanceRound();
    close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex  xs:items-[normal] items-center justify-center z-20">
      <form className="bg-white p-4 rounded shadow w-96">
        <h2 className="text-lg font-bold mb-2">
          {t('resultOverlay.title', { round: currentRound })}
        </h2>
        {rotatedPlayers.map((p, i) => (
          <div key={p.name} className="flex justify-between mb-2">
            <div>
              <span>{p.name}</span>
              <span className="italic">&nbsp;{t('resultOverlay.tip', { tip: p.predictions[currentRound - 1] })}</span>
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
        <button
          type={'submit'}
          onClick={(e) => submit(e)}
          className="mt-2 bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          {t('resultOverlay.submitButton')}
        </button>
      </form>
    </div>
  );
}
