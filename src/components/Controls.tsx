import { JOURNEYS } from '../content';
import { useStore } from '../store';

export function Controls() {
  const { journey, index, playing, speed, set, next, prev, go } = useStore();
  const steps = JOURNEYS[journey].steps;
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <button className="btn" onClick={prev} disabled={index === 0} aria-label="Previous step (←)">◀ Prev</button>
      <button className={`btn w-24 ${playing ? 'btn-on' : ''}`} onClick={() => set({ playing: !playing })} aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <button className="btn" onClick={next} disabled={index === steps.length - 1} aria-label="Next step (→)">Next ▶</button>
      <label className="flex items-center gap-1 text-xs text-slate-400">
        speed
        <select className="rounded border border-noc-edge bg-noc-panel px-1 py-1 text-slate-200" value={speed} onChange={(e) => set({ speed: +e.target.value })} aria-label="Playback speed">
          {[0.5, 1, 1.5, 2, 3].map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
      </label>
      <div className="flex min-w-48 flex-1 items-center gap-2">
        <input type="range" min={0} max={steps.length - 1} value={index} onChange={(e) => go(+e.target.value)} className="flex-1" aria-label="Timeline" aria-valuetext={steps[index]?.short} />
        <span className="w-14 text-right font-mono text-xs text-slate-400">{index + 1}/{steps.length}</span>
      </div>
    </div>
  );
}
