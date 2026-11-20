import { OSI } from '../content';
import { useCtx, useStep, useStore } from '../store';
import { LAYER_COLORS } from './colors';
import { WorldMap } from '../components/WorldMap';
import { NET, serverIp, wanIp } from '../content/journey-google';

const DEPTH: Record<string, number> = { Data: 0, Segment: 1, Packet: 2, Frame: 3, Bits: 4 };

/** Lightweight 2.5D view for phones / low-power devices / no WebGL. */
export function Scene2D() {
  const step = useStep();
  const c = useCtx();
  const journey = useStore((s) => s.journey);
  const set = useStore((s) => s.set);
  if (journey === 'hi') {
    const d = DEPTH[step.pdu ?? 'Data'] ?? 0;
    const stack = (side: 'sender' | 'receiver') => (
      <div className="flex flex-col gap-1" style={{ transform: 'perspective(600px) rotateX(18deg) rotateY(' + (side === 'sender' ? 12 : -12) + 'deg)' }}>
        <div className="text-center font-mono text-[10px] text-noc-cyan">{side}</div>
        {OSI.map((l) => {
          const on = step.side === side && step.layer === l.n;
          return (
            <button key={l.n} onClick={() => set({ tip: `${side}-${l.n}` })} className="rounded px-2 py-1 text-left font-mono text-[10px] text-white transition" style={{ background: LAYER_COLORS[l.n] + (on ? 'ee' : '44'), boxShadow: on ? `0 0 16px ${LAYER_COLORS[l.n]}` : undefined }}>
              L{l.n} {l.name}
            </button>
          );
        })}
      </div>
    );
    const shells = ['#fbbf24', '#34d399', '#22d3ee'].slice(3 - Math.min(3, d));
    return (
      <div className="scanlines flex h-full items-center justify-around gap-2 p-4">
        {stack('sender')}
        <div className="flex flex-col items-center gap-2">
          {d >= 4 ? (
            <div className="font-mono text-xs text-noc-amber">{c.hi.wire.length * 8} bits ⟶</div>
          ) : (
            <div className="flex items-center justify-center">
              {shells.reduceRight<React.ReactNode>(
                (inner, col) => <div className="rounded p-2" style={{ border: `2px solid ${col}`, background: col + '15' }}>{inner}</div>,
                <div className={`rounded px-2 py-1 font-mono text-xs ${c.tls ? 'bg-violet-400/80' : 'bg-amber-200 text-black'}`}>{c.message.slice(0, 6) || '∅'}</div>,
              )}
            </div>
          )}
          <span className="chip border-noc-green/50 text-noc-green">{step.pdu}</span>
          <div className="h-1 w-24 rounded bg-gradient-to-r from-amber-400 via-cyan-400 to-amber-400" />
        </div>
        {stack('receiver')}
      </div>
    );
  }
  const stations = [
    ['laptop', 'You', NET.laptop],
    ['router', 'Router/NAT', wanIp(c)],
    ['dns-resolver', 'DNS', '8.8.8.8'],
    ['isp', 'ISP', c.me?.asn ?? 'BGP'],
    ['globe', 'Core', c.route.legs.some((l) => l.kind === 'subsea') ? 'subsea' : 'land'],
    ['google', c.target.domain, serverIp(c)],
  ] as const;
  const at = stations.findIndex(([k]) => step.focus === k || (k === 'laptop' && ['keyboard', 'browser', 'screen'].includes(step.focus)) || (k === 'dns-resolver' && step.focus.startsWith('dns')) || (k === 'router' && step.focus === 'wifi'));
  return (
    <div className="scanlines flex h-full flex-col justify-center gap-3 p-3">
      <ol className="flex items-center justify-between gap-1">
        {stations.map(([k, n, ip], i) => (
          <li key={k} className="flex flex-1 flex-col items-center">
            <button onClick={() => set({ tip: k })} className={`h-10 w-10 rounded-lg border transition ${i === at ? 'border-noc-cyan bg-noc-cyan/20 shadow-[0_0_16px] shadow-noc-cyan' : 'border-noc-edge bg-noc-panel'}`} aria-label={n} />
            <span className="mt-1 text-[10px] text-slate-300">{n}</span>
            <span className="font-mono text-[9px] text-slate-500">{ip}</span>
          </li>
        ))}
      </ol>
      {['globe', 'google', 'isp'].includes(step.focus) && <WorldMap route={c.route} home={c.home} dest={c.destPoint} progress={1} />}
    </div>
  );
}
