import React from 'react';

interface DocumentWithFullscreen extends Document {
  mozFullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
}
interface DocumentElementWithFullscreen extends HTMLElement {
  msRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}

interface DocumentWithFullscreenControls extends Document {
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitFullscreenElement?: Element;
  msExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
}

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const isFullscreenSupported = () =>
  document.fullscreenEnabled ||
  (document as DocumentWithFullscreen).mozFullscreenEnabled ||
  (document as DocumentWithFullscreen).webkitFullscreenEnabled ||
  (document as DocumentWithFullscreen).msFullscreenEnabled;

const isDocumentFullscreen = (): boolean => {
  const doc = document as DocumentWithFullscreenControls;
  return !!(
    doc.fullscreenElement ||
    doc.mozFullScreenElement ||
    doc.webkitFullscreenElement ||
    doc.msFullscreenElement
  );
};

async function toggleFullscreen() {
  if (!isDocumentFullscreen()) {
    const element = document.documentElement as DocumentElementWithFullscreen;
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen();
    }
  } else {
    const doc = document as DocumentWithFullscreenControls;
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    }
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
