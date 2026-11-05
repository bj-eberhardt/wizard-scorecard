import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/i18n';
import { appSettings } from './settings';
import predictionIntro from './assets/prediction-intro.gif';
import resultIntro from './assets/result-intro.gif';

if (appSettings.showDialogIntroAnimation) {
  for (const src of [predictionIntro, resultIntro]) {
    const image = new Image();
    image.src = src;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
