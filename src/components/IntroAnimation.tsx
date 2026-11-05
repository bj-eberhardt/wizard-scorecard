import { useEffect, useState, type ReactNode } from 'react';
import { appSettings } from '../settings';

const INTRO_TRANSITION_MS = 500;

interface IntroAnimationProps {
  src: string;
  testId: string;
  imageTestId: string;
  overlayClassName: string;
  durationMs: number;
  children: ReactNode;
}

export function IntroAnimation({
  src,
  testId,
  imageTestId,
  overlayClassName,
  durationMs,
  children,
}: IntroAnimationProps) {
  const animationEnabled = appSettings.showDialogIntroAnimation;
  const [started, setStarted] = useState(() => !animationEnabled);
  const [visible, setVisible] = useState(animationEnabled);
  const [mounted, setMounted] = useState(animationEnabled);
  const [complete, setComplete] = useState(() => !animationEnabled);

  useEffect(() => {
    if (!started || !mounted) return;

    let transitionTimer: number | undefined;
    const animationTimer = window.setTimeout(() => {
      setVisible(false);
      setComplete(true);
      transitionTimer = window.setTimeout(() => setMounted(false), INTRO_TRANSITION_MS);
    }, durationMs);

    return () => {
      window.clearTimeout(animationTimer);
      if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    };
  }, [durationMs, mounted, started]);

  return (
    <div className="relative min-h-80">
      {complete && children}
      {mounted && (
        <div
          data-testid={testId}
          className={`${overlayClassName} ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={!visible}
        >
          <img
            src={src}
            alt=""
            data-testid={imageTestId}
            onLoad={() => setStarted(true)}
            onError={() => {
              setComplete(true);
              setMounted(false);
            }}
            className="dialog-intro-image max-h-80 w-auto object-contain"
          />
        </div>
      )}
    </div>
  );
}
