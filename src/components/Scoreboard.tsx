import React, { useState } from 'react';
import {Player, useGameStore} from '../store/gameStore'

export function Scoreboard() {
  const { players, currentRound, totalRounds } = useGameStore()
  const rounds = Array.from({ length: totalRounds }, (_, i) => i)

  // Tooltip-Logik
  const [tooltip, setTooltip] = useState<{visible: boolean, x: number, y: number, content: string} | null>(null);

  // Hilfsfunktion für Tooltip-Inhalt
  function getTooltipContent(p: Player, roundIndex: number) {
    return `Vorhersage: ${p.predictions[roundIndex] ?? '-'}\nErreichte Stiche: ${p.results?.[roundIndex] ?? '-'}\nPunkte: ${p.points[roundIndex] - (p.points[roundIndex-1] ?? 0)}`;
  }

  // Hilfsfunktion zur Messung der Tooltip-Breite
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

  // Hilfsfunktion zur Berechnung der Tooltip-Position und -Daten
  function getTooltipData(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>, p: Player, roundIndex: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipContent = getTooltipContent(p, roundIndex);
    const tooltipWidth = createTooltipMeasureDiv(tooltipContent);
    let x = rect.right + window.scrollX + 8;
    if (x + tooltipWidth > window.innerWidth) {
      x = rect.left + window.scrollX - tooltipWidth - 8;
    }
    return {
      visible: true,
      x,
      y: rect.top + window.scrollY,
      content: tooltipContent
    };
  }

  return (
    <div className="text-center flex justify-center w-full">
      <div className="overflow-x-auto w-full">
        <table className="min-w-max w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0  z-10 px-2 text-center border-2 border-black">Runde</th>
              {players.map((p, i) => (
                <th key={i + 'name'} colSpan={2} className="px-2 text-center border-2 border-black whitespace-nowrap">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((_, roundIndex) => (
              <tr key={roundIndex}>
                <td className="sticky left-0  z-10 border-2 border-black">{roundIndex + 1}</td>
                {players.map((p, i) => (
                  <React.Fragment key={i + 'player' + roundIndex}>
                    <td className={`border border-black text-sm font-bold px-2 ${i === 0 ? '' : 'border-l-4'} whitespace-nowrap`}>{p.points[roundIndex] ?? '-'}</td>
                    <td className={`cursor-pointer border border-black px-2 ${i === players.length - 1 ? 'border-r-4' : ''} whitespace-nowrap`}
                      onMouseEnter={e => {
                        setTooltip(getTooltipData(e, p, roundIndex));
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onTouchStart={e => {
                        setTooltip(getTooltipData(e, p, roundIndex));
                      }}
                      onTouchEnd={() => setTooltip(null)}
                    >
                      {p.predictions[roundIndex] ?? '-'}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Tooltip-Element */}
      {tooltip?.visible && (
        <div
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}
