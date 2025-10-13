import { useEffect, useState } from 'react';
import logoPng from '../assets/logo.png';
import logoWebp from '../assets/logo.webp';

export const LoadingScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2_000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 bg-white z-[1000] flex items-center justify-center transition-opacity duration-1000 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-128 md:h-128 relative">
        <picture>
          <source srcSet={logoWebp} type="image/webp" />
          <img
            src={logoPng}
            alt=""
            className="w-full h-full object-contain animate-pulse"
            loading="eager"
            width="256"
            height="256"
          />
        </picture>
      </div>
    </div>
  );
};
