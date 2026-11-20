import { useEffect, useState } from 'react';
import { useCtx, useStore } from './store';
import { JOURNEYS, findStep, resolve } from './content';

/** Reading time for a step's text, scaled by speed, never shorter than its animation. */
function stepDuration(text: string, minMs: number, speed: number) {
  const words = text.split(/\s+/).length;
  return Math.max(minMs, (2500 + words * 260) / speed);
}

/** Auto-advance while playing ("video mode"). With narration on, waits for the voice to finish. */
export function usePlayback() {
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const index = useStore((s) => s.index);
  const journey = useStore((s) => s.journey);
  const narrate = useStore((s) => s.narrate);
  const c = useCtx();
  useEffect(() => {
    const step = JOURNEYS[journey].steps[index];
    if (!step) return;
    const text = resolve(step.what, c);
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    synth?.cancel();
    if (!playing) return;
    const minMs = step.minPlayMs?.(c) ?? 0;
    let spoken = !narrate || !synth;
    let timed = false;
    const advance = () => spoken && timed && useStore.getState().next();
    const t = setTimeout(() => {
      timed = true;
      advance();
    }, narrate ? minMs : stepDuration(text, minMs, speed));
    if (narrate && synth) {
      const u = new SpeechSynthesisUtterance(`${step.title}. ${text}`);
      u.rate = Math.min(2, 0.95 * speed);
      u.onend = u.onerror = () => {
        spoken = true;
        setTimeout(advance, 400);
      };
      synth.speak(u);
    }
    return () => {
      clearTimeout(t);
      synth?.cancel();
    };
    // re-run on step/speed/narration change; c changes only via toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, index, journey, narrate]);
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
      } else if (e.key === 'Escape') s.set({ tip: null, conceptsOpen: false, helpOpen: false });
      else if (e.key === '?') s.set({ helpOpen: !s.helpOpen });
      else if (e.key === 'Home') s.go(0);
      else if (e.key === 'End') s.go(1e9);
      else if (e.key.toLowerCase() === 'e') s.set({ mode: s.mode === 'expert' ? 'beginner' : 'expert' });
      else if (e.key.toLowerCase() === 'j') {
        const order = Object.keys(JOURNEYS) as (keyof typeof JOURNEYS)[];
        s.setJourney(order[(order.indexOf(s.journey) + 1) % order.length]!);
      }
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
