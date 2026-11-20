import { JOURNEYS } from '../content';
import { useCtx, useStore } from '../store';
import { Seg, Switch } from './ui';

const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6'];

export function LatencyBar() {
  const { index, access, dest, quic, set, go } = useStore();
  const c = useCtx();
  const steps = JOURNEYS.google.steps;
  const ms = steps.map((s) => s.latencyMs?.(c) ?? 0);
  const total = ms.reduce((a, b) => a + b, 0);
  const sofar = ms.slice(0, index + 1).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-1.5 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="h-label">Latency budget</span>
        <div className="flex flex-wrap items-center gap-3">
          <Seg label="Your connection" value={access} onChange={(a) => set({ access: a })} options={[{ v: 'fiber', l: 'Fiber' }, { v: 'leo', l: 'LEO satellite' }, { v: 'geo', l: 'GEO satellite' }]} />
          {c.target.cdn && <Seg label="Destination" value={dest} onChange={(d) => set({ dest: d })} options={[{ v: 'edge', l: `${c.target.cdn} edge` }, { v: 'origin', l: 'Geo-IP location' }]} />}
          <Switch on={quic} onChange={(v) => set({ quic: v })}>HTTP/3</Switch>
          <span className="font-mono">
            <span className="text-noc-cyan">{sofar.toFixed(1)}</span> <span className="text-slate-500">/ {total.toFixed(0)} ms</span>
          </span>
        </div>
      </div>
      <div className="flex h-3 overflow-hidden rounded-sm bg-black/40" role="img" aria-label={`Latency so far ${sofar.toFixed(0)} of ${total.toFixed(0)} milliseconds`}>
        {ms.map((m, i) =>
          m > 0 ? (
            <button
              key={i}
              title={`${steps[i]!.short}: ${m.toFixed(1)} ms`}
              onClick={() => go(i)}
              style={{ width: `${(m / total) * 100}%`, background: COLORS[i % COLORS.length], opacity: i <= index ? 1 : 0.2 }}
              className={`h-full border-r border-black/60 ${i === index ? 'outline outline-2 outline-white' : ''}`}
              aria-label={`${steps[i]!.short} ${m.toFixed(1)} ms`}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
