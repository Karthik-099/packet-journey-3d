import { useState } from 'react';
import { useStore } from '../store';
import { Icon, type IconName } from '../site/Icon';

const KEY = 'pj-guide-seen';
const STEPS: { i: IconName; t: string; d: string }[] = [
  { i: 'globe', t: 'Pick a journey', d: '"Visit a website" follows a real request across the world. "Message → 7 layers" shows a message being wrapped and unwrapped by each OSI layer.' },
  { i: 'search', t: 'Type any domain', d: 'Use the https:// box at the top. We look it up live and draw the route from your location to that server.' },
  { i: 'play', t: 'Play it like a video', d: 'Press Play (or Space). The camera follows the packet with subtitles. Use ← → to go step by step, and the speed menu to slow down.' },
  { i: 'terminal', t: 'Dig into any step', d: 'The right panel explains each step in plain English. Open "Under the hood" and the packet inspector for the expert view. Click 3D objects for tooltips.' },
];

/** First-visit guide; reopen any time from the "Guide" button. */
export function Onboarding() {
  const open = useStore((s) => s.guideOpen);
  const set = useStore((s) => s.set);
  const gpsAsking = useStore((s) => s.gpsStatus === 'asking');
  const [seen] = useState(() => localStorage.getItem(KEY) === '1');
  const show = open || (!seen && !gpsAsking && !sessionStorage.getItem(KEY));
  if (!show) return null;
  const close = () => {
    localStorage.setItem(KEY, '1');
    sessionStorage.setItem(KEY, '1');
    set({ guideOpen: false });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#07041a]/70 p-4 backdrop-blur-sm" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="guide-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-noc-edge bg-noc-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="keep-dark bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 px-6 py-5">
          <h2 id="guide-title" className="text-xl font-bold text-white">Welcome to Packet Journey</h2>
          <p className="mt-1 text-sm text-white/85">An interactive, step-by-step 3D tour of how data really moves across the internet.</p>
          <p className="mt-3 text-sm leading-6 text-white/90">
            <b>Why:</b> opening a website sends your request thousands of kilometres and back in a fraction of a second. This tour stops at every point along the way, using real lookups and real packet bytes, so the internet stops being a black box. The whole trip takes about 3 minutes.
          </p>
        </div>
        <ol className="grid gap-3 p-6 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-xl border border-noc-edge bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-400 text-white"><Icon name={s.i} /></span>
                <h3 className="font-semibold text-white">{i + 1}. {s.t}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between border-t border-noc-edge px-6 py-4">
          <span className="text-xs text-slate-400">Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">?</kbd> for keyboard shortcuts</span>
          <div className="flex gap-2">
            <button className="btn" onClick={close}>Explore on my own</button>
            <button autoFocus className="btn-primary" onClick={() => { close(); set({ playing: true }); }}>Play the guided tour →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
