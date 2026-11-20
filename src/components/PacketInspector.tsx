import { useState } from 'react';
import type { Field, Inspection } from '../lib/inspect';
import { bin, hex } from '../lib/bytes';
import { Seg } from './ui';

function Row({ f, depth, sel, onSel }: { f: Field; depth: number; sel: Field | null; onSel: (f: Field) => void }) {
  const [open, setOpen] = useState(depth === 0);
  const kids = f.children?.length;
  return (
    <li>
      <div
        className={`flex cursor-pointer items-start gap-1 rounded px-1 py-0.5 font-mono text-[11px] leading-snug hover:bg-white/5 ${sel === f ? 'bg-noc-cyan/15 text-noc-cyan' : ''}`}
        style={{ paddingLeft: depth * 12 + 4 }}
        onClick={() => {
          onSel(f);
          if (kids) setOpen(!open);
        }}
        role="treeitem"
        aria-expanded={kids ? open : undefined}
        aria-selected={sel === f}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSel(f);
            if (kids) setOpen(!open);
          }
        }}
      >
        <span className="w-3 shrink-0 text-slate-500">{kids ? (open ? '▾' : '▸') : ''}</span>
        <span className="text-slate-300">{f.name}</span>
        {f.value && <span className="text-slate-400">: {f.value}</span>}
      </div>
      {kids && open && (
        <ul role="group">
          {f.children!.map((c, i) => (
            <Row key={i} f={c} depth={depth + 1} sel={sel} onSel={onSel} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PacketInspector({ data }: { data: Inspection }) {
  const [sel, setSel] = useState<Field | null>(null);
  const [view, setView] = useState<'hex' | 'bin'>('hex');
  const b = data.bytes;
  const per = view === 'hex' ? 16 : 4;
  const [s, e] = sel?.range ?? [-1, -1];
  const rows = b ? Math.ceil(b.length / per) : 0;
  return (
    <div className="overflow-hidden rounded-md border border-noc-edge bg-black/40">
      <div className="flex items-center justify-between border-b border-noc-edge px-2 py-1">
        <span className="font-mono text-[11px] text-noc-green">{data.title}{b ? ` · ${b.length} bytes` : ''}</span>
        {b && <Seg label="Byte view" value={view} onChange={setView} options={[{ v: 'hex', l: 'Hex' }, { v: 'bin', l: 'Binary' }]} />}
      </div>
      <ul role="tree" aria-label="Header tree" className="max-h-56 overflow-auto py-1">
        {data.tree.map((f, i) => (
          <Row key={data.title + i} f={f} depth={0} sel={sel} onSel={setSel} />
        ))}
      </ul>
      {b && (
        <div className="max-h-48 overflow-auto border-t border-noc-edge p-2 font-mono text-[11px] leading-5" aria-label={`${view} dump`}>
          {Array.from({ length: rows }, (_, r) => {
            const off = r * per;
            const slice = Array.from(b.subarray(off, off + per));
            return (
              <div key={r} className="flex gap-3 whitespace-nowrap">
                <span className="text-slate-600">{off.toString(16).padStart(4, '0')}</span>
                <span className="flex gap-1">
                  {slice.map((x, i) => {
                    const at = off + i;
                    return (
                      <span key={i} className={at >= s && at < e ? 'rounded-sm bg-noc-cyan/25 text-noc-cyan' : 'text-slate-300'}>
                        {view === 'hex' ? hex(x) : bin(x)}
                      </span>
                    );
                  })}
                </span>
                {view === 'hex' && (
                  <span className="text-slate-500">
                    {slice.map((x, i) => (
                      <span key={i} className={off + i >= s && off + i < e ? 'text-noc-cyan' : ''}>
                        {x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : '.'}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="border-t border-noc-edge px-2 py-1 text-[10px] text-slate-500">Click a field to highlight its bytes.</p>
    </div>
  );
}
