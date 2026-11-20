import { JOURNEYS } from '../content';
import { useStore } from '../store';
import { Switch } from './ui';
import { useState } from 'react';

/** Copies a link that reopens this exact step for this exact domain. */
function ShareButton() {
  const [ok, setOk] = useState(false);
  const share = async () => {
    const s = useStore.getState();
    const id = JOURNEYS[s.journey].steps[s.index]?.id ?? '';
    const url = `${location.origin}${location.pathname}${s.journey === 'google' ? `?d=${encodeURIComponent(s.target.domain)}` : ''}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      prompt('Copy this link', url);
    }
  };
  return (
    <button className="btn text-xs" onClick={share} aria-live="polite">
      {ok ? 'Link copied' : 'Share'}
    </button>
  );
}

export function Controls() {
  const { journey, index, playing, speed, narrate, set, next, prev, go } = useStore();
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const steps = JOURNEYS[journey].steps;
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <button className="btn" onClick={prev} disabled={index === 0} aria-label="Previous step (←)">← Prev</button>
      <button className={`btn w-28 ${playing ? 'btn-on' : ''}`} onClick={() => set({ playing: !playing })} aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}>
        {playing ? 'Pause' : 'Play video'}
      </button>
      <button className="btn" onClick={next} disabled={index === steps.length - 1} aria-label="Next step (→)">Next →</button>
      <label className="flex items-center gap-1 text-xs text-slate-400">
        speed
        <select className="rounded border border-noc-edge bg-noc-panel px-1 py-1 text-slate-200" value={speed} onChange={(e) => set({ speed: +e.target.value })} aria-label="Playback speed">
          {[0.5, 1, 1.5, 2, 3].map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
      </label>
      <ShareButton />
      <button className="btn text-xs" onClick={() => set({ helpOpen: true })} aria-label="Keyboard shortcuts (?)">?</button>
      {canSpeak && <Switch on={narrate} onChange={(v) => set({ narrate: v })}>Narrate</Switch>}
      <div className="flex min-w-48 flex-1 items-center gap-2">
        <input type="range" min={0} max={steps.length - 1} value={index} onChange={(e) => go(+e.target.value)} className="flex-1" aria-label="Timeline" aria-valuetext={steps[index]?.short} />
        <span className="w-14 text-right font-mono text-xs text-slate-400">{index + 1}/{steps.length}</span>
      </div>
    </div>
  );
}
