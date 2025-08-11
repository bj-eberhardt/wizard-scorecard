import { useGameStore } from './store/gameStore';
import { useState } from 'react';
import { Scoreboard } from './components/Scoreboard';
import { PredictionOverlay } from './components/PredictionOverlay';
import { ResultOverlay } from './components/ResultOverlay';
import { WinnerView } from './components/WinnerView';
import ConfigureGame from './components/ConfigureGame';
import Header from './components/Header';
import Footer from './components/Footer';

export default function App() {
  const {
    setPlayerNames,
    gameStarted,
    currentRound,
    totalRounds,
    overlay,
    setOverlay,
    setUseAnniversaryRules,
    resetGame,
  } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleStart = (names: string[], useWolke: boolean) => {
    setPlayerNames(names);
    setUseAnniversaryRules(useWolke);
    setOverlay('prediction');
  };

  const isGameOver = currentRound > totalRounds;

  const handleNewGame = () => {
    setShowConfirm(false);
    resetGame();
  };

  if (!gameStarted) {
    return (
      <div className="p-4 space-y-2">
        <Header />
        <ConfigureGame onStart={handleStart} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Header />
      <Scoreboard />
      {!isGameOver && overlay === 'none' && (
        <button
          onClick={() => setOverlay('prediction')}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
        >
          Nächste Runde starten
        </button>
      )}
      {/* Button für neues Spiel, nur wenn Spiel läuft */}
      {!isGameOver && (
        <div className="mt-2">
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Neues Spiel starten
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <p>Möchtest du das aktuelle Spiel wirklich beenden?</p>
            <div className="mt-4 flex justify-center gap-4">
              <button onClick={handleNewGame} className="bg-red-600 text-white px-4 py-2 rounded">
                Ja, beenden
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Abbrechen
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
            Neues Spiel starten
          </button>
        </div>
      )}
      <Footer />
    </div>
  );
}
