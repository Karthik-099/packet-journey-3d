import { create } from 'zustand';
import { useMemo } from 'react';
import { JOURNEYS, type CorePath, type Ctx, type JourneyId, type Medium } from './content';
import { buildHi } from './lib/hi';
import type { Me } from './lib/whoami';

export type Mode = 'beginner' | 'expert';

interface State {
  journey: JourneyId;
  index: number;
  playing: boolean;
  speed: number;
  mode: Mode;
  tcpip: boolean;
  message: string;
  tls: boolean;
  medium: Medium;
  path: CorePath;
  quic: boolean;
  view: '3d' | '2d';
  conceptsOpen: boolean;
  tip: string | null;
  me: Me | null;
  meStatus: 'loading' | 'ok' | 'failed' | 'off';
  set: (p: Partial<State>) => void;
  go: (i: number) => void;
  next: () => void;
  prev: () => void;
  setJourney: (j: JourneyId, index?: number) => void;
}

const lowPower = () => {
  if (typeof window === 'undefined') return false;
  const small = window.matchMedia('(max-width: 767px)').matches;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 2;
  let webgl = false;
  try {
    webgl = !!document.createElement('canvas').getContext('webgl2');
  } catch {
    webgl = false;
  }
  return small || weak || !webgl;
};

export const useStore = create<State>((set, get) => ({
  journey: 'google',
  index: 0,
  playing: false,
  speed: 1,
  mode: 'beginner',
  tcpip: false,
  message: 'hi',
  tls: false,
  medium: 'copper',
  path: 'edge',
  quic: false,
  view: lowPower() ? '2d' : '3d',
  conceptsOpen: false,
  tip: null,
  me: null,
  meStatus: 'loading',
  set: (p) => set(p),
  go: (i) => set({ index: Math.max(0, Math.min(JOURNEYS[get().journey].steps.length - 1, i)), tip: null }),
  next: () => {
    const { index, journey } = get();
    const last = JOURNEYS[journey].steps.length - 1;
    set(index >= last ? { playing: false } : { index: index + 1, tip: null });
  },
  prev: () => get().go(get().index - 1),
  setJourney: (j, index = 0) => set({ journey: j, index, playing: false, tip: null }),
}));

export const useStep = () => {
  const journey = useStore((s) => s.journey);
  const index = useStore((s) => s.index);
  return JOURNEYS[journey].steps[index]!;
};

/** Content context: user toggles + live packets built from the typed message. */
export function useCtx(): Ctx {
  const message = useStore((s) => s.message);
  const tls = useStore((s) => s.tls);
  const medium = useStore((s) => s.medium);
  const path = useStore((s) => s.path);
  const quic = useStore((s) => s.quic);
  const me = useStore((s) => (s.meStatus === 'ok' ? s.me : null));
  return useMemo(() => ({ message, tls, medium, path, quic, me, hi: buildHi(message, tls) }), [message, tls, medium, path, quic, me]);
}
