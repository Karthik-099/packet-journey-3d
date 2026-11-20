import { useEffect, useState } from 'react';

/**
 * Shared like counter. VITE_LIKES_API points at likes-worker (Cloudflare Worker):
 *   GET  {api}     → { count, liked }
 *   POST {api}/up  → { count, liked }   one like per visitor, counted server-side
 * shortcut: if VITE_LIKES_API is unset, the like is remembered in this browser only and no count is shown; deploy likes-worker to enable it.
 */
const API = (import.meta.env.VITE_LIKES_API as string | undefined)?.replace(/\/$/, '');
const KEY = 'pj-liked';

interface Res {
  count: number;
  liked: boolean;
}
const valid = (j: unknown): j is Res => typeof (j as Res)?.count === 'number' && Number.isFinite((j as Res).count);

async function call(path: '' | '/up'): Promise<Res | null> {
  if (!API) return null;
  try {
    const r = await fetch(API + path, { method: path ? 'POST' : 'GET' });
    const j: unknown = await r.json();
    return r.ok && valid(j) ? j : null;
  } catch {
    return null;
  }
}

const Heart = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className={filled ? 'fill-rose-400 stroke-rose-400' : 'fill-none stroke-current'} strokeWidth="2" strokeLinejoin="round">
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
  </svg>
);

export function Like({ compact = false }: { compact?: boolean }) {
  const [liked, setLiked] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    void call('').then((r) => {
      if (!r) return;
      setCount(r.count);
      if (r.liked) setLiked(true);
    });
  }, []);
  const like = async () => {
    if (liked) return;
    setLiked(true);
    localStorage.setItem(KEY, '1');
    setCount((c) => (c === null ? c : c + 1)); // optimistic; server value replaces it
    const r = await call('/up');
    if (r) setCount(r.count);
  };
  const label = liked ? 'Thanks for the thumbs up' : 'Found this useful? Give it a thumbs up';
  return (
    <button
      onClick={like}
      aria-pressed={liked}
      title={label}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-lg backdrop-blur transition focus-visible:outline-2 focus-visible:outline-cyan-300 ${
        liked ? 'border-rose-400/50 bg-rose-500/15 text-rose-100' : 'border-white/15 bg-[#0b1028]/80 text-slate-200 hover:border-rose-300/50 hover:text-white'
      }`}
    >
      <Heart filled={liked} />
      {!compact && <span>{liked ? 'Thanks!' : 'Useful? Thumbs up'}</span>}
      {count !== null && <span className="font-mono text-xs text-slate-300">{count.toLocaleString()}</span>}
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Floating version for the landing and learning pages. */
export const FloatingLike = () => (
  <div className="fixed bottom-5 right-5 z-50 print:hidden">
    <Like />
  </div>
);
