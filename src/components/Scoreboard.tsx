import { useGameStore } from '../store/gameStore'

export function Scoreboard() {
  const { players, currentRound, totalRounds } = useGameStore()
  const rounds = Array.from({ length: totalRounds }, (_, i) => i)

  return (
    <table className="table-auto border border-black">
      <thead>
        <tr>
          <th>Runde</th>
          {players.map((p, i) => (
            <th key={i} className="px-2">{p.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rounds.map((_, roundIndex) => (
          <tr key={roundIndex}>
            <td className="border px-2">{roundIndex + 1}</td>
            {players.map((p, i) => (
              <td key={i} className="border px-2">
                <div className="text-sm">{p.predictions[roundIndex] ?? '-'}</div>
                <div className="text-xs font-bold">{p.points[roundIndex] ?? '-'}</div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
