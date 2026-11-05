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
    correctLastRound,
    introTransition,
  } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);
  // Compact view: the default follows the viewport once at mount (narrow screen =
  // compact); the user can then override it with the toggle. No resize listener on purpose —
  // rotating the phone must not silently discard a manual choice.
  const [compact, setCompact] = useState<boolean>(
    () => window.matchMedia('(max-width: 768px)').matches
  );
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

  // The wake-lock sentinel must survive renders, so it lives in a ref, not a
  // render-local variable. The whole effect (request + visibilitychange listener)
  // runs only while a game is in progress: it re-runs when the game starts or ends,
  // and its cleanup releases the lock and removes the listener. Registering the
  // listener in the render body would attach a new closure on every render.
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!gameStarted || isGameOver) return;

    async function requestWakeLock() {
      try {
        // eslint-disable-next-line
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch {
        // ignore (denied or unsupported)
      }
    }

    // Feature detection stays runtime-guarded; desktop deliberately never locks.
    if (window.matchMedia('(max-width: 768px)').matches && 'wakeLock' in navigator) {
      void requestWakeLock();
    }

    // The browser releases the sentinel when the tab is hidden; reactivate on return
    // only if a lock had been held (ref non-null), never after the game ended.
    const onVisibility = async () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current !== null) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      const lock = wakeLockRef.current;
      // Null the ref before releasing so a late 'release' event of the old sentinel
      // can never overwrite a value acquired by a subsequent effect run.
      wakeLockRef.current = null;
      // Already released (tab hidden) → the promise rejects; that is expected.
      void lock?.release().catch(() => {});
    };
  }, [gameStarted, isGameOver]);

  if (!gameStarted) {
    return (
      <>
        <LoadingScreen />
        <div className="p-4 space-y-2 relative min-h-screen">
          <FullscreenButton />
          <Header />
          <ConfigureGame onStart={handleStart} />
          <Footer />
        </div>
      </>
    );
  }

  return (
    <div className="relative min-h-screen p-4">
      <FullscreenButton />
      <Header />
      {!isGameOver && (
        <div className="flex justify-center -mt-2 mb-1">
          <button
            onClick={() => setShowConfirm(true)}
            data-testid={T.app.newGame}
            className="btn-ghost inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:text-danger hover:underline"
          >
            <RotateCcw size={14} aria-hidden />
            {t('buttons.newGame')}
          </button>
        </div>
      )}
      <Scoreboard compact={compact && !isGameOver} />
      {!isGameOver && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setCompact((v) => !v)}
            data-compact={compact ? 'true' : 'false'}
            data-testid={T.scoreboard.compactToggle}
            className="btn-ghost inline-flex items-center text-sm underline-offset-4 hover:text-ink hover:underline"
          >
            {compact ? t('scoreboard.full') : t('scoreboard.compact')}
          </button>
        </div>
      )}
      {!isGameOver && overlay === 'none' && (
        <>
          <div className="mt-4 flex justify-center sticky bottom-2 z-[200]">
            <button
              onClick={() => setOverlay('prediction')}
              data-testid={T.app.nextRound}
              className="btn-primary px-5 shadow-lg"
            >
              {t('buttons.startNextRound')}
            </button>
          </div>
          {currentRound > 1 && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={correctLastRound}
                data-testid={T.app.correctLastRound}
                className="btn-ghost inline-flex items-center px-2 text-xs text-ink-soft"
              >
                {t('buttons.correctLastRound')}
              </button>
            </div>
          )}
        </>
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
          <div className="bg-panel p-6 rounded-lg border border-line shadow-lg text-center">
            <p id={confirmTitleId}>{t('confirmDialog.title')}</p>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={handleNewGame}
                data-testid={T.app.confirmYes}
                className="btn-destructive"
              >
                {t('confirmDialog.yes')}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                data-testid={T.app.confirmCancel}
                data-autofocus
                className="btn-primary"
              >
                {t('confirmDialog.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      {overlay === 'prediction' && (
        <PredictionOverlay
          skipIntroAnimation={introTransition?.target === 'prediction'}
          close={() => {
            setOverlay('result');
          }}
        />
      )}
      {overlay === 'result' && (
        <ResultOverlay
          skipIntroAnimation={introTransition?.target === 'result'}
          close={() => {
            setOverlay('none');
          }}
        />
      )}
      {isGameOver && <WinnerView />}
      <Footer />
    </div>
  );
}
