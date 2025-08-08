import { useGameStore } from '../store/gameStore'

export function WinnerView() {
  const { players, totalRounds } = useGameStore()

  const winner = players.reduce((best, p) =>
    (p.points[totalRounds - 1] ?? 0) > (best.points[totalRounds - 1] ?? 0)
      ? p : best
  )

  return (
    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h2 className="text-xl font-bold">🎉 Gewinner: {winner.name} mit {winner.points[totalRounds - 1]} Punkten!</h2>
    </div>
  )
}
