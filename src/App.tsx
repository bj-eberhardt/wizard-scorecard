import { useGameStore } from './store/gameStore';
import { useState, useEffect } from 'react';
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
    <>
      <div className="relative min-h-screen p-4">
        <FullscreenButton />
        <Header />
        {!gameStarted ? (
          <div className="space-y-2">
            <ConfigureGame onStart={handleStart} />
            <Footer />
          </div>
        ) : (
          <>
            <Scoreboard />
            {!isGameOver && overlay === 'none' && (
              <button
                onClick={() => setOverlay('prediction')}
                className="mt-4 bg-green-500 text-white px-4 py-2 rounded sticky bottom-2 z-[200]"
              >
                {t('buttons.startNextRound')}
              </button>
            )}
            {/* Button für neues Spiel, nur wenn Spiel läuft */}
            {!isGameOver && (
              <div className="mt-2">
                <button
                  onClick={() => setShowConfirm(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  {t('buttons.newGame')}
                </button>
              </div>
            )}

            {/* Confirm Dialog */}
            {showConfirm && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white p-6 rounded shadow-lg text-center">
                  <p>{t('confirmDialog.title')}</p>
                  <div className="mt-4 flex justify-center gap-4">
                    <button
                      onClick={handleNewGame}
                      className="bg-red-600 text-white px-4 py-2 rounded"
                    >
                      {t('confirmDialog.yes')}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="bg-gray-300 px-4 py-2 rounded"
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
              <div className="mt-2">
                <button
                  onClick={() => handleNewGame()}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  {t('buttons.newGame')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
