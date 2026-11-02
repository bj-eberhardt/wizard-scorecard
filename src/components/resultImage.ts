import type { RankedPlayer } from '../store/stats';
import i18n from '../i18n/i18n';

/**
 * F26: Render the result card to a Canvas and produce a PNG blob for download.
 * Owns no React state; receives already-computed ranked players.
 * Image size: logical 1080×1350 (4:5 portrait), rendered at scale 2 for crispness.
 * Column header + date label follow the current UI language: the header reuses
 * the winner-view labels (Spieler · Punkte · Quote / Player · Points · Rate),
 * and the date is formatted via `Intl.DateTimeFormat` on the i18next language.
 */

const W = 1080;
const H = 1350;
const SCALE = 2;

const COLORS = {
  bg: '#1a1a2e',
  card: '#16213e',
  gold: '#d4af37',
  text: '#f0f0f0',
  textMuted: '#a0a0a0',
  accent: '#0f3460',
  line: 'rgba(255,255,255,0.08)',
};

export interface ExportMeta {
  /** ISO `YYYY-MM-DD`, used only for the download filename. */
  dateStr: string;
  totalRounds: number;
  playerCount: number;
  useWolke: boolean;
  useNotEqual: boolean;
}

/**
 * Draw the result image onto an offscreen canvas and return a PNG Blob.
 * Rejects if the Canvas API is unavailable.
 */
export async function renderResultImage(ranked: RankedPlayer[], meta: ExportMeta): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Title area
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Wizard — Endstand', W / 2, 80);

  // Subtitle: date, rounds, players, rules
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '28px system-ui, sans-serif';
  const rulesParts: string[] = [];
  if (meta.useWolke) rulesParts.push('Wolke');
  if (meta.useNotEqual) rulesParts.push('NotEqual');
  const rulesSuffix = rulesParts.length > 0 ? ` · ${rulesParts.join(' · ')}` : '';
  // Render-visible date follows the current UI locale (browser/locale standard);
  // the ISO `dateStr` stays put for the download filename only.
  const displayDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date()
  );
  ctx.fillText(
    `${displayDate} · ${meta.totalRounds} Runden · ${meta.playerCount} Spieler${rulesSuffix}`,
    W / 2,
    130
  );

  // Divider line
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 160);
  ctx.lineTo(W - 60, 160);
  ctx.stroke();

  // Column header — makes the right-hand percentage self-explanatory
  // ("Quote"/"Rate"), mirroring the winner-view list header.
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(i18n.t('labels.player'), 70, 195);
  ctx.textAlign = 'right';
  ctx.fillText(i18n.t('labels.points'), W - 180, 195);
  ctx.fillText(i18n.t('winnerView.hitRateColumn'), W - 70, 195);

  // Ranking rows
  const rowStartY = 240;
  const rowHeight = 90;

  ranked.forEach((rp, i) => {
    const y = rowStartY + i * rowHeight;

    // Highlight winner row
    if (rp.rank === 1) {
      ctx.fillStyle = 'rgba(212,175,55,0.08)';
      ctx.fillRect(40, y - 10, W - 80, rowHeight - 10);
    }

    // Rank
    ctx.fillStyle = rp.rank === 1 ? COLORS.gold : COLORS.text;
    ctx.font = rp.rank === 1 ? 'bold 36px system-ui, sans-serif' : '36px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${rp.rank}.`, 70, y + 40);

    // Name
    ctx.fillStyle = rp.rank === 1 ? COLORS.gold : COLORS.text;
    ctx.font = rp.rank === 1 ? 'bold 34px system-ui, sans-serif' : '34px system-ui, sans-serif';
    ctx.fillText(rp.player.name, 140, y + 40);

    // Points (right-aligned)
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${rp.finalPoints}`, W - 180, y + 40);

    // Hit rate
    const rateStr = rp.stats.hitRate !== null ? `${rp.stats.hitRate}%` : '-';
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText(rateStr, W - 70, y + 40);

    // Row separator
    if (i < ranked.length - 1) {
      ctx.strokeStyle = COLORS.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, y + rowHeight - 15);
      ctx.lineTo(W - 60, y + rowHeight - 15);
      ctx.stroke();
    }
  });

  // Footer
  const footerY = H - 60;
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Wizard Punkteblock', W / 2, footerY);

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}

/** Trigger a browser download of the given blob with the provided filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
