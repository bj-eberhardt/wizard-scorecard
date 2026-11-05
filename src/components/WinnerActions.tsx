import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RankedPlayer } from '../domain/ranking';
import { buildTextSummary, sanitizeNameForFile } from '../domain/ranking';
import { renderResultImage, downloadBlob } from './resultImage';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../domain/types';
import useSettingsStore from '../store/settingsStore';
import { appSettings } from '../settings';
import { T } from '../test-ids';

interface WinnerActionsProps {
  /** Players in ranking order (same as the ranking list). */
  ranked: RankedPlayer[];
  /** Players tied at the top (may be 1..N). */
  winners: Player[];
}

/**
 * Action buttons below the stats panel: Rematch, Save image, Copy text, New game.
 * Owns the export state and the rematch rotation logic.
 */
export default function WinnerActions({ ranked, winners }: WinnerActionsProps) {
  const { t, i18n } = useTranslation();
  const {
    players,
    totalRounds,
    useAnniversaryRules,
    useNotEqual,
    rematch,
    resetGame,
    correctLastRound,
  } = useGameStore();
  const setPlayerNames = useSettingsStore((s) => s.setPlayerNames);

  const [exportState, setExportState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const hideSaveImage = appSettings.hideWinningShareImage;

  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const displayDate = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === 'de' ? 'de-DE' : 'en-US', {
        dateStyle: 'medium',
      }).format(new Date()),
    [i18n.language]
  );

  const handleRematch = () => {
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
        winners.length > 1
          ? t('winnerView.fileTieSuffix')
          : sanitizeNameForFile(winners[0]?.name ?? 'wizard');
      const filename = `wizard-${dateStr}-${winnerPart}.png`;
      downloadBlob(blob, filename);
      setExportState('ready');
    } catch {
      setExportState('error');
    }
  };

  const handleCopyText = async () => {
    try {
      const summary = buildTextSummary(ranked, displayDate, t('winnerView.hitRateColumn'));
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      // clipboard permission denied — no crash
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleRematch}
        data-testid={T.winner.rematch}
        className="btn-primary w-full px-5"
      >
        {t('buttons.rematch')}
      </button>

      <div className={hideSaveImage ? '' : 'grid grid-cols-2 gap-2'}>
        {!hideSaveImage && (
          <button
            type="button"
            onClick={handleSaveImage}
            data-testid={T.winner.saveImage}
            data-export-state={exportState}
            className="btn-secondary px-3 text-sm"
          >
            {t('buttons.saveImage')}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopyText}
          data-testid={T.winner.copyText}
          data-copied={copied}
          className={`btn-secondary px-3 text-sm ${hideSaveImage ? 'w-full' : ''}`}
        >
          {t('buttons.copyText')}
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={correctLastRound}
          data-testid={T.winner.correctLastRound}
          className="btn-ghost inline-flex items-center px-2 text-xs text-ink-soft"
        >
          {t('buttons.correctLastRound')}
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={resetGame}
          data-testid={T.winner.newGame}
          className="btn-ghost px-3 text-sm underline-offset-4 hover:text-danger hover:underline"
        >
          {t('buttons.newGame')}
        </button>
      </div>
    </div>
  );
}
