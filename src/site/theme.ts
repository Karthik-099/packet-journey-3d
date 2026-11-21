/** One saved preference for every page. Unset: site pages are light, the 3D app is dark. */
export type Theme = 'light' | 'dark';
const KEY = 'pj-theme';

export function savedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function applyTheme(t: Theme) {
  const h = document.documentElement;
  h.classList.toggle('dark', t === 'dark');
  h.classList.toggle('light', t === 'light');
  h.style.colorScheme = t;
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode: still applies for this page */
  }
  applyTheme(t);
}

/** Call before the first render so there is no flash. */
export const initTheme = (fallback: Theme) => applyTheme(savedTheme() ?? fallback);
