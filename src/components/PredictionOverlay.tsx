import { useGameStore } from '../store/gameStore';
import { useState } from 'react';

export function PredictionOverlay({ close }: { close: () => void }) {
  const { players, setPrediction, currentRound } = useGameStore();
  const [predictions, setPredictions] = useState<number[]>(Array(players.length).fill(0));
  const [error, setError] = useState<string>('');

  const submit = () => {
    const tooSmallInputPlayerIndex = predictions
      .map((val, i) => (val < 0 ? i : -1))
      .filter((i) => i !== -1);

    if (tooSmallInputPlayerIndex.length > 0) {
      setError(
        `Zu kleine Schätzung für Spieler ${tooSmallInputPlayerIndex.map((i) => players[i].name).join(', ')}`
      );
      return;
    }

    const tooLargeInputPlayerIndex = predictions
      .map((val, i) => (val > currentRound ? i : -1))
      .filter((i) => i !== -1);

    if (tooLargeInputPlayerIndex.length > 0) {
      setError(
        `Zu große Schätzung für Spieler ${tooLargeInputPlayerIndex.map((i) => players[i].name).join(', ')}`
      );
      return;
    }

    predictions.forEach((val, i) => setPrediction(i, val));
    close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20">
      <div className="bg-white p-4 rounded shadow w-96">
        <h2 className="text-lg font-bold mb-2">Stiche schätzen für Runde {currentRound}</h2>
        {players.map((p, i) => (
          <div key={i} className="flex flex-col xs:flex-row justify-between mb-2">
            <div>
              <span>{p.name}</span>
              {p.points.at(-1) && <span className="italic">&nbsp;({p.points.at(-1)} Punkte)</span>}
            </div>
            <input
              type="number"
              min={0}
              max={currentRound}
              value={predictions[i]}
              onChange={(e) => {
                const copy = [...predictions];
                copy[i] = parseInt(e.target.value);
                setPredictions(copy);
              }}
              className="border w-16 p-1"
            />
          </div>
        ))}
        {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
        <button onClick={submit} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded w-full">
          Runde starten
        </button>
      </div>
    </div>
  );
}
