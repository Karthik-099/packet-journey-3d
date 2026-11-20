import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Lab } from './Lab';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Lab />
  </StrictMode>,
);
