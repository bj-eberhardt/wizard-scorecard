import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';

export function WinnerView() {
  const { t } = useTranslation();
  const { players, totalRounds } = useGameStore();

  const maxReachedPoints = Math.max(...players.map((p) => p.points[totalRounds - 1] ?? 0));

  const winners = players.filter((p) => (p.points[totalRounds - 1] ?? 0) === maxReachedPoints);

  const getWinnerText = () => {
    if (winners.length === 1) {
      return t('winnerView.announcement_single', {
        name: winners[0].name,
        points: maxReachedPoints,
      });
    } else if (winners.length === 2) {
      return t('winnerView.announcement_two', {
        name1: winners[0].name,
        name2: winners[1].name,
        points: maxReachedPoints,
      });
    } else {
      const allButLast = winners
        .slice(0, -1)
        .map((w) => w.name)
        .join(', ');
      return t('winnerView.announcement_multiple', {
        names: allButLast,
        lastName: winners[winners.length - 1].name,
        points: maxReachedPoints,
      });
    }
  };

  return (
    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h2 className="text-xl font-bold">{getWinnerText()}</h2>
    </div>
  );
}
