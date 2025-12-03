import { useGameStore } from '../store/gameStore';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function PredictionOverlay({ close }: { close: () => void }) {
  const { t } = useTranslation();
  const { players, setPrediction, currentRound, getCurrentStartPlayerIndex } = useGameStore();
  const [predictions, setPredictions] = useState<number[]>(Array(players.length).fill(0));
  const [error, setError] = useState<string>('');

  const startPlayerIndex = getCurrentStartPlayerIndex();

  // Lade bereits gespeicherte Vorhersagen für die aktuelle Runde aus dem Store
  // und ordne sie in der Reihenfolge der rotierten Spieler (startPlayerIndex)
  useEffect(() => {
    const r = currentRound - 1;
    const rotated = [...players.slice(startPlayerIndex), ...players.slice(0, startPlayerIndex)];
    const existing = rotated.map((p) => p.predictions?.[r] ?? 0);
    setPredictions(existing);
  }, [players, currentRound, startPlayerIndex]);

  const rotatedPlayers = [
    ...players.slice(startPlayerIndex),
    ...players.slice(0, startPlayerIndex),
  ];

  const submit = () => {
    const tooSmallInputPlayerIndex = predictions
      .map((val, i) => (val < 0 ? i : -1))
      .filter((i) => i !== -1);

    if (tooSmallInputPlayerIndex.length > 0) {
      setError(
        t('errors.predictionTooSmall', {
          playerNames: tooSmallInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
        })
      );
      return;
    }

    const tooLargeInputPlayerIndex = predictions
      .map((val, i) => (val > currentRound ? i : -1))
      .filter((i) => i !== -1);

    if (tooLargeInputPlayerIndex.length > 0) {
      setError(
        t('errors.predictionTooLarge', {
          playerNames: tooLargeInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
        })
      );
      return;
    }

    predictions.forEach((val, i) => {
      const originalIndex = (i + startPlayerIndex) % players.length;
      setPrediction(originalIndex, val);
    });
    close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex xs:items-[normal] items-center justify-center z-20">
      <form className="bg-white p-4 rounded shadow w-96">
        <h2 className="text-lg font-bold mb-2">
          {t('predictionOverlay.title', { round: currentRound })}
        </h2>
        {rotatedPlayers.map((p, i) => (
          <div key={p.name} className="flex flex-col xs:flex-row justify-between mb-2">
            <div>
              <span>{p.name}</span>
              {p.points.at(-1) && (
                <span className="italic">
                  &nbsp;({p.points.at(-1)} {t('labels.points')})
                </span>
              )}
            </div>
            <input
              autoFocus={i === 0}
              type="number"
              min={0}
              max={currentRound}
              value={predictions[i]}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const copy = [...predictions];
                copy[i] = parseInt(e.target.value) || 0;
                setPredictions(copy);
              }}
              className="border w-16 p-1"
            />
          </div>
        ))}
        {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
        <button
          type="submit"
          onClick={submit}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          {t('predictionOverlay.startRound')}
        </button>
      </form>
    </div>
  );
}
