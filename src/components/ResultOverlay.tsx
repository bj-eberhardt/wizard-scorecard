import { useGameStore } from '../store/gameStore'
import { useState } from 'react'

export function ResultOverlay({ close }: { close: () => void }) {

  const { players, currentRound, setResult, advanceRound, useAnniversaryRules } = useGameStore();
  const [results, setResults] = useState<number[]>(Array(players.length).fill(0));
  const [wolkeFlags, setWolkeFlags] = useState<boolean[]>(Array(players.length).fill(false));

  const submit = () => {
    results.forEach((val, i) => {
      let actualResult = val;
      if (useAnniversaryRules && wolkeFlags[i]) {
        // Wolke aktiviert → Schätzung wird angepasst
        const prediction = players[i].predictions[currentRound - 1];
        if (Math.abs(prediction - val) === 1) {
          actualResult = prediction; // Korrigiert → zählt als richtig
        }
      }
      setResult(i, actualResult);
    });
    advanceRound()
    close()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-96">
        <h2 className="text-lg font-bold mb-2">Spiele Runde {currentRound}</h2>
        {players.map((p, i) => (
          <div key={i} className="flex justify-between mb-2">
            <span>{p.name} ({p.predictions[currentRound - 1]})</span>
            <input
              type="number"
              value={results[i]}
              onChange={e => {
                const copy = [...results]
                copy[i] = parseInt(e.target.value)
                setResults(copy)
              }}
              className="border w-16 p-1"
            />
            {useAnniversaryRules && (
                <label className="text-xs ml-2">
                  <input
                      type="checkbox"
                      checked={wolkeFlags[i]}
                      onChange={(e) => {
                        const copy = [...wolkeFlags];
                        copy[i] = e.target.checked;
                        setWolkeFlags(copy);
                      }}
                  /> Wolke
                </label>
            )}
          </div>
        ))}
        <button onClick={submit} className="mt-2 bg-green-500 text-white px-4 py-2 rounded w-full">
          Runde beenden
        </button>
      </div>
    </div>
  )
}
