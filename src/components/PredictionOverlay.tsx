import { useGameStore } from '../store/gameStore'
import { useState } from 'react'

export function PredictionOverlay({ close }: { close: () => void }) {
  const { players, setPrediction } = useGameStore()
  const [predictions, setPredictions] = useState<number[]>(Array(players.length).fill(0))

  const submit = () => {
    predictions.forEach((val, i) => setPrediction(i, val))
    close()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-96">
        <h2 className="text-lg font-bold mb-2">Stiche schätzen</h2>
        {players.map((p, i) => (
          <div key={i} className="flex justify-between mb-2">
            <span>{p.name}</span>
            <input
              type="number"
              value={predictions[i]}
              onChange={e => {
                const copy = [...predictions]
                copy[i] = parseInt(e.target.value)
                setPredictions(copy)
              }}
              className="border w-16 p-1"
            />
          </div>
        ))}
        <button onClick={submit} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded w-full">
          Runde starten
        </button>
      </div>
    </div>
  )
}
