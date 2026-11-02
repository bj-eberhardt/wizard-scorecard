import React from 'react';
import { Player, useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';

/**
 * Scoreboard: one row per round and THREE columns per player — prediction, tricks,
 * points — so the board explains itself without any hover/long-press helper.
 *
 * Every value is mirrored into a `data-*` attribute (AGENTS.md §8.1) so the E2E
 * suite can assert the whole cell matrix without touching localized text.
 * A Wolke round shows entered → evaluated (`3→2`) plus the cloud marker, because
 * the anniversary rule rewrites the value that counts for the points.
 *
 * The cells carry no animation: the one-time pulse hint that used to flag the last
 * played round as clickable was removed (UX-REVIEW F5) — it fired on every render,
 * marked the finished round instead of the upcoming one, and all players at once.
 */
export function Scoreboard() {
  const { t } = useTranslation();
  const { players, totalRounds } = useGameStore();
  const rounds = Array.from({ length: totalRounds }, (_, i) => i);

  // `w-12` on every sub-column: the table uses auto layout, so without a fixed width
  // the widest cell content (a header label) would decide the column width and the
  // three columns of a player group would end up differently sized. `px-0.5` keeps the
  // widest unbreakable string (`4→2☁`) inside those 48 px — a larger padding would
  // push the column past its own fixed width and make the group uneven again.
  const cellClass = 'border border-black w-12 px-0.5 py-0.5 text-xs text-center';
  // no background here: `bg-white`/`bg-gray-50` are set per cell so two conflicting
  // background utilities never end up on the same element
  const headerLabelClass =
    'w-12 px-0.5 py-0.5 text-xs font-normal text-gray-500 border-2 border-black text-center';

  /**
   * Rendered text of the tricks cell: `3→2 ☁` for a Wolke round, else the value.
   * The gap before the cloud is a narrow no-break space (U+202F) so the marker
   * still fits inside the fixed 48 px column without wrapping the row.
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
      <div className="overflow-x-auto w-full">
        {/* No `w-full`: all data columns are fixed-width, so a full-width table would
            give every leftover pixel to the "Runde" column and stretch it into an empty
            block on wide screens. The table sizes to its content and stays left-aligned. */}
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
