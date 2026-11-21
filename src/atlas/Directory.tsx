import { useState } from 'react';
import { PROVIDER_GROUPS } from '../content/reference/providers';
import { BrandLogo } from '../site/BrandLogo';

/** Who's who of the internet: clouds, ISPs, carriers, vendors, CDNs and exchanges. */
export function Directory() {
  const [tab, setTab] = useState(PROVIDER_GROUPS[0]!.id);
  const [q, setQ] = useState('');
  const group = PROVIDER_GROUPS.find((g) => g.id === tab)!;
  const items = q
    ? PROVIDER_GROUPS.flatMap((g) => g.items).filter((p, i, a) => a.findIndex((x) => x.name === p.name) === i && `${p.name} ${p.hq} ${p.asn ?? ''} ${p.note}`.toLowerCase().includes(q.toLowerCase()))
    : group.items;
  return (
    <section id="directory" className="scroll-mt-24 border-b border-slate-200 py-14">
      <h2 className="text-3xl font-bold tracking-tight text-ink">Who's who of the internet</h2>
      <p className="mt-1 text-slate-600">The companies that host, carry, connect and secure the world's traffic, with their main network numbers (ASNs).</p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PROVIDER_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setTab(g.id);
              setQ('');
            }}
            aria-pressed={tab === g.id && !q}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${tab === g.id && !q ? 'border-[#04121f] bg-[#04121f] text-emerald-300' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
          >
            {g.title} <span className="ml-1 font-mono text-xs opacity-70">{g.items.length}</span>
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: AS13335, India, firewall…" aria-label="Search companies" className="ml-auto w-64 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-teal-500" />
      </div>
      {!q && <p className="mt-3 text-sm text-slate-500">{group.blurb}</p>}
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p, i) => (
          <li key={p.name}>
            <a href={p.url} target="_blank" rel="noreferrer noopener" className="glass group flex h-full gap-3 p-4 transition hover:-translate-y-0.5 hover:border-teal-400">
              <BrandLogo name={p.name} slug={p.logo} color={p.color} />
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  {!q && tab === 'cloud' && <span className="font-mono text-[11px] text-slate-400">{String(i + 1).padStart(2, '0')}</span>}
                  <span className="truncate font-display font-semibold text-ink">{p.name}</span>
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-teal-700">{p.hq}{p.asn ? ` · ${p.asn}` : ''}</span>
                <span className="mt-1 block text-[13px] leading-5 text-slate-600">{p.note}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-slate-500">Logos: Simple Icons (CC0 icon data). Some companies don't permit their marks in open icon sets; those show a monogram. All trademarks belong to their owners. Ranking order for cloud follows market share where published.</p>
    </section>
  );
}
