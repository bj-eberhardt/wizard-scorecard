import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';

export function WinnerView() {
  const { t } = useTranslation();
  const { players, totalRounds } = useGameStore();

  const winner = players.reduce((best, p) =>
    (p.points[totalRounds - 1] ?? 0) > (best.points[totalRounds - 1] ?? 0) ? p : best
  );

  return (
    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h2 className="text-xl font-bold">
        {t('winnerView.announcement', {
          name: winner.name,
          points: winner.points[totalRounds - 1]
        })}
      </h2>
    </div>
  );
}
