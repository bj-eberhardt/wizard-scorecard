import { describe, expect, it } from 'vitest';
import type { Player } from './types';
import { buildTextSummary, computePlayerStats, rankPlayers, sanitizeNameForFile } from './ranking';

function player(
  name: string,
  points: number[],
  predictions: number[] = [],
  results: number[] = []
): Player {
  return {
    name,
    points,
    predictions,
    results,
    wolkeUsed: [],
    receivedResults: results,
  };
}

describe('ranking and statistics', () => {
  it('sorts players by final points and keeps roster order for ties', () => {
    const ranked = rankPlayers(
      [player('Anna', [50]), player('Ben', [80]), player('Cia', [80]), player('Dora', [20])],
      1
    );

    expect(ranked.map(({ player: entry }) => entry.name)).toEqual(['Ben', 'Cia', 'Anna', 'Dora']);
    expect(ranked.map(({ rank }) => rank)).toEqual([1, 1, 3, 4]);
    expect(ranked.map(({ tied }) => tied)).toEqual([true, true, false, false]);
    expect(ranked.map(({ gapToLeader }) => gapToLeader)).toEqual([0, 0, 30, 60]);
  });

  it('computes hit rate and round delta statistics', () => {
    const stats = computePlayerStats(player('Anna', [30, 20, 70], [1, 0, 2], [1, 1, 2]));

    expect(stats).toEqual({
      hitCorrect: 2,
      hitTotal: 3,
      hitRate: 67,
      bestRoundDelta: 50,
      worstRoundDelta: -10,
      wolkeCount: 0,
      wolkeSuccess: 0,
    });
  });

  it('counts Wolke usage and successful Wolke evaluations', () => {
    const stats = computePlayerStats({
      ...player('Anna', [30, 20], [1, 2], [1, 1]),
      wolkeUsed: [true, true],
    });

    expect(stats.wolkeCount).toBe(2);
    expect(stats.wolkeSuccess).toBe(1);
  });

  it('handles players without completed rounds', () => {
    expect(computePlayerStats(player('Anna', []))).toMatchObject({
      hitCorrect: 0,
      hitTotal: 0,
      hitRate: null,
      bestRoundDelta: 0,
      worstRoundDelta: 0,
    });
  });

  it('builds the established text export format', () => {
    const ranked = rankPlayers([player('Anna', [30], [1], [1])], 1);
    expect(buildTextSummary(ranked, 'Jan 1, 2026', 'Rate')).toBe(
      'Wizard — Jan 1, 2026\n1. Anna  30  Rate: 100%'
    );
  });

  it('sanitizes names for export filenames', () => {
    expect(sanitizeNameForFile(' Änne / Team! ')).toBe('anne-team');
  });
});
