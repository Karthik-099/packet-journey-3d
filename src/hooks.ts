import { useEffect, useState } from 'react';
import { useStore } from './store';
import { JOURNEYS, findStep } from './content';

const STEP_MS = 7000;

/** Auto-advance while playing. */
export function usePlayback() {
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const index = useStore((s) => s.index);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => useStore.getState().next(), STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, speed, index]);
}

/** #hi-l4 style deep links, kept in sync both ways. */
export function useDeepLink() {
  useEffect(() => {
    const apply = () => {
      const hit = findStep(decodeURIComponent(location.hash.slice(1)));
      if (hit) useStore.getState().setJourney(hit.journey, hit.index);
    };
    apply();
    window.addEventListener('hashchange', apply);
    const unsub = useStore.subscribe((s, p) => {
      if (s.journey === p.journey && s.index === p.index) return;
      const id = JOURNEYS[s.journey].steps[s.index]?.id;
      if (id && location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    });
    return () => {
      window.removeEventListener('hashchange', apply);
      unsub();
    };
  }, []);
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      if (e.key === 'ArrowRight') s.next();
      else if (e.key === 'ArrowLeft') s.prev();
      else if (e.key === ' ' && !t.closest('button')) {
        e.preventDefault();
        s.set({ playing: !s.playing });
      } else if (e.key === 'Escape') s.set({ tip: null, conceptsOpen: false });
      else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function useReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)';
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setR(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return r;
}
