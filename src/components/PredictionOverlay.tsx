import { useGameStore } from '../store/gameStore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';
import { NumberStepper } from './NumberStepper';
import { ValidationError } from './ValidationError';
import { IntroAnimation } from './IntroAnimation';
import predictionIntro from '../assets/prediction-intro.gif';

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
  const startPlayerIndex = getCurrentStartPlayerIndex();
  const [predictions, setPredictions] = useState<number[]>(() => {
    const roundIndex = currentRound - 1;
    const rotated = [...players.slice(startPlayerIndex), ...players.slice(0, startPlayerIndex)];
    return rotated.map((player) => player.predictions?.[roundIndex] ?? 0);
  });
  const [error, setError] = useState<string>('');
  // raw i18n key of the current error, exposed via data-error-key for E2E
  const [errorKey, setErrorKey] = useState<string>('');

  const showError = (key: string, options?: Record<string, unknown>) => {
    setError(t(key, options));
    setErrorKey(key);
  };

  // seat to the left of the start player: shuffles and deals this round
  const dealerIndex = getCurrentDealerIndex();

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
      className="fixed inset-0 bg-black/60 flex items-start md:items-center justify-center overflow-y-auto z-20 px-4 py-4 md:py-6"
      data-testid={T.prediction.overlay}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative bg-panel border border-line p-4 rounded-lg shadow-2xl w-96 max-w-full max-h-[calc(100dvh-2rem)] overflow-y-auto"
        data-testid={T.prediction.form}
      >
        <h2 className="text-lg font-bold mb-2" data-testid={T.prediction.title}>
          {t('predictionOverlay.title', { round: currentRound })}
        </h2>
        {/* ONE running sentence naming both roles (who shuffles/deals, who opens the round).
            Two separate keys — not one combined string — so each language keeps its own word
            order; they are joined here with a middot, which is punctuation and therefore not a
            localized string (AGENTS.md §7). Each part keeps its own test id and carries the
            ORIGINAL roster index (not the visible row) plus the cards-per-player number as
            `data-*`, so the E2E suite can assert the roles without reading the text.
            Cards per player = round number, the Wizard dealing rule. */}
        <div className="text-sm text-ink-soft bg-white/5 p-2 rounded mb-2 leading-snug">
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
        <IntroAnimation
          src={predictionIntro}
          testId={T.prediction.intro}
          imageTestId={T.prediction.introImage}
          overlayClassName="absolute inset-0 flex items-center justify-center bg-panel transition-opacity duration-500"
          durationMs={4000}
        >
          {rotatedPlayers.map((p, i) => (
            <div
              key={p.name}
              data-testid={T.prediction.playerRow(i)}
              data-start-player={i === 0 ? 'true' : 'false'}
              className="flex items-center justify-between gap-2 mb-2"
            >
              <div className="min-w-0 flex-1" data-testid={T.prediction.playerName(i)}>
                <span className="break-words">{p.name}</span>
                {p.points.at(-1) != null && (
                  <span className="italic">
                    &nbsp;({p.points.at(-1)} {t('labels.points')})
                  </span>
                )}
              </div>
              {/* No `max` attribute: the browser would block submission with a native,
                      unlocalized bubble before our app validation can run. Range checks are
                      owned by `predictionTooSmall` / `predictionTooLarge` below. */}
              <div className="hidden md:block">
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
                  className="border border-line bg-surface text-ink rounded p-1 w-16 text-right tabular-nums"
                />
              </div>
              <div className="md:hidden">
                <NumberStepper
                  value={predictions[i]}
                  min={0}
                  max={currentRound}
                  onChange={(value) => {
                    const copy = [...predictions];
                    copy[i] = value;
                    setPredictions(copy);
                  }}
                  decreaseLabel={t('numberStepper.decrease')}
                  increaseLabel={t('numberStepper.increase')}
                  testId={T.prediction.stepper(i)}
                />
              </div>
            </div>
          ))}
          {error && (
            <ValidationError message={error} errorKey={errorKey} testId={T.prediction.error} />
          )}
          <button
            type="submit"
            data-testid={T.prediction.submit}
            className="btn-primary mt-2 w-full"
          >
            {t('predictionOverlay.startRound')}
          </button>
        </IntroAnimation>
      </form>
    </div>
  );
}
