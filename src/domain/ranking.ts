import type { Player } from './types';

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
  /** Number of Wolke rounds where the effective result equals the prediction. */
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
  const hitTotal = points.length;

  let hitCorrect = 0;
  let bestRoundDelta = 0;
  let worstRoundDelta = 0;
  let wolkeCount = 0;
  let wolkeSuccess = 0;

  for (let roundIndex = 0; roundIndex < hitTotal; roundIndex++) {
    const prediction = predictions[roundIndex] ?? 0;
    const adjustedPrediction = player.adjustedPredictions?.[roundIndex] ?? prediction;
    const result = results[roundIndex] ?? 0;
    if (adjustedPrediction === result) hitCorrect++;

    const delta =
      roundIndex === 0 ? points[roundIndex] : points[roundIndex] - points[roundIndex - 1];
    if (delta > bestRoundDelta) bestRoundDelta = delta;
    if (delta < worstRoundDelta) worstRoundDelta = delta;
  }

  for (let roundIndex = 0; roundIndex < wolkeUsed.length; roundIndex++) {
    if (!wolkeUsed[roundIndex]) continue;
    wolkeCount++;
    const prediction = player.adjustedPredictions?.[roundIndex] ?? predictions[roundIndex] ?? 0;
    if (prediction === (results[roundIndex] ?? 0)) wolkeSuccess++;
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
  const enriched = players.map((player, index) => ({
    player,
    index,
    finalPoints: player.points[totalRounds - 1] ?? 0,
    stats: computePlayerStats(player),
  }));

  enriched.sort((a, b) => b.finalPoints - a.finalPoints || a.index - b.index);

  const maxPoints = enriched.length > 0 ? enriched[0].finalPoints : 0;

  return enriched.map((entry, index, sorted) => {
    const higherCount = sorted.filter((other) => other.finalPoints > entry.finalPoints).length;
    const rank = higherCount + 1;
    const tied = sorted.some(
      (other, otherIndex) => otherIndex !== index && other.finalPoints === entry.finalPoints
    );
    return {
      player: entry.player,
      rank,
      finalPoints: entry.finalPoints,
      tied,
      stats: entry.stats,
      gapToLeader: maxPoints - entry.finalPoints,
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
  for (const rankedPlayer of ranked) {
    const rate = rankedPlayer.stats.hitRate !== null ? `${rankedPlayer.stats.hitRate}%` : '-';
    lines.push(
      `${rankedPlayer.rank}. ${rankedPlayer.player.name}  ${rankedPlayer.finalPoints}  ${rateLabel}: ${rate}`
    );
  }
  return `Wizard — ${dateStr}\n${lines.join('\n')}`;
}

/** Sanitize a player name for use in a filename. */
export function sanitizeNameForFile(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase();
}
