import { useGameStore } from '../store/gameStore';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';

export function PredictionOverlay({ close }: { close: () => void }) {
  const { t } = useTranslation();
  const { players, setPrediction, currentRound, getCurrentStartPlayerIndex, useNotEqual } =
    useGameStore();
  const [predictions, setPredictions] = useState<number[]>(Array(players.length).fill(0));
  const [error, setError] = useState<string>('');
  // raw i18n key of the current error, exposed via data-error-key for E2E
  const [errorKey, setErrorKey] = useState<string>('');

  const showError = (key: string, options?: Record<string, unknown>) => {
    setError(t(key, options));
    setErrorKey(key);
  };

  const startPlayerIndex = getCurrentStartPlayerIndex();

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
      showError('errors.predictionTooSmall', {
        playerNames: tooSmallInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
      });
      return;
    }

    const tooLargeInputPlayerIndex = predictions
      .map((val, i) => (val > currentRound ? i : -1))
      .filter((i) => i !== -1);

    if (tooLargeInputPlayerIndex.length > 0) {
      showError('errors.predictionTooLarge', {
        playerNames: tooLargeInputPlayerIndex.map((i) => rotatedPlayers[i].name).join(', '),
      });
      return;
    }

    // if NotEqual rule is enabled, ensure the sum of all predictions is NOT equal to the current round number
    if (useNotEqual) {
      const sum = predictions.reduce((a, b) => a + b, 0);
      if (sum === currentRound) {
        const lastPlayer = rotatedPlayers[rotatedPlayers.length - 1];
        showError('errors.predictionNotEqualLast', {
          playerName: lastPlayer?.name ?? '',
          round: currentRound,
        });
        return;
      }
    }

    predictions.forEach((val, i) => {
      const originalIndex = (i + startPlayerIndex) % players.length;
      setPrediction(originalIndex, val);
    });
    close();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex xs:items-[normal] items-center justify-center z-20"
      data-testid={T.prediction.overlay}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="bg-white p-4 rounded shadow w-96"
      >
        <h2 className="text-lg font-bold mb-2">
          {t('predictionOverlay.title', { round: currentRound })}
        </h2>
        {rotatedPlayers.map((p, i) => (
          <div
            key={p.name}
            data-testid={T.prediction.playerRow(i)}
            data-start-player={i === 0 ? 'true' : 'false'}
            className="flex flex-col xs:flex-row justify-between mb-2"
          >
            <div>
              <span>{p.name}</span>
              {p.points.at(-1) != null && (
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
              data-testid={T.prediction.input(i)}
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
        {error && (
          <div
            className="bg-red-100 text-red-700 p-2 mb-2 rounded"
            data-testid={T.prediction.error}
            data-error-key={errorKey}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          data-testid={T.prediction.submit}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          {t('predictionOverlay.startRound')}
        </button>
      </form>
    </div>
  );
}
