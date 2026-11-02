import { useGameStore } from '../store/gameStore';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';

export function PredictionOverlay({ close }: { close: () => void }) {
  const { t } = useTranslation();
  const {
    players,
    setPrediction,
    currentRound,
    getCurrentStartPlayerIndex,
    getCurrentDealerIndex,
    useNotEqual,
  } = useGameStore();
  const [predictions, setPredictions] = useState<number[]>(Array(players.length).fill(0));
  const [error, setError] = useState<string>('');
  // raw i18n key of the current error, exposed via data-error-key for E2E
  const [errorKey, setErrorKey] = useState<string>('');

  const showError = (key: string, options?: Record<string, unknown>) => {
    setError(t(key, options));
    setErrorKey(key);
  };

  const startPlayerIndex = getCurrentStartPlayerIndex();
  // seat to the left of the start player: shuffles and deals this round
  const dealerIndex = getCurrentDealerIndex();

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
      className="fixed inset-0 bg-black/60 flex xs:items-[normal] items-center justify-center overflow-y-auto z-20 px-4 py-6 md:pb-28"
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
        {/* ONE running sentence naming both roles (who shuffles/deals, who opens the round).
            Two separate keys — not one combined string — so each language keeps its own word
            order; they are joined here with a middot, which is punctuation and therefore not a
            localized string (AGENTS.md §7). Each part keeps its own test id and carries the
            ORIGINAL roster index (not the visible row) plus the cards-per-player number as
            `data-*`, so the E2E suite can assert the roles without reading the text.
            Cards per player = round number, the Wizard dealing rule. */}
        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-2 leading-snug">
          <span
            data-testid={T.prediction.dealerInfo}
            data-dealer-index={dealerIndex}
            data-cards={currentRound}
          >
            {t('predictionOverlay.dealerInfo', {
              name: players[dealerIndex]?.name ?? '',
              cards: currentRound,
              // drives i18next's `_one`/`_other` lookup: round 1 reads "1 Karte", not "1 Karten"
              count: currentRound,
            })}
          </span>
          <span aria-hidden="true"> · </span>
          <span data-testid={T.prediction.startPlayerInfo} data-start-index={startPlayerIndex}>
            {t('predictionOverlay.startPlayerInfo', {
              name: players[startPlayerIndex]?.name ?? '',
            })}
          </span>
        </div>
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
            {/* No `max` attribute: the browser would block submission with a native,
                unlocalized bubble before our app validation can run. Range checks are
                owned by `predictionTooSmall` / `predictionTooLarge` below. */}
            <input
              autoFocus={i === 0}
              type="number"
              min={0}
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
