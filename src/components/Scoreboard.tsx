import React, { useState, useRef, useEffect } from 'react';
import { Player, useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';

export function Scoreboard() {
  const { t } = useTranslation();
  const { players, totalRounds, currentRound } = useGameStore();
  const rounds = Array.from({ length: totalRounds }, (_, i) => i);
  const lastPlayedIndex = currentRound > 1 ? Math.max(0, currentRound - 2) : -1;

  // show a subtle one-time pulse animation on the round-1 prediction cells
  // after the first round has completed to indicate interactivity (mobile users)
  const [showPulse, setShowPulse] = useState<boolean>(false);
  const pulseTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // Do not persist animation state; show pulse when currentRound > 1 (also after F5).
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // respect user preference and don't animate
      return;
    }
    if (currentRound > 1) {
      // show pulse for about 1.6s on the last played round
      setShowPulse(true);
      pulseTimerRef.current = window.setTimeout(() => {
        setShowPulse(false);
        pulseTimerRef.current = null;
      }, 1600);
    }
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, [currentRound]);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    contentBase: string;
    contentExtras: string[];
    playerIndex: number;
    roundIndex: number;
    tooltipId: string;
  } | null>(null);

  const touchTimerRef = useRef<number | null>(null);

  function getTooltipContent(p: Player, roundIndex: number) {
    const base = t('scoreboard.tooltip', {
      prediction: p.predictions[roundIndex] ?? '-',
      tricks: p.receivedResults?.[roundIndex] ??  p.results?.[roundIndex] ?? '-',
      points: p.points[roundIndex] - (p.points[roundIndex - 1] ?? 0),
    });
    const extras: string[] = [];
    if (p.wolkeUsed?.[roundIndex]) {
      extras.push('\u2601 ' + t('scoreboard.wolkeNote'));
      const received = p.receivedResults?.[roundIndex];
      if (typeof received === 'number') {
        const pointsForRound = p.results?.[roundIndex] ?? '-';
        extras.push(t('scoreboard.receivedTricksLabel', { received: pointsForRound }));
      }
    }

    return { base, extras };
  }

  function createTooltipMeasureDiv(content: string) {
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.padding = '0.5rem';
    temp.style.whiteSpace = 'pre-line';
    temp.style.fontSize = '1rem';
    temp.innerText = content;
    document.body.appendChild(temp);
    const width = temp.offsetWidth;
    document.body.removeChild(temp);
    return width;
  }

  function getTooltipData(
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
    p: Player,
    roundIndex: number,
    playerIndex: number
  ) {
    if (!p.points[roundIndex]) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const content = getTooltipContent(p, roundIndex);
    const combinedText = content.base + (content.extras.length ? '\n' + content.extras.join('\n') : '');
    const tooltipWidth = createTooltipMeasureDiv(combinedText);
    let x = rect.right + window.scrollX + 8;
    if (x + tooltipWidth > window.innerWidth) {
      x = rect.left + window.scrollX - tooltipWidth - 8;
    }
    return {
      visible: true,
      x,
      y: rect.top + window.scrollY,
      contentBase: content.base,
      contentExtras: content.extras,
      playerIndex,
      roundIndex,
      tooltipId: `scoreboard-tooltip-${playerIndex}-${roundIndex}`,
    };
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, p: Player, roundIndex: number, playerIndex: number) => {
    // cancel any touch timer
    if (touchTimerRef.current) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    setTooltip(getTooltipData(e, p, roundIndex, playerIndex));
  };

  const handleMouseLeave = () => {
    // cancel any touch timer
    if (touchTimerRef.current) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    setTooltip(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>, p: Player, roundIndex: number, playerIndex: number) => {
    // start a long-press timer (500ms) to open the tooltip
    if (touchTimerRef.current) window.clearTimeout(touchTimerRef.current);
    // store the touch event's currentTarget bounding rect when firing
    touchTimerRef.current = window.setTimeout(() => {
      setTooltip(getTooltipData(e as any, p, roundIndex, playerIndex));
      touchTimerRef.current = null;
    }, 500);
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    // if tooltip was opened, hide it on touch end; otherwise cancel timer
    if (touchTimerRef.current) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    } else {
      // tooltip likely visible from long-press, hide it
      setTooltip(null);
    }
  };

  return (
    <div className="text-center flex justify-center w-full">
      <div className="overflow-x-auto w-full">
        <table className="min-w-max w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="bg-white sticky left-0 z-10 px-2 text-center border-2 border-black">
                {t('labels.round')}
              </th>
              {players.map((p, i) => (
                <th
                  key={i + 'name'}
                  colSpan={2}
                  className="px-2 text-center border-2 border-black whitespace-nowrap"
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((_, roundIndex) => (
              <tr key={roundIndex}>
                <td className="bg-white sticky left-0  z-10 border-2 border-black">
                  {roundIndex + 1}
                </td>
                {players.map((p, i) => (
                  <React.Fragment key={i + 'player' + roundIndex}>
                    <td
                      className={`border border-black text-sm font-bold px-2 ${i === 0 ? '' : 'border-l-4'} whitespace-nowrap`}
                    >
                      {p.points[roundIndex] ?? '-'}
                    </td>
                    <td
                      className={`cursor-pointer border border-black px-2 ${i === players.length - 1 ? 'border-r-4' : ''} whitespace-nowrap`}
                      onMouseLeave={() => handleMouseLeave()}
                      onTouchMove={() => handleTouchMove()}
                      onTouchEnd={() => handleTouchEnd()}
                    >
                      <span
                        className={`w-full inline-block text-left transition ease-out duration-150 hover:bg-gray-100 hover:shadow-sm rounded px-1 py-0.5 ${showPulse && roundIndex === lastPlayedIndex ? 'animate-pulse bg-yellow-100 ring-4 ring-yellow-300 shadow-md transform scale-105' : ''}`}
                        onMouseEnter={(e) => handleMouseEnter(e as any, p, roundIndex, i)}
                        onTouchStart={(e) => handleTouchStart(e as any, p, roundIndex, i)}
                      >
                        {p.predictions[roundIndex] ?? '-'}
                      </span>
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tooltip?.visible && (
        <div
          id={tooltip.tooltipId}
          role="tooltip"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: 'white',
            border: '1px solid black',
            borderRadius: '0.25rem',
            padding: '0.5rem',
            zIndex: 1000,
            whiteSpace: 'pre-line',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div>{tooltip.contentBase}</div>
          {tooltip.contentExtras.length > 0 && (
            <div className="mt-1 text-xs text-gray-600 italic">
              {tooltip.contentExtras.map((l, idx) => (
                // mark the cloud icon part as decorative but provide accessible label via aria-label
                <div key={idx}>
                  {l.startsWith('\u2601') ? (
                    <span role="img" aria-label={t('scoreboard.wolkeNote')}>{l.replace('\u2601 ', '\u2601\u00A0')}</span>
                  ) : (
                    <span>{l}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
