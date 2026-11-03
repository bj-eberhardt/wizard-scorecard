import React, { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const isFullscreenSupported = () => document.fullscreenEnabled || false;

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

const FullscreenButton: React.FC = () => {
  const { t } = useTranslation();
  const mobile = isMobile();
  const supported = isFullscreenSupported();
  // track the real fullscreen state so the icon mirrors the available action
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    if (!supported) return;
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [supported]);

  if (!mobile || !supported) return null;
  const Icon = isFullscreen ? Minimize : Maximize;
  return (
    <button
      onClick={toggleFullscreen}
      data-testid={T.header.fullscreen}
      className="absolute top-2 right-2 z-50 cursor-pointer p-2 bg-panel/90 ring-1 ring-line rounded-full shadow-md"
      aria-label={t('buttons.toggleFullscreen')}
    >
      <Icon size={24} strokeWidth={2} aria-hidden className="text-ink" />
    </button>
  );
};

export default FullscreenButton;
