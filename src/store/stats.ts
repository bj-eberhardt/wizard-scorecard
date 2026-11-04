import type { Player } from './gameStore';

/**
 * Pure statistics functions for a single finished game (F25).
 * Used by WinnerView, resultImage, and E2E test helpers.
 * No React dependency; no cross-game/persistence logic.
 */

export interface PlayerStats {
  hitCorrect: number;
  hitTotal: number;
  /** 0–100 integer, or null when hitTotal === 0 (NaN guard). */
  hitRate: number | null;
  /** Highest single-round point gain (positive delta). */
  bestRoundDelta: number;
  /** Lowest single-round point change (negative delta). */
  worstRoundDelta: number;
  /** Number of rounds this player used Wolke. */
  wolkeCount: number;
  /** Number of Wolke rounds where the effective result equals the prediction (Wolke "worked"). */
  wolkeSuccess: number;
}

export interface RankedPlayer {
  player: Player;
  rank: number;
  finalPoints: number;
  /** True when at least one other player shares the same final points. */
  tied: boolean;
  stats: PlayerStats;
  /** Gap to rank-1 leader (0 for the leader itself). */
  gapToLeader: number;
}

/** Compute per-player statistics from the round arrays. */
export function computePlayerStats(player: Player): PlayerStats {
  const { predictions, results, points, wolkeUsed } = player;

  // Nenner = Anzahl der Runden mit Punkten (points.length)
  const hitTotal = points.length;

  let hitCorrect = 0;
  let bestRoundDelta = 0;
  let worstRoundDelta = 0;
  let wolkeCount = 0;
  let wolkeSuccess = 0;

  for (let r = 0; r < hitTotal; r++) {
    const pred = predictions[r] ?? 0;
    const result = results[r] ?? 0;
    if (pred === result) hitCorrect++;

    const delta = r === 0 ? points[r] : points[r] - points[r - 1];
    if (delta > bestRoundDelta) bestRoundDelta = delta;
    if (delta < worstRoundDelta) worstRoundDelta = delta;
  }

  if (wolkeUsed) {
    for (let r = 0; r < wolkeUsed.length; r++) {
      if (wolkeUsed[r]) {
        wolkeCount++;
        // Wolke "worked" when the effective result equals the prediction
        if ((predictions[r] ?? 0) === (results[r] ?? 0)) wolkeSuccess++;
      }
    }
  }

  const hitRate = hitTotal > 0 ? Math.round((hitCorrect / hitTotal) * 100) : null;

  return {
    hitCorrect,
    hitTotal,
    hitRate,
    bestRoundDelta,
    worstRoundDelta,
    wolkeCount,
    wolkeSuccess,
  };
}

/**
 * Rank all players by final points (descending).
 * Competition ranking: equal points share a rank, next rank skips.
 * Tie-break order: roster index (stable, first-occurrence wins for tie display).
 */
export function rankPlayers(players: Player[], totalRounds: number): RankedPlayer[] {
  const enriched = players.map((player, idx) => ({
    player,
    idx,
    finalPoints: player.points[totalRounds - 1] ?? 0,
    stats: computePlayerStats(player),
  }));

  // Sort descending by finalPoints, stable by original index
  enriched.sort((a, b) => b.finalPoints - a.finalPoints || a.idx - b.idx);

  const maxPoints = enriched.length > 0 ? enriched[0].finalPoints : 0;

  return enriched.map((e, i, arr) => {
    // Competition rank: number of items with strictly higher points + 1
    const higherCount = arr.filter((other) => other.finalPoints > e.finalPoints).length;
    const rank = higherCount + 1;
    const tied = arr.some((other, j) => j !== i && other.finalPoints === e.finalPoints);
    return {
      player: e.player,
      rank,
      finalPoints: e.finalPoints,
      tied,
      stats: e.stats,
      gapToLeader: maxPoints - e.finalPoints,
    } satisfies RankedPlayer;
  });
}

/** Build the plain-text summary for the clipboard action (F26). */
export function buildTextSummary(
  ranked: RankedPlayer[],
  dateStr: string,
  rateLabel = 'Rate'
): string {
  const lines: string[] = [];
  for (const rp of ranked) {
    const rateStr = rp.stats.hitRate !== null ? `${rp.stats.hitRate}%` : '-';
    lines.push(`${rp.rank}. ${rp.player.name}  ${rp.finalPoints}  ${rateLabel}: ${rateStr}`);
  }
  return `Wizard — ${dateStr}\n${lines.join('\n')}`;
}

/**
 * Sanitize a player name for use in a filename: strip diacritics,
 * replace non-alphanumeric with hyphens, max 40 chars.
 */
export function sanitizeNameForFile(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase();
}
