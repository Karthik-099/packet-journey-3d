import { useMemo, useState } from 'react';
import { cwndTrace, simulateHol } from '../lib/sim';

const Slider = ({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string }) => (
  <label className="flex flex-col gap-1 text-sm text-slate-600">
    <span className="flex justify-between"><span>{label}</span><b className="font-mono text-violet-700">{fmt(value)}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="accent-violet-600" />
  </label>
);
const Tag = () => <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">simplified model</span>;

/** HTTP/2-over-TCP vs HTTP/3-over-QUIC under packet loss. */
export function LossLab() {
  const [loss, setLoss] = useState(0.03);
  const [rtt, setRtt] = useState(80);
  const [seed, setSeed] = useState(4);
  const r = useMemo(() => simulateHol({ loss, rttMs: rtt, streams: 3, perStream: 20, window: 10, seed }), [loss, rtt, seed]);
  const max = Math.max(...r.tcp, ...r.quic, 1);
  const names = ['HTML', 'CSS', 'Image'];
  return (
    <div className="glass my-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-lg font-semibold text-ink">Loss lab: head-of-line blocking</h4>
        <Tag />
      </div>
      <p className="mt-1 text-sm text-slate-600">Three files download over one connection. Each lost packet is resent one round trip later. With TCP, every file waits for <i>any</i> missing packet before it; with QUIC, only the file that lost the packet waits.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Slider label="Packet loss" value={loss} min={0} max={0.12} step={0.005} onChange={setLoss} fmt={(v) => `${(v * 100).toFixed(1)}%`} />
        <Slider label="Round-trip time" value={rtt} min={10} max={300} step={10} onChange={setRtt} fmt={(v) => `${v} ms`} />
        <div className="flex items-end"><button className="cta-ghost w-full justify-center !py-2 text-sm" onClick={() => setSeed((s) => s + 1)}>Re-roll the dice</button></div>
      </div>
      <div className="mt-5 space-y-3">
        {names.map((n, i) => (
          <div key={n} className="grid grid-cols-[4rem_1fr] items-center gap-3 text-xs">
            <span className="font-semibold text-ink">{n}</span>
            <div className="space-y-1">
              {(['tcp', 'quic'] as const).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-28 text-slate-500">{k === 'tcp' ? 'HTTP/2 over TCP' : 'HTTP/3 over QUIC'}</span>
                  <div className="h-3 flex-1 rounded-full bg-violet-100">
                    <div className={`h-full rounded-full ${k === 'tcp' ? 'bg-gradient-to-r from-rose-400 to-orange-400' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`} style={{ width: `${(r[k][i]! / max) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-mono text-slate-600">{r[k][i]!.toFixed(0)} ms</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">{r.lost} of {r.sent} transmissions lost. At 0% loss both are identical; QUIC's advantage grows with loss and RTT (mobile, Wi-Fi, long distances).</p>
    </div>
  );
}

/** Congestion window over time. */
export function CwndChart() {
  const [loss, setLoss] = useState(0.01);
  const [seed, setSeed] = useState(2);
  const t = useMemo(() => cwndTrace(loss, 50, seed), [loss, seed]);
  const W = 640;
  const H = 180;
  const max = Math.max(...t.map((x) => x.cwnd), 20);
  const pts = t.map((x, i) => `${(i / (t.length - 1)) * W},${H - (x.cwnd / max) * (H - 10)}`).join(' ');
  return (
    <div className="glass my-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-lg font-semibold text-ink">Congestion window over 50 round trips</h4>
        <Tag />
      </div>
      <p className="mt-1 text-sm text-slate-600">TCP starts with ~10 packets in flight and doubles every round trip (slow start). On loss it cuts the window (CUBIC: ×0.7), then grows again more carefully: the classic saw-tooth.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <Slider label="Packet loss" value={loss} min={0} max={0.05} step={0.001} onChange={setLoss} fmt={(v) => `${(v * 100).toFixed(1)}%`} />
        <button className="cta-ghost !py-2 text-sm" onClick={() => setSeed((s) => s + 1)}>Re-roll</button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Congestion window chart">
        <defs>
          <linearGradient id="cw" x1="0" x2="1">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#cw)" strokeWidth={2.5} />
        {t.map((x, i) => (x.event ? <circle key={i} cx={(i / (t.length - 1)) * W} cy={H - (x.cwnd / max) * (H - 10)} r={4} fill="#e11d48" /> : null))}
      </svg>
      <p className="text-xs text-slate-500">Red dots = loss events. Peak window {max} packets ≈ {((max * 1460) / 1024).toFixed(0)} KB in flight per round trip.</p>
    </div>
  );
}

/** A more-specific prefix hijack, with and without RPKI route origin validation. */
export function BgpHijack() {
  const [attack, setAttack] = useState(false);
  const [rpki, setRpki] = useState(false);
  const hijacked = attack && !rpki;
  const box = (x: number, y: number, t: string, s: string, tone: string) => (
    <g>
      <rect x={x} y={y} width={150} height={56} rx={12} fill="white" stroke={tone} strokeWidth={2} />
      <text x={x + 75} y={y + 24} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1a1238">{t}</text>
      <text x={x + 75} y={y + 42} textAnchor="middle" fontSize={11} fill="#64748b">{s}</text>
    </g>
  );
  return (
    <div className="glass my-6 p-5">
      <h4 className="text-lg font-semibold text-ink">BGP hijack and RPKI</h4>
      <p className="mt-1 text-sm text-slate-600">
        AS64500 legitimately announces <code>203.0.113.0/24</code>. An attacker (AS64510) announces the two halves, <code>/25</code> each. Routers prefer the <b>longest prefix</b>, so the internet sends traffic to the attacker. With RPKI route origin validation, the victim's ROA says "only AS64500, max length /24", so the /25s are <b>invalid</b> and dropped.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={attack ? 'cta !py-2 text-sm' : 'cta-ghost !py-2 text-sm'} onClick={() => setAttack(!attack)}>{attack ? 'Stop the hijack' : 'Launch the hijack'}</button>
        <button className={rpki ? 'cta !py-2 text-sm' : 'cta-ghost !py-2 text-sm'} onClick={() => setRpki(!rpki)}>RPKI validation: {rpki ? 'ON' : 'OFF'}</button>
      </div>
      <svg viewBox="0 0 640 220" className="mt-4 w-full" role="img" aria-label="BGP hijack diagram">
        {box(20, 82, 'Users (AS64496)', 'pick best route', '#a78bfa')}
        {box(470, 20, 'Victim AS64500', '203.0.113.0/24', '#10b981')}
        {box(470, 144, 'Attacker AS64510', attack ? '203.0.113.0/25 + .128/25' : 'quiet', attack ? '#e11d48' : '#cbd5e1')}
        <path d="M170 100 C 320 40, 380 40, 470 48" fill="none" stroke={hijacked ? '#cbd5e1' : '#10b981'} strokeWidth={hijacked ? 2 : 5} markerEnd="url(#a)" />
        <path d="M170 120 C 320 180, 380 180, 470 172" fill="none" stroke={hijacked ? '#e11d48' : '#e2e8f0'} strokeWidth={hijacked ? 5 : 2} strokeDasharray={attack && rpki ? '6 6' : undefined} />
        <defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#10b981" /></marker></defs>
        <text x="320" y="112" textAnchor="middle" fontSize={13} fontWeight={700} fill={hijacked ? '#e11d48' : '#047857'}>
          {hijacked ? 'Traffic diverted to the attacker' : attack ? 'Hijack rejected: RPKI says INVALID' : 'Traffic reaches the real owner'}
        </text>
      </svg>
      <p className="text-xs text-slate-500">Real incidents: Pakistan Telecom took YouTube offline worldwide (2008); the 2018 MyEtherWallet DNS hijack via BGP stole cryptocurrency. RPKI adoption has grown steadily since. AS numbers and prefix here are documentation ranges (RFC 5398, RFC 5737).</p>
    </div>
  );
}
