import { useEffect, useState } from 'react';
import logoTransparent from '../assets/logo_transparent.png';
import { isE2E } from '../e2eFlag';
import { T } from '../test-ids';

export const LoadingScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // In e2e runs (?e2e=1) skip the artificial splash delay to keep tests fast.
    const timer = setTimeout(
      () => {
        setIsVisible(false);
      },
      isE2E() ? 0 : 2_000
    );

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 bg-surface z-[1000] flex items-center justify-center transition-opacity ${
        isE2E() ? 'duration-0' : 'duration-1000'
      } ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      data-testid={T.loading.splash}
    >
      {/* Transparent emblem asset so it blends into the dark surface with no
          background box; the pulse is the only loading affordance. */}
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-128 md:h-128">
        <img
          src={logoTransparent}
          alt=""
          className="h-full w-full object-contain animate-pulse"
          loading="eager"
          width="256"
          height="256"
        />
      </div>
    </div>
  );
};
