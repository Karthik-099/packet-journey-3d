import { useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex, search } from './searchIndex';

/** Site-wide search (Ctrl+K / ⌘K). Works the same on every page. */
export function Search({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const index = useMemo(() => (open ? buildIndex() : []), [open]);
  const hits = useMemo(() => search(index, q), [index, q]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
    else setQ('');
  }, [open]);
  useEffect(() => setSel(0), [q]);
  const go = (href: string) => {
    setOpen(false);
    location.href = href;
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${dark ? 'border-noc-edge bg-noc-panel text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-ink'}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2" /></svg>
        <span>Search</span>
        <kbd aria-hidden className="hidden rounded border border-current/30 px-1 font-mono text-[10px] opacity-70 lg:inline">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#020812]/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Search" className="keep-dark w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-[#04121f] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSel((s) => Math.min(s + 1, hits.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSel((s) => Math.max(s - 1, 0));
                } else if (e.key === 'Enter' && hits[sel]) go(hits[sel].href);
              }}
              placeholder="Search ports, status codes, protocols, steps, companies…  e.g. 502, port 443, bgp, airtel"
              aria-label="Search"
              className="w-full border-b border-slate-700 bg-transparent px-5 py-4 font-mono text-[15px] text-white outline-none placeholder:text-slate-500"
            />
            <ul className="max-h-[55vh] overflow-auto py-2" role="listbox" aria-label="Results">
              {q && !hits.length && <li className="px-5 py-3 text-sm text-slate-400">No results for "{q}".</li>}
              {!q && <li className="px-5 py-3 text-sm text-slate-400">{'Type to search everything: 23+16 journey steps, 110 ports, 72 status codes, 61 protocols, guides, glossary, internet facts and companies.'}</li>}
              {hits.map((h, i) => (
                <li key={h.kind + h.title + i} role="option" aria-selected={i === sel}>
                  <a href={h.href} onMouseEnter={() => setSel(i)} onClick={(e) => { e.preventDefault(); go(h.href); }} className={`block px-5 py-2.5 ${i === sel ? 'bg-emerald-400/10' : ''}`}>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-display font-semibold text-white">{h.title}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-emerald-300">{h.kind}</span>
                    </span>
                    <span className="block truncate text-xs text-slate-400">{h.sub}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-700 px-5 py-2 font-mono text-[10px] text-slate-500">↑ ↓ to move · Enter to open · Esc to close</div>
          </div>
        </div>
      )}
    </>
  );
}
