import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Target } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { rankPlayers } from '../store/stats';
import { T } from '../test-ids';
import WinnerConfetti from './WinnerConfetti';
import WinnerStatsPanel from './WinnerStatsPanel';
import WinnerActions from './WinnerActions';

export function WinnerView() {
  const { t } = useTranslation();
  const { players, totalRounds } = useGameStore();

  // --- Ranking (pure, stable) ---
  const ranked = useMemo(() => rankPlayers(players, totalRounds), [players, totalRounds]);
  const maxReachedPoints = ranked.length > 0 ? ranked[0].finalPoints : 0;
  const winners = players.filter((p) => (p.points[totalRounds - 1] ?? 0) === maxReachedPoints);

  const announcementText = useMemo(() => {
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
  }, [winners, maxReachedPoints, t]);

  return (
    <>
      <WinnerConfetti />

      <div
        className="mx-auto mt-4 max-w-md p-4 bg-gray-50 border border-gray-200 rounded-lg text-center"
        data-testid={T.winner.container}
        data-winner-count={winners.length}
        data-points={maxReachedPoints}
        data-winner-names={winners.map((w) => w.name).join('|')}
      >
        {/* Heading */}
        <h2 className="text-xl font-bold text-yellow-700 mb-4">{announcementText}</h2>

        {/* Column header */}
        <div className="flex items-center justify-end gap-3 px-3 pb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
          <span className="mr-auto">{t('labels.player')}</span>
          <span className="w-10 text-right">{t('labels.points')}</span>
          <span
            className="flex w-10 items-center justify-end gap-0.5"
            title={t('winnerView.hitRateLabel')}
          >
            <Target size={11} aria-hidden />
            <span>{t('winnerView.hitRateColumn')}</span>
          </span>
        </div>

        {/* Ranking list */}
        <ol className="text-left space-y-2 mb-4">
          {ranked.map((rp, idx) => (
            <li
              key={rp.player.name}
              data-testid={T.winner.rankRow(idx)}
              data-rank={rp.rank}
              data-points={rp.finalPoints}
              data-tied={rp.tied}
              data-hit-rate={rp.stats.hitRate ?? ''}
              className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                rp.rank === 1
                  ? 'bg-yellow-50 border border-yellow-300 font-bold text-yellow-800'
                  : 'bg-white border border-gray-100 text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {rp.rank === 1 && (
                  <Trophy size={16} className="shrink-0 text-yellow-500" aria-hidden />
                )}
                <span className="w-6 shrink-0">{rp.rank}.</span>
                <span className="truncate">{rp.player.name}</span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="font-mono">{rp.finalPoints}</span>
                <span
                  className="flex w-10 items-center justify-end gap-0.5 text-xs text-gray-500"
                  data-hit-total={rp.stats.hitTotal}
                  title={t('winnerView.hitRateLabel')}
                  aria-label={`${t('winnerView.hitRateLabel')}: ${
                    rp.stats.hitRate !== null ? `${rp.stats.hitRate}%` : '\u2013'
                  }`}
                >
                  <Target size={11} aria-hidden className="shrink-0" />
                  {rp.stats.hitRate !== null ? `${rp.stats.hitRate}%` : '\u2013'}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {/* Expandable stats */}
        <WinnerStatsPanel ranked={ranked} />

        {/* Actions */}
        <WinnerActions ranked={ranked} winners={winners} />
      </div>
    </>
  );
}
