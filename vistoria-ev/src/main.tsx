import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pedirPersistencia } from './lib/storage';
import './styles.css';

if (import.meta.env.MODE === 'artifact') {
  // Prévia no claude.ai: o frame não mostra confirm(); aceita direto.
  window.confirm = () => true;
} else {
  import('virtual:pwa-register').then((m) => m.registerSW({ immediate: true }));
}
pedirPersistencia();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
