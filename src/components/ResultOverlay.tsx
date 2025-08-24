import { useGameStore } from '../store/gameStore';
import { useState } from 'react';

export function ResultOverlay({ close }: { close: () => void }) {
  const { players, currentRound, setResult, advanceRound, useAnniversaryRules } = useGameStore();
  const [results, setResults] = useState<number[]>(Array(players.length).fill(0));
  const [wolkeFlags, setWolkeFlags] = useState<boolean[]>(Array(players.length).fill(false));
  const [error, setError] = useState<string>('');

  const submit = () => {
    const tooSmallInputPlayerIndex = results
      .map((val, i) => (val < 0 ? i : -1))
      .filter((i) => i !== -1);

    if (tooSmallInputPlayerIndex.length > 0) {
      setError(
        `Der Wert ist zu klein für Spieler ${tooSmallInputPlayerIndex.map((i) => players[i].name).join(', ')}`
      );
      return;
    }

    const tooLargeInputPlayerIndex = results
      .map((val, i) => (val > currentRound ? i : -1))
      .filter((i) => i !== -1);

    if (tooLargeInputPlayerIndex.length > 0) {
      setError(
        `Der Wert ist zu groß für Spieler ${tooLargeInputPlayerIndex.map((i) => players[i].name).join(', ')}`
      );
      return;
    }

    for (let i = 0; i < players.length; i++) {
      if (useAnniversaryRules && wolkeFlags[i] && results[i] < 1) {
        setError(
          `Spieler "${players[i].name}" hat die Wolke bekommen und muss mindestens 1 Stich haben.`
        );
        return;
      }
    }

    if (wolkeFlags.filter((i) => i).length > 1) {
      setError(`Nur ein Spieler kann die Wolke in einer Runde als Stich bekommen.`);
      return;
    }

    results.forEach((val, i) => {
      let actualResult = val;
      if (useAnniversaryRules && wolkeFlags[i]) {
        const prediction = players[i].predictions[currentRound - 1];
        if (Math.abs(prediction - val) === 1) {
          actualResult = prediction;
        } else {
          actualResult = prediction + 1;
        }
      }
      setResult(i, actualResult);
    });
    advanceRound();
    close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex  xs:items-[normal] items-center justify-center z-20">
      <form className="bg-white p-4 rounded shadow w-96">
        <h2 className="text-lg font-bold mb-2">
          Spiele Runde {currentRound} und trage dann die Ergebnisse ein:
        </h2>
        {players.map((p, i) => (
          <div key={i} className="flex justify-between mb-2">
            <div>
              <span>{p.name}</span>
              <span className="italic">&nbsp;(Tipp: {p.predictions[currentRound - 1]})</span>
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
                  &nbsp;Wolke
                </label>
              )}
            </div>
          </div>
        ))}
        {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
        <button
          type={'submit'}
          onClick={submit}
          className="mt-2 bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          Runde beenden
        </button>
      </form>
    </div>
  );
}
