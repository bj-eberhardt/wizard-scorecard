import { useGameStore } from './store/gameStore';
import { useState, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Scoreboard } from './components/Scoreboard';
import { PredictionOverlay } from './components/PredictionOverlay';
import { ResultOverlay } from './components/ResultOverlay';
import { WinnerView } from './components/WinnerView';
import ConfigureGame from './components/ConfigureGame';
import Header from './components/Header';
import Footer from './components/Footer';
import FullscreenButton from './components/FullscreenButton';
import { LoadingScreen } from './components/LoadingScreen';
import { useDialogA11y } from './hooks/useDialogA11y';
import { RotateCcw } from 'lucide-react';
import { T } from './test-ids';

/** Visible keyboard focus ring; Tailwind's default outline is too subtle on white. */
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export default function App() {
  const { t } = useTranslation();
  const {
    setPlayerNames,
    setTotalRounds,
    gameStarted,
    currentRound,
    totalRounds,
    overlay,
    setOverlay,
    setUseAnniversaryRules,
    setUseNotEqual,
    resetGame,
  } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmTitleId = useId();
  const confirmRef = useRef<HTMLDivElement>(null);
  useDialogA11y({
    open: showConfirm,
    containerRef: confirmRef,
    onClose: () => setShowConfirm(false),
  });

  const handleStart = (
    names: string[],
    useWolke: boolean,
    useNotEqualFlag: boolean,
    rounds?: number
  ) => {
    setPlayerNames(names);
    if (typeof rounds === 'number' && rounds > 0) {
      setTotalRounds(rounds);
    }
    setUseAnniversaryRules(useWolke);
    setUseNotEqual(useNotEqualFlag);
    setOverlay('prediction');
  };

  const isGameOver = currentRound > totalRounds;

  const handleNewGame = () => {
    setShowConfirm(false);
    resetGame();
  };

  useEffect(() => {
    // Optional: Listen for fullscreen changes if needed
  }, []);

  let wakeLock: WakeLockSentinel | null = null;

  async function activateWakeLock() {
    try {
      // eslint-disable-next-line
      wakeLock = await (navigator as any).wakeLock.request('screen');
    } catch {
      // ignore
    }
  }

  document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
      await activateWakeLock();
    }
  });

  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches && 'wakeLock' in navigator) {
      activateWakeLock().then();
    }
  }, []);

  if (!gameStarted) {
    return (
      <>
        <LoadingScreen />
        <div className="p-4 space-y-2 relative min-h-screen md:pb-28">
          <FullscreenButton />
          <Header />
          <ConfigureGame onStart={handleStart} />
          <Footer />
        </div>
      </>
    );
  }

  return (
    <div className="relative min-h-screen p-4 md:pb-28">
      <FullscreenButton />
      <Header />
      {!isGameOver && (
        <div className="flex justify-center -mt-2 mb-1">
          <button
            onClick={() => setShowConfirm(true)}
            data-testid={T.app.newGame}
            className={`cursor-pointer inline-flex min-h-11 items-center gap-1.5 rounded px-2 text-sm text-gray-500 underline-offset-4 hover:text-red-600 hover:underline ${focusRing}`}
          >
            <RotateCcw size={14} aria-hidden />
            {t('buttons.newGame')}
          </button>
        </div>
      )}
      <Scoreboard />
      {!isGameOver && overlay === 'none' && (
        <div className="mt-4 flex justify-center sticky bottom-2 md:bottom-24 z-[200]">
          <button
            onClick={() => setOverlay('prediction')}
            data-testid={T.app.nextRound}
            className="bg-green-500 text-white px-5 py-2 rounded min-h-11 shadow-lg cursor-pointer"
          >
            {t('buttons.startNextRound')}
          </button>
        </div>
      )}

      {showConfirm && (
        <div
          ref={confirmRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={confirmTitleId}
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          data-testid={T.app.confirmDialog}
        >
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <p id={confirmTitleId}>{t('confirmDialog.title')}</p>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={handleNewGame}
                data-testid={T.app.confirmYes}
                className={`cursor-pointer rounded border-2 border-red-600 px-4 py-2 text-red-600 min-h-11 hover:bg-red-50 ${focusRing}`}
              >
                {t('confirmDialog.yes')}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                data-testid={T.app.confirmCancel}
                data-autofocus
                className={`cursor-pointer rounded bg-gray-300 px-4 py-2 min-h-11 hover:bg-gray-200 ${focusRing}`}
              >
                {t('confirmDialog.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      {overlay === 'prediction' && <PredictionOverlay close={() => setOverlay('result')} />}
      {overlay === 'result' && <ResultOverlay close={() => setOverlay('none')} />}
      {isGameOver && <WinnerView />}
      {isGameOver && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => handleNewGame()}
            data-testid={T.app.newGame}
            className="bg-green-500 text-white px-5 py-2 rounded min-h-11 cursor-pointer hover:bg-green-600"
          >
            {t('buttons.newGame')}
          </button>
        </div>
      )}
      <Footer />
    </div>
  );
}
