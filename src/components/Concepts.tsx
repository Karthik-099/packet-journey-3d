import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CONCEPTS } from '../content/concepts';
import { useStore } from '../store';
import { cidrInfo, isValidIp } from '../lib/cidr';

function CidrCalc() {
  const [ip, setIp] = useState('192.168.1.10');
  const [p, setP] = useState(24);
  const ok = isValidIp(ip);
  const i = ok ? cidrInfo(ip, p) : null;
  return (
    <div className="rounded-md border border-noc-cyan/40 bg-black/30 p-3 text-xs">
      <h3 className="h-label mb-2 text-noc-cyan">Subnet / CIDR calculator</h3>
      <div className="flex items-center gap-1 font-mono">
        <input value={ip} onChange={(e) => setIp(e.target.value.trim())} aria-label="IPv4 address" aria-invalid={!ok} className={`w-36 rounded border bg-black/40 px-2 py-1 ${ok ? 'border-noc-edge' : 'border-noc-rose'}`} />
        /<input type="number" min={0} max={32} value={p} onChange={(e) => setP(Math.max(0, Math.min(32, +e.target.value || 0)))} aria-label="Prefix length" className="w-14 rounded border border-noc-edge bg-black/40 px-2 py-1" />
      </div>
      {i ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
          {(
            [
              ['type', i.kind],
              ['network', i.network],
              ['netmask', i.mask],
              ['wildcard', i.wildcard],
              ['broadcast', i.broadcast],
              ['hosts', `${i.first} – ${i.last}`],
              ['usable', i.usable.toLocaleString()],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-slate-200">{v}</dd></div>
          ))}
          <dt className="text-slate-500">bits</dt>
          <dd className="break-all">
            <span className="text-noc-cyan">{i.ipBits.slice(0, p)}</span>
            <span className="text-noc-amber">{i.ipBits.slice(p)}</span>
            <div className="font-sans text-[10px] text-slate-500"><span className="text-noc-cyan">network bits</span> · <span className="text-noc-amber">host bits</span></div>
          </dd>
        </dl>
      ) : (
        <p className="mt-2 text-noc-rose">Enter a valid IPv4 address.</p>
      )}
    </div>
  );
}

export function Concepts() {
  const open = useStore((s) => s.conceptsOpen);
  const set = useStore((s) => s.set);
  const [q, setQ] = useState('');
  const list = CONCEPTS.filter((c) => (c.term + c.short + (c.aka ?? '')).toLowerCase().includes(q.toLowerCase()));
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.2 }}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-noc-edge bg-noc-bg/95 backdrop-blur"
          role="dialog"
          aria-label="Networking concepts"
        >
          <div className="flex items-center gap-2 border-b border-noc-edge p-3">
            <h2 className="font-semibold text-white">Concepts</h2>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search: subnet, BGP, endpoint…" className="flex-1 rounded border border-noc-edge bg-black/40 px-2 py-1 text-sm" aria-label="Search concepts" autoFocus />
            <button className="btn" onClick={() => set({ conceptsOpen: false })} aria-label="Close concepts">✕</button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-3">
            <CidrCalc />
            {list.map((c) => (
              <details key={c.id} className="rounded-md border border-noc-edge bg-noc-panel p-3">
                <summary className="cursor-pointer">
                  <span className="font-semibold text-white">{c.term}</span>
                  {c.aka && <span className="ml-2 text-[11px] text-slate-500">{c.aka}</span>}
                  <p className="mt-1 text-[13px] text-slate-300">{c.short}</p>
                </summary>
                <div className="mt-2 space-y-2 text-[13px] text-slate-400">
                  {c.body.map((b, i) => <p key={i}>{b}</p>)}
                  {c.example && <p className="font-mono text-[11px] text-noc-cyan">{c.example}</p>}
                </div>
              </details>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
