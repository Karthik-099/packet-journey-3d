import { useState } from 'react';
import { Section } from './ui';
import { READING, TOOLS_ONLINE, VIDEOS, type Topic } from '../content/reference/resources';
import { fiberMs } from '../lib/geo';

export function Resources() {
  const topics = ['All', ...new Set(VIDEOS.map((v) => v.topic))] as ('All' | Topic)[];
  const [topic, setTopic] = useState<'All' | Topic>('All');
  const shown = topic === 'All' ? VIDEOS : VIDEOS.filter((v) => v.topic === topic);
  return (
    <Section id="resources" kicker="Watch & read" title="The best videos, books and tools">
      <p>
        {VIDEOS.length} hand-picked videos from Jim Kurose (author of the standard textbook), Computerphile, Ben Eater, Practical Networking, Chris Greer and others, ordered from basics to deep dives. Every link was checked; they open on YouTube.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter videos by topic">
        {topics.map((t) => (
          <button key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={`rounded-md border px-3 py-1 text-sm ${topic === t ? 'border-[#04121f] bg-[#04121f] text-emerald-300' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
            {t}
          </button>
        ))}
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {shown.map((v) => (
          <li key={v.id}>
            <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer noopener" className="glass group flex h-full gap-4 p-4 no-underline hover:border-teal-400">
              <span className="relative grid h-16 w-24 shrink-0 place-items-center rounded-md bg-[#04121f] text-emerald-300" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 font-mono text-[10px] text-white">{v.length}</span>
              </span>
              <span className="min-w-0">
                <span className="block font-display font-semibold leading-snug text-ink group-hover:underline">{v.title}</span>
                <span className="mt-0.5 block text-xs font-medium text-teal-700">{v.channel} · {v.topic}</span>
                <span className="mt-1 block text-[13px] leading-5 text-slate-600">{v.why}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <h3>Books, courses and articles</h3>
      <ul className="!list-none !pl-0 grid gap-2 md:grid-cols-2">
        {READING.map((r) => (
          <li key={r.url} className="glass p-4">
            <a href={r.url} target="_blank" rel="noreferrer noopener" className="font-display font-semibold text-ink hover:underline">{r.title}</a>
            <span className="text-xs text-slate-500"> · {r.by}</span>
            <p className="!mb-0 mt-1 text-sm text-slate-600">{r.what}</p>
          </li>
        ))}
      </ul>
      <h3>Live tools the professionals use</h3>
      <ul className="!list-none !pl-0 grid gap-2 md:grid-cols-2">
        {TOOLS_ONLINE.map((r) => (
          <li key={r.url} className="glass p-4">
            <a href={r.url} target="_blank" rel="noreferrer noopener" className="font-display font-semibold text-ink hover:underline">{r.title}</a>
            <p className="!mb-0 mt-1 text-sm text-slate-600">{r.what}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const num = (v: string) => Math.max(0, Number(v) || 0);
const Field = ({ label, value, set, unit }: { label: string; value: string; set: (v: string) => void; unit: string }) => (
  <label className="flex flex-col gap-1 text-sm text-slate-600">
    {label}
    <span className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-teal-500">
      <input inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="w-full bg-transparent px-3 py-2 font-mono text-ink outline-none" />
      <span className="pr-3 text-xs text-slate-400">{unit}</span>
    </span>
  </label>
);
const Out = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded-lg bg-[#04121f] px-3 py-2">
    <div className="text-[11px] uppercase tracking-wider text-slate-400">{k}</div>
    <div className="font-mono text-lg text-emerald-300">{v}</div>
  </div>
);

/** Bandwidth-delay product, transfer time, and distance → latency. */
export function Calculators() {
  const [bw, setBw] = useState('100');
  const [rtt, setRtt] = useState('120');
  const [size, setSize] = useState('500');
  const [km, setKm] = useState('8500');
  const bdpBytes = (num(bw) * 1e6 * (num(rtt) / 1000)) / 8;
  // shortcut: ideal transfer = size/bandwidth + 1 RTT setup; ignores slow start and loss (see the cwnd chart)
  const transferS = (num(size) * 8) / Math.max(num(bw), 0.001) + num(rtt) / 1000;
  const oneWay = fiberMs(num(km));
  const fmtB = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(2)} MB` : `${(b / 1e3).toFixed(1)} KB`);
  return (
    <Section id="calculators" kicker="Tools" title="Network calculators">
      <p>Three numbers every network engineer estimates in their head. Change any input.</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <div className="glass space-y-3 p-5">
          <h4 className="font-display font-semibold text-ink">Bandwidth-delay product</h4>
          <Field label="Bandwidth" value={bw} set={setBw} unit="Mbps" />
          <Field label="Round-trip time" value={rtt} set={setRtt} unit="ms" />
          <Out k="Data in flight to fill the pipe" v={fmtB(bdpBytes)} />
          <p className="!mb-0 text-xs text-slate-500">TCP's window must be at least this big to use the full link; that's why window scaling exists (max window without it: 64 KB).</p>
        </div>
        <div className="glass space-y-3 p-5">
          <h4 className="font-display font-semibold text-ink">Transfer time</h4>
          <Field label="File size" value={size} set={setSize} unit="MB" />
          <Field label="Bandwidth" value={bw} set={setBw} unit="Mbps" />
          <Out k="Best-case time" v={transferS < 120 ? `${transferS.toFixed(2)} s` : `${(transferS / 60).toFixed(1)} min`} />
          <p className="!mb-0 text-xs text-slate-500">Megabits vs megabytes: 100 Mbps moves about 12.5 MB per second. Real transfers are slower (slow start, loss, protocol overhead).</p>
        </div>
        <div className="glass space-y-3 p-5">
          <h4 className="font-display font-semibold text-ink">Distance → latency</h4>
          <Field label="Fiber distance" value={km} set={setKm} unit="km" />
          <Out k="One way / round trip" v={`${oneWay.toFixed(1)} ms / ${(2 * oneWay).toFixed(1)} ms`} />
          <p className="!mb-0 text-xs text-slate-500">Light in glass travels ~204,000 km/s. Real paths are longer than great-circle distance and add router and queueing delay, so measured RTT is higher.</p>
        </div>
      </div>
    </Section>
  );
}
