import { create } from 'zustand';
import { useMemo } from 'react';
import { JOURNEYS, type Access, type Ctx, type Dest, type JourneyId, type Medium } from './content';
import { buildCtx } from './content/ctx';
import { DEFAULT_TARGET, geoIp, normalizeDomain, resolveTarget, type Geo, type Target } from './lib/lookup';

export type Mode = 'beginner' | 'expert';
type Status = 'idle' | 'loading' | 'ok' | 'failed' | 'off';

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
  access: Access;
  dest: Dest;
  quic: boolean;
  view: '3d' | '2d';
  narrate: boolean;
  conceptsOpen: boolean;
  helpOpen: boolean;
  tip: string | null;
  me: Geo | null;
  meStatus: Status;
  target: Target;
  targetStatus: Status;
  targetError: string | null;
  set: (p: Partial<State>) => void;
  go: (i: number) => void;
  next: () => void;
  prev: () => void;
  setJourney: (j: JourneyId, index?: number) => void;
  detectMe: () => Promise<void>;
  lookup: (input: string) => Promise<void>;
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

let lookupCtl: AbortController | null = null;

export const useStore = create<State>((set, get) => ({
  journey: 'google',
  index: 0,
  playing: false,
  speed: 1,
  mode: 'beginner',
  tcpip: false,
  message: 'how are you',
  tls: false,
  medium: 'copper',
  access: 'fiber',
  dest: 'edge',
  quic: false,
  view: lowPower() ? '2d' : '3d',
  narrate: false,
  conceptsOpen: false,
  helpOpen: false,
  tip: null,
  me: null,
  meStatus: 'idle',
  target: DEFAULT_TARGET,
  targetStatus: 'idle',
  targetError: null,
  set: (p) => set(p),
  go: (i) => set({ index: Math.max(0, Math.min(JOURNEYS[get().journey].steps.length - 1, i)), tip: null }),
  next: () => {
    const { index, journey } = get();
    const last = JOURNEYS[journey].steps.length - 1;
    set(index >= last ? { playing: false } : { index: index + 1, tip: null });
  },
  prev: () => get().go(get().index - 1),
  setJourney: (j, index = 0) => set({ journey: j, index, playing: false, tip: null }),
  detectMe: async () => {
    set({ meStatus: 'loading' });
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 7000);
    const me = await geoIp('', ac.signal);
    clearTimeout(t);
    set(me ? { me, meStatus: 'ok' } : { meStatus: 'failed' });
  },
  lookup: async (input) => {
    const domain = normalizeDomain(input);
    if (!domain) {
      set({ targetStatus: 'failed', targetError: `"${input}" is not a valid domain name (try example.com)` });
      return;
    }
    lookupCtl?.abort();
    const ac = (lookupCtl = new AbortController());
    const t = setTimeout(() => ac.abort(), 12000);
    set({ targetStatus: 'loading', targetError: null });
    try {
      const target = await resolveTarget(domain, ac.signal);
      if (lookupCtl === ac) set({ target, targetStatus: 'ok', journey: 'google' });
    } catch (e) {
      if (lookupCtl === ac) set({ targetStatus: 'failed', targetError: ac.signal.aborted ? 'Lookup timed out' : e instanceof Error ? e.message : 'Lookup failed' });
    } finally {
      clearTimeout(t);
    }
  },
}));

export const useStep = () => {
  const journey = useStore((s) => s.journey);
  const index = useStore((s) => s.index);
  return JOURNEYS[journey].steps[index]!;
};

/** Content context: user toggles + live data + packets built from the typed message. */
export function useCtx(): Ctx {
  const message = useStore((s) => s.message);
  const tls = useStore((s) => s.tls);
  const medium = useStore((s) => s.medium);
  const access = useStore((s) => s.access);
  const dest = useStore((s) => s.dest);
  const quic = useStore((s) => s.quic);
  const me = useStore((s) => (s.meStatus === 'ok' ? s.me : null));
  const target = useStore((s) => s.target);
  return useMemo(() => buildCtx({ message, tls, medium, access, dest, quic, me, target }), [message, tls, medium, access, dest, quic, me, target]);
}
