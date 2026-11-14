import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import fontUrl from './assets/fonts/DK Cool Crayon.ttf?url';
import './index.css';

// The title needs the crayon font at ~0.3s; start the fetch with the app shell.
const fontPreload = document.createElement('link');
fontPreload.rel = 'preload';
fontPreload.as = 'font';
fontPreload.type = 'font/ttf';
fontPreload.crossOrigin = 'anonymous';
fontPreload.href = fontUrl;
document.head.appendChild(fontPreload);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
