import { useGameStore } from './store/gameStore'
import { useState } from 'react'
import { Scoreboard } from './components/Scoreboard'
import { PredictionOverlay } from './components/PredictionOverlay'
import { ResultOverlay } from './components/ResultOverlay'
import { WinnerView } from './components/WinnerView'

export default function App() {
  const { players, setPlayerNames, gameStarted, currentRound, totalRounds } = useGameStore()
  const [overlay, setOverlay] = useState<'prediction' | 'result' | 'none'>('none')

  const [namesInput, setNamesInput] = useState(['', '', '', '', '', ''])
    const { setUseAnniversaryRules } = useGameStore();
    const [useWolke, setUseWolke] = useState(false);

  const handleStart = () => {
    const names = namesInput.filter(n => n.trim() !== '')
    if (names.length >= 3 && names.length <= 6) {
      setPlayerNames(names)
      setOverlay('prediction')
    }
  }

  if (!gameStarted) {
    return (
      <div className="p-4 space-y-2">
        <h1 className="text-xl font-bold">Wizard Punkteblock</h1>
        {namesInput.map((name, i) => (
          <input
            key={i}
            type="text"
            value={name}
            placeholder={`Spieler ${i + 1}`}
            onChange={e => {
              const copy = [...namesInput]
              copy[i] = e.target.value
              setNamesInput(copy)
            }}
            className="border p-1 w-full"
          />
        ))}
          <label className="flex items-center gap-2">
              <input
                  type="checkbox"
                  checked={useWolke}
                  onChange={(e) => {
                      setUseWolke(e.target.checked)
                      setUseAnniversaryRules(e.target.checked)
                  }}
              />
              Wizard Jubiläumsversion (mit Wolke)
          </label>
        <button onClick={handleStart} className="bg-blue-500 text-white px-4 py-2 rounded">
          Spiel starten
        </button>
      </div>
    )
  }

  const isGameOver = currentRound > totalRounds

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Wizard Punkteblock</h1>
      <Scoreboard />
      {!isGameOver && overlay === 'none' && (
        <button onClick={() => setOverlay('prediction')} className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
          Nächste Runde starten
        </button>
      )}
      {overlay === 'prediction' && <PredictionOverlay close={() => setOverlay('result')} />}
      {overlay === 'result' && <ResultOverlay close={() => setOverlay('none')} />}
      {isGameOver && <WinnerView />}
    </div>
  )
}
