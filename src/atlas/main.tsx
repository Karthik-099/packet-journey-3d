import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Atlas } from './Atlas';
import '../index.css';
import { initTheme } from '../site/theme';

initTheme('light');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Atlas />
  </StrictMode>,
);
