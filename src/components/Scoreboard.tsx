import React from 'react';
import { Player, useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';

/**
 * Scoreboard: one row per round, three columns per player — prediction, tricks, points.
 * Every value is mirrored into a `data-*` attribute so the E2E suite can assert the whole
 * cell matrix without touching localized text. A Wolke round shows `entered → evaluated`
 * plus the cloud marker, because the anniversary rule rewrites the value that counts.
 */
export function Scoreboard() {
  const { t } = useTranslation();
  const { players, totalRounds } = useGameStore();
  const rounds = Array.from({ length: totalRounds }, (_, i) => i);

  // The table is auto-layout, so `w-12` is what keeps the three sub-columns of a player group
  // equally wide; `px-0.5` makes the longest cell content (`4→2☁`) still fit into those 48 px.
  const cellClass = 'border border-black w-12 px-0.5 py-0.5 text-xs text-center';
  // Backgrounds are set per cell, never here, so no element carries two conflicting ones.
  const headerLabelClass =
    'w-12 px-0.5 py-0.5 text-xs font-normal text-gray-500 border-2 border-black text-center';

  /**
   * Rendered text of the tricks cell: `3→2 ☁` for a Wolke round, else the value. The narrow
   * no-break space (U+202F) keeps the marker inside the fixed column without wrapping.
   */
  function tricksText(p: Player, roundIndex: number): string {
    const evaluated = p.results?.[roundIndex];
    if (typeof evaluated !== 'number') return '-';
    if (!p.wolkeUsed?.[roundIndex]) return String(evaluated);
    const entered = p.receivedResults?.[roundIndex] ?? evaluated;
    return `${entered}\u2192${evaluated}\u202F\u2601`;
  }

  /** Attribute value of a per-round number: '' when the round is not played yet. */
  function attr(value: number | undefined): number | '' {
    return typeof value === 'number' ? value : '';
  }

  return (
    <div className="text-center flex justify-center w-full">
      {/* `max-w-full` instead of `w-full`: the scroll container shrinks to the table, so the
          whole board is centred on wide screens, and it is still capped at the viewport, so
          the horizontal scroll on narrow ones keeps working. */}
      <div className="overflow-x-auto max-w-full">
        {/* No `w-full`: with fixed data columns a full-width table would hand every leftover
            pixel to the round column and stretch it into an empty block. */}
        <table
          className="min-w-max border-separate border-spacing-0"
          data-testid={T.scoreboard.table}
        >
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="bg-white sticky left-0 z-10 px-2 py-1 text-center border-2 border-black"
              >
                {t('labels.round')}
              </th>
              {players.map((p, i) => (
                <th
                  key={`${i}-name`}
                  colSpan={3}
                  data-testid={T.scoreboard.headerPlayer(i)}
                  className={`px-2 py-1 text-center border-2 border-black ${
                    i > 0 ? 'border-l-4' : ''
                  }`}
                >
                  {p.name}
                </th>
              ))}
            </tr>
            <tr>
              {players.map((_, i) => (
                <React.Fragment key={`${i}-labels`}>
                  <th
                    data-testid={T.scoreboard.headerLabel(i, 'prediction')}
                    className={`bg-white ${headerLabelClass} ${i > 0 ? 'border-l-4' : ''}`}
                  >
                    {t('labels.prediction')}
                  </th>
                  <th
                    data-testid={T.scoreboard.headerLabel(i, 'tricks')}
                    className={`bg-white ${headerLabelClass}`}
                  >
                    {t('labels.tricks')}
                  </th>
                  <th
                    data-testid={T.scoreboard.headerLabel(i, 'points')}
                    className={`bg-gray-50 ${headerLabelClass} ${
                      i === players.length - 1 ? 'border-r-4' : ''
                    }`}
                  >
                    {t('labels.points')}
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((_, roundIndex) => (
              <tr key={roundIndex}>
                <td className="bg-white sticky left-0 z-10 border-2 border-black">
                  {roundIndex + 1}
                </td>
                {players.map((p, i) => {
                  const prediction = p.predictions[roundIndex];
                  const evaluated = p.results?.[roundIndex];
                  const entered = p.receivedResults?.[roundIndex] ?? evaluated;
                  const wolke = !!p.wolkeUsed?.[roundIndex];
                  return (
                    <React.Fragment key={`${i}-player${roundIndex}`}>
                      <td
                        data-testid={T.scoreboard.cell(i, roundIndex, 'prediction')}
                        data-prediction={attr(prediction)}
                        className={`${cellClass} ${i > 0 ? 'border-l-4' : ''}`}
                      >
                        <span className="w-full inline-block text-left rounded px-1 py-0.5">
                          {prediction ?? '-'}
                        </span>
                      </td>
                      <td
                        data-testid={T.scoreboard.cell(i, roundIndex, 'tricks')}
                        data-tricks={attr(evaluated)}
                        data-received-tricks={attr(entered)}
                        data-wolke={wolke ? 'true' : 'false'}
                        className={cellClass}
                      >
                        {tricksText(p, roundIndex)}
                      </td>
                      <td
                        data-testid={T.scoreboard.cell(i, roundIndex, 'points')}
                        data-points={attr(p.points[roundIndex])}
                        className={`${cellClass} bg-gray-50 font-bold ${
                          i === players.length - 1 ? 'border-r-4' : ''
                        }`}
                      >
                        {p.points[roundIndex] ?? '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
