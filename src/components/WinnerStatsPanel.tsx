import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RankedPlayer } from '../store/stats';
import { T } from '../test-ids';

interface WinnerStatsPanelProps {
  /** Players in ranking order (same order as the ranking list rows). */
  ranked: RankedPlayer[];
}

/**
 * Expandable per-player statistics below the ranking list (F25).
 * The toggle + panel animate open/closed via the CSS `grid-template-rows`
 * transition (`.stats-panel` in index.css); rows stay mounted so the
 * `data-*` attributes are always available. State values are exposed as
 * attributes — the visible text is fully localized (de/en).
 */
export default function WinnerStatsPanel({ ranked }: WinnerStatsPanelProps) {
  const { t } = useTranslation();
  const [statsOpen, setStatsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setStatsOpen((v) => !v)}
        data-testid={T.winner.statsToggle}
        data-stats-open={statsOpen}
        aria-expanded={statsOpen}
        className="mx-auto mb-3 flex cursor-pointer items-center gap-1 rounded px-3 py-2 min-h-11 text-sm text-gray-600 hover:bg-gray-100"
      >
        {statsOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        {statsOpen ? t('winnerView.statsHide') : t('winnerView.statsToggle')}
      </button>

      <div
        className={`stats-panel ${statsOpen ? 'stats-panel--open' : ''}`}
        aria-hidden={!statsOpen}
      >
        <div className="overflow-hidden">
          <div className="mb-4 text-left space-y-1 text-xs text-gray-600 border-t border-gray-100 pt-2">
            {ranked.map((rp, idx) => (
              <div
                key={rp.player.name}
                data-testid={T.winner.statRow(idx)}
                data-hit-correct={rp.stats.hitCorrect}
                data-hit-total={rp.stats.hitTotal}
                data-best-round={rp.stats.bestRoundDelta}
                data-worst-round={rp.stats.worstRoundDelta}
                data-wolke-count={rp.stats.wolkeCount}
                data-wolke-success={rp.stats.wolkeSuccess}
                data-gap={rp.rank === 1 ? '' : rp.gapToLeader}
                className="flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded bg-gray-50 px-2 py-1"
              >
                <span className="font-semibold text-gray-800">{rp.player.name}</span>
                <span className="text-gray-400">·</span>
                <span>
                  {t('winnerView.statHitCorrect', {
                    correct: rp.stats.hitCorrect,
                    total: rp.stats.hitTotal,
                  })}
                </span>
                <span className="text-gray-400">·</span>
                <span>{t('winnerView.statBestRound', { delta: rp.stats.bestRoundDelta })}</span>
                <span className="text-gray-400">·</span>
                <span>{t('winnerView.statWorstRound', { delta: rp.stats.worstRoundDelta })}</span>
                {rp.rank !== 1 && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span>{t('winnerView.statGap', { gap: rp.gapToLeader })}</span>
                  </>
                )}
                {rp.stats.wolkeCount > 0 && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span data-wolke-branch={rp.stats.wolkeSuccess > 0 ? 'saved' : 'no-effect'}>
                      {rp.stats.wolkeSuccess > 0
                        ? t('winnerView.statWolkeSaved', { count: rp.stats.wolkeSuccess })
                        : t('winnerView.statWolkeNoEffect', { count: rp.stats.wolkeCount })}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
