import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';

export function WinnerView() {
  const { t } = useTranslation();
  const { players, totalRounds } = useGameStore();

  // Finde den höchsten Punktestand
  const maxPoints = Math.max(...players.map(p => p.points[totalRounds - 1] ?? 0));

  // Finde alle Spieler mit diesem Punktestand
  const winners = players.filter(p => (p.points[totalRounds - 1] ?? 0) === maxPoints);

  const getWinnerText = () => {
    if (winners.length === 1) {
      return t('winnerView.announcement_single', {
        name: winners[0].name,
        points: maxPoints
      });
    } else if (winners.length === 2) {
      return t('winnerView.announcement_two', {
        name1: winners[0].name,
        name2: winners[1].name,
        points: maxPoints
      });
    } else {
      const allButLast = winners.slice(0, -1).map(w => w.name).join(', ');
      return t('winnerView.announcement_multiple', {
        names: allButLast,
        lastName: winners[winners.length - 1].name,
        points: maxPoints
      });
    }
  };

  return (
    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h2 className="text-xl font-bold">{getWinnerText()}</h2>
    </div>
  );
}
