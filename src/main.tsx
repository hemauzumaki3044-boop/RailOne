import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
  });
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-notifications.js').catch(() => {
    // Ignore dev service worker registration errors
  });
}

createRoot(document.getElementById('root')!).render(<App />);
