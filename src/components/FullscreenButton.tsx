import React from 'react';

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
  if (!isMobile() || !isFullscreenSupported()) return null;
  return (
    <button
      onClick={toggleFullscreen}
      className="absolute top-2 right-2 z-50 p-2 bg-white rounded-full shadow-md"
      aria-label="Vollbild umschalten"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 4H9V2H2V9H4V4ZM15 2V4H20V9H22V2H15ZM20 20H15V22H22V15H20V20ZM4 15H2V22H9V20H4V15Z"
          fill="#333"
        />
      </svg>
    </button>
  );
};

export default FullscreenButton;
