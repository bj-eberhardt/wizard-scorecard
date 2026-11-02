import { useState } from 'react';
import { T } from '../test-ids';

/**
 * Full-screen CSS confetti burst, mounted once when the winner view appears.
 * Respects `prefers-reduced-motion`: the container is still rendered (hidden)
 * so tests can assert `data-reduced-motion` in both branches. Pointer events
 * are disabled by the `.confetti-container` CSS; this component owns no state
 * beyond the one-time media-query check.
 */
export default function WinnerConfetti() {
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true
  );

  return (
    <div
      data-testid={T.winner.confetti}
      data-reduced-motion={reducedMotion}
      className={reducedMotion ? 'hidden' : 'confetti-container'}
      aria-hidden="true"
    />
  );
}
