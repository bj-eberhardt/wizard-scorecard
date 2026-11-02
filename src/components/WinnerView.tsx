import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { rankPlayers, buildTextSummary, sanitizeNameForFile } from '../store/stats';
import { renderResultImage, downloadBlob } from './resultImage';
import useSettingsStore from '../store/settingsStore';
import { T } from '../test-ids';

export function WinnerView() {
  const { t } = useTranslation();
  const { players, totalRounds, useAnniversaryRules, useNotEqual, rematch, resetGame } =
    useGameStore();
  const setPlayerNames = useSettingsStore((s) => s.setPlayerNames);

  // --- Ranking (pure, stable) ---
  const ranked = useMemo(() => rankPlayers(players, totalRounds), [players, totalRounds]);
  const maxReachedPoints = ranked.length > 0 ? ranked[0].finalPoints : 0;
  const winners = players.filter((p) => (p.points[totalRounds - 1] ?? 0) === maxReachedPoints);

  // --- Confetti: render once, respect reduced motion ---
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true
  );

  // --- Stats panel ---
  const [statsOpen, setStatsOpen] = useState(false);

  // --- Export state ---
  const [exportState, setExportState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // --- Handlers ---
  const handleRematch = () => {
    // Rotate settings names same direction as game roster
    const names = players.map((p) => p.name);
    const rotatedNames = [names[names.length - 1], ...names.slice(0, -1)];
    setPlayerNames(rotatedNames);
    rematch();
  };

  const handleSaveImage = async () => {
    try {
      const blob = await renderResultImage(ranked, {
        dateStr,
        totalRounds,
        playerCount: players.length,
        useWolke: useAnniversaryRules,
        useNotEqual,
      });
      const winnerPart =
        winners.length > 1 ? 'geteilt' : sanitizeNameForFile(winners[0]?.name ?? 'wizard');
      const filename = `wizard-${dateStr}-${winnerPart}.png`;
      downloadBlob(blob, filename);
      setExportState('ready');
    } catch {
      setExportState('error');
    }
  };

  const handleCopyText = async () => {
    try {
      const summary = buildTextSummary(ranked, dateStr);
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      // clipboard permission denied — no crash
    }
  };

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
      {/* Confetti container — mounted once, pointer-events-none */}
      {!reducedMotion && (
        <div
          data-testid={T.winner.confetti}
          data-reduced-motion="false"
          className="confetti-container"
          aria-hidden="true"
        />
      )}
      {reducedMotion && (
        <div
          data-testid={T.winner.confetti}
          data-reduced-motion="true"
          className="hidden"
          aria-hidden="true"
        />
      )}

      <div
        className="mx-auto mt-4 max-w-md p-4 bg-gray-50 border border-gray-200 rounded-lg text-center"
        data-testid={T.winner.container}
        data-winner-count={winners.length}
        data-points={maxReachedPoints}
        data-winner-names={winners.map((w) => w.name).join('|')}
      >
        {/* Heading */}
        <h2 className="text-xl font-bold text-yellow-700 mb-4">{announcementText}</h2>

        {/* Column header — explains the 🎯 column once instead of repeating a label per row (C) */}
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
                    rp.stats.hitRate !== null ? `${rp.stats.hitRate}%` : '–'
                  }`}
                >
                  <Target size={11} aria-hidden className="shrink-0" />
                  {rp.stats.hitRate !== null ? `${rp.stats.hitRate}%` : '–'}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {/* Expandable stats panel with CSS grid-row transition */}
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

        {/* Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleRematch}
            data-testid={T.winner.rematch}
            className="w-full min-h-11 cursor-pointer rounded bg-green-500 px-5 py-2 text-white font-semibold hover:bg-green-600"
          >
            {t('buttons.rematch')}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSaveImage}
              data-testid={T.winner.saveImage}
              data-export-state={exportState}
              className="min-h-11 cursor-pointer rounded border-2 border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('buttons.saveImage')}
            </button>
            <button
              type="button"
              onClick={handleCopyText}
              data-testid={T.winner.copyText}
              data-copied={copied}
              className="min-h-11 cursor-pointer rounded border-2 border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('buttons.copyText')}
            </button>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={resetGame}
              data-testid={T.winner.newGame}
              className="min-h-11 cursor-pointer px-3 py-2 text-sm text-gray-500 underline-offset-4 hover:text-red-600 hover:underline"
            >
              {t('buttons.newGame')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
