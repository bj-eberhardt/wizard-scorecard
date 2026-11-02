import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RankedPlayer } from '../store/stats';
import { buildTextSummary, sanitizeNameForFile } from '../store/stats';
import { renderResultImage, downloadBlob } from './resultImage';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../store/gameStore';
import useSettingsStore from '../store/settingsStore';
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
  const { t } = useTranslation();
  const { players, totalRounds, useAnniversaryRules, useNotEqual, rematch, resetGame } =
    useGameStore();
  const setPlayerNames = useSettingsStore((s) => s.setPlayerNames);

  const [exportState, setExportState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

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
      const summary = buildTextSummary(ranked, dateStr);
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
  );
}
