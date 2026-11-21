import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Learn } from './Learn';
import '../index.css';
import { initTheme } from '../site/theme';

initTheme('light');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Learn />
  </StrictMode>,
);
