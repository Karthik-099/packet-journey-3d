import type { Dissected } from '../lib/pcap';

const ARROW: Record<string, string> = { ARP: '#d97706', DNS: '#0284c7', TCP: '#2563eb', HTTP: '#059669', TLS: '#0891b2', ICMP: '#0e7490', ICMPv6: '#0e7490', QUIC: '#e11d48' };
const MAX_HOSTS = 6;
const WINDOW = 40;

/** Sequence diagram: every host is a column, every packet an arrow from sender to receiver. */
export function Ladder({ packets, sel, onSelect, t0 }: { packets: Dissected[]; sel: number; onSelect: (i: number) => void; t0: number }) {
  const at = Math.max(0, packets.findIndex((p) => p.no - 1 === sel));
  const start = Math.max(0, Math.min(at - 8, packets.length - WINDOW));
  const rows = packets.slice(start, start + WINDOW);
  const hosts: string[] = [];
  for (const p of rows) for (const h of [p.src, p.dst]) if (h && !hosts.includes(h) && hosts.length < MAX_HOSTS) hosts.push(h);
  const col = (h: string) => { const i = hosts.indexOf(h); return i < 0 ? hosts.length - 1 : i; };
  const x = (i: number) => ((i + 0.5) / hosts.length) * 100;
  if (!rows.length) return null;
  return (
    <div className="glass p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">Who talks to whom</h3>
        <p className="text-xs text-slate-500">Packets {rows[0]!.no}–{rows.at(-1)!.no} of {packets.length} · each arrow is one packet, sender → receiver · click to inspect</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${hosts.length}, minmax(0, 1fr))` }}>
            {hosts.map((h) => (
              <div key={h} className="truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-mono text-[11px] font-semibold text-ink" title={h}>{h}</div>
            ))}
          </div>
          <div className="relative mt-1">
            {hosts.map((h, i) => <div key={h} aria-hidden className="absolute inset-y-0 w-px bg-slate-300" style={{ left: `${x(i)}%` }} />)}
            {rows.map((p) => {
              const a = x(col(p.src)), b = x(col(p.dst));
              const left = Math.min(a, b), w = Math.max(Math.abs(b - a), 0.5);
              const c = ARROW[p.proto] ?? '#64748b';
              const on = p.no - 1 === sel;
              return (
                <button key={p.no} onClick={() => onSelect(p.no - 1)} aria-label={`Packet ${p.no}: ${p.src} to ${p.dst}, ${p.proto} ${p.info}`}
                  className={`relative block h-9 w-full rounded text-left transition ${on ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                  <span className="absolute left-1 top-0.5 font-mono text-[10px] text-slate-400">{(p.ts - t0).toFixed(3)}</span>
                  <span className="absolute h-0.5" style={{ left: `${left}%`, width: `${w}%`, top: 22, background: c }} />
                  <span className="absolute h-0 w-0 border-y-[5px] border-y-transparent" style={b >= a
                    ? { left: `calc(${b}% - 7px)`, top: 18, borderLeft: `7px solid ${c}` }
                    : { left: `${b}%`, top: 18, borderRight: `7px solid ${c}` }} />
                  <span className="absolute -translate-x-1/2 truncate whitespace-nowrap px-1 font-mono text-[10.5px] text-slate-600" style={{ left: `${(a + b) / 2}%`, top: 3, maxWidth: `${Math.max(w, 30)}%` }}>
                    <b style={{ color: c }}>{p.proto}</b> {p.info}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const SEG = ['#2563eb', '#0891b2', '#059669', '#d97706', '#e11d48', '#7c8ea3'];

/** How many bytes each layer adds to this one packet. */
export function LayerBar({ p }: { p: Dissected }) {
  const top = p.inspection.tree.slice(1).filter((f) => f.range);
  const segs = top.map((f, i) => {
    const s = f.range![0];
    const e = i + 1 < top.length ? top[i + 1]!.range![0] : f.range![1];
    return { name: f.name.split(/[,:(]/)[0]!.trim(), bytes: Math.max(0, e - s) };
  }).filter((s) => s.bytes > 0);
  const total = p.len || 1;
  return (
    <div className="glass p-4">
      <div className="flex justify-between text-xs text-slate-500"><span className="font-semibold text-ink">Packet {p.no}: where the {p.len} bytes go</span><span>outer layer → inner</span></div>
      <div className="mt-2 flex h-7 overflow-hidden rounded-md">
        {segs.map((s, i) => (
          <div key={i} title={`${s.name}: ${s.bytes} bytes`} className="grid min-w-[3px] place-items-center truncate px-1 font-mono text-[10px] font-semibold text-white" style={{ width: `${(s.bytes / total) * 100}%`, background: SEG[i % SEG.length] }}>
            {s.bytes / total > 0.08 ? s.bytes : ''}
          </div>
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {segs.map((s, i) => <li key={i} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEG[i % SEG.length] }} />{s.name} <span className="font-mono text-slate-400">{s.bytes} B</span></li>)}
      </ul>
    </div>
  );
}
