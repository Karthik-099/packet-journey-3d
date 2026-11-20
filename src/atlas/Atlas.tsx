import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Footer, Nav, links } from '../site/Nav';
import { Icon } from '../site/Icon';
import { CLOUD_SHARE, EDGE_NETWORKS, FACT_GROUPS, RATES, TIER1, WEBSERVER_SHARE, type Fact } from '../content/reference/atlas';
import { LINKS, HUBS, hubById } from '../content/network';
import { PORTS } from '../content/reference/ports';
import { HTTP_STATUS } from '../content/reference/http-status';
import { PROTOCOLS } from '../content/reference/protocols';
import { DEEP } from '../content/reference/deep';
import { CONCEPTS } from '../content/concepts';
import { pathKm } from '../lib/geo';

const HeroGlobe = lazy(() => import('../landing/HeroGlobe'));

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** "Since you opened this page": counts up from real per-second rates. */
function LiveCounters() {
  const t0 = useRef(performance.now());
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const tick = () => {
      setSecs((performance.now() - t0.current) / 1000);
      raf = requestAnimationFrame(tick);
    };
    if (reduced) {
      const i = setInterval(() => setSecs((performance.now() - t0.current) / 1000), 1000);
      return () => clearInterval(i);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
      {RATES.map((r) => (
        <div key={r.label} className="bg-[#04121f] p-5">
          <div className="font-mono text-3xl font-semibold tabular-nums text-emerald-300">{fmt(r.perSecond * secs)}</div>
          <div className="mt-1 text-sm text-slate-300">{r.label}</div>
          <div className="mt-2 text-[11px] text-slate-500">
            {r.basis} · <a className="underline decoration-slate-600 hover:text-slate-300" href={r.url} target="_blank" rel="noreferrer noopener">{r.source}, {r.asOf}</a>
          </div>
        </div>
      ))}
    </div>
  );
}

function FactCard({ f }: { f: Fact }) {
  return (
    <div className="glass flex flex-col p-5">
      <div className="font-display text-3xl font-bold tracking-tight text-ink">{f.value}</div>
      <div className="mt-1 text-[15px] font-medium text-slate-700">{f.label}</div>
      {f.note && <p className="mt-2 text-sm leading-6 text-slate-500">{f.note}</p>}
      <a href={f.url} target="_blank" rel="noreferrer noopener" className="mt-auto pt-3 text-[11px] font-medium uppercase tracking-wider text-teal-700 hover:underline">
        {f.source} · {f.asOf}
      </a>
    </div>
  );
}

function Bars({ title, data }: { title: string; data: typeof CLOUD_SHARE }) {
  const max = Math.max(...data.rows.map((r) => r.pct));
  return (
    <div className="glass p-6">
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <ul className="mt-4 space-y-3">
        {data.rows.map((r) => (
          <li key={r.name}>
            <div className="flex justify-between text-sm text-slate-700"><span>{r.name}</span><span className="font-mono font-semibold">{r.pct}%</span></div>
            <div className="mt-1 h-2.5 rounded-sm bg-slate-100">
              <div className="h-full rounded-sm bg-gradient-to-r from-teal-500 to-cyan-400" style={{ width: `${(r.pct / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <a href={data.url} target="_blank" rel="noreferrer noopener" className="mt-4 block text-[11px] font-medium uppercase tracking-wider text-teal-700 hover:underline">{data.source} · {data.asOf}</a>
    </div>
  );
}

export function Atlas() {
  const subsea = LINKS.filter((l) => l.kind === 'subsea');
  const modelKm = subsea.reduce((n, l) => n + pathKm([hubById(l.a).at, ...(l.via ?? []), hubById(l.b).at]), 0);
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;
  const toc = [...FACT_GROUPS.map((g) => [g.id, g.title] as const), ['providers', 'Top providers'] as const, ['catalog', 'Everything in this project'] as const];
  return (
    <div className="site-bg">
      <Nav active="atlas" />
      <main>
        <section className="hero-dark relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 pb-12 pt-14 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative z-10">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Internet Atlas</p>
              <h1 className="mt-4 text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl">The internet, by the numbers.</h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
                Cables, satellites, data centers, exchanges, routes, names and the traffic flowing through them, with every number linked to its source and date. Where sources disagree, we say so.
              </p>
              <nav className="mt-6 flex flex-wrap gap-2 text-xs" aria-label="Atlas sections">
                {toc.map(([id, t]) => (
                  <a key={id} href={`#${id}`} className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-slate-200 hover:bg-white/15">{t}</a>
                ))}
              </nav>
            </div>
            <div className="relative h-[380px] sm:h-[460px]">
              {wide ? (
                <Suspense fallback={<div className="absolute inset-16 animate-pulse rounded-full bg-teal-500/20" />}>
                  <HeroGlobe labels />
                </Suspense>
              ) : (
                <div className="absolute inset-12 rounded-full bg-gradient-to-br from-teal-500/40 to-cyan-400/30 shadow-[0_0_120px_rgba(45,212,191,.4)]" />
              )}
              <p className="absolute bottom-1 right-2 text-[11px] text-slate-400">{HUBS.length} hubs and {subsea.length} cable corridors from this project's network model</p>
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-5 pb-14">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Since you opened this page</h2>
            <LiveCounters />
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5">
          {FACT_GROUPS.map((g) => (
            <section key={g.id} id={g.id} className="scroll-mt-24 border-b border-slate-200 py-14">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-ink">{g.title}</h2>
                  <p className="mt-1 text-slate-600">{g.blurb}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.facts.map((f) => <FactCard key={f.label} f={f} />)}
              </div>
            </section>
          ))}

          <section id="providers" className="scroll-mt-24 border-b border-slate-200 py-14">
            <h2 className="text-3xl font-bold tracking-tight text-ink">Top providers</h2>
            <p className="mt-1 text-slate-600">Who carries, hosts and serves most of it.</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <Bars title="Cloud infrastructure market share" data={CLOUD_SHARE} />
              <Bars title="Web servers on active sites" data={WEBSERVER_SHARE} />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div className="glass overflow-x-auto p-6" tabIndex={0} role="region" aria-label="Edge networks">
                <h3 className="text-lg font-bold text-ink">The biggest edge networks</h3>
                <table className="tbl mt-3">
                  <thead><tr><th>Network</th><th>Footprint</th><th>Notable</th></tr></thead>
                  <tbody>
                    {EDGE_NETWORKS.map((e) => (
                      <tr key={e.name}>
                        <td className="font-semibold text-ink"><a href={e.url} target="_blank" rel="noreferrer noopener" className="hover:underline">{e.name}</a></td>
                        <td>{e.footprint}</td>
                        <td className="text-slate-500">{e.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-[11px] text-slate-500">Footprints are as published by each company.</p>
              </div>
              <div className="glass p-6">
                <h3 className="text-lg font-bold text-ink">Tier-1 networks</h3>
                <p className="mt-1 text-sm text-slate-600">Reach every other network through peering alone, buying no transit. There's no official list; these are the commonly cited ones.</p>
                <ul className="mt-3 grid grid-cols-1 gap-1.5 font-mono text-[13px] text-slate-700 sm:grid-cols-2">
                  {TIER1.map((t) => <li key={t} className="rounded-md border border-slate-200 bg-white px-2 py-1">{t}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section id="catalog" className="scroll-mt-24 py-14">
            <h2 className="text-3xl font-bold tracking-tight text-ink">Everything in this project</h2>
            <p className="mt-1 text-slate-600">The reference material behind Packet Journey, one click away.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { n: PORTS.length, t: 'ports explained', h: `${links.learn}#ports`, i: 'terminal' as const },
                { n: HTTP_STATUS.length, t: 'HTTP status codes with real-world causes', h: `${links.learn}#http`, i: 'activity' as const },
                { n: PROTOCOLS.length, t: 'protocols in the directory', h: `${links.learn}#protocols`, i: 'layers' as const },
                { n: DEEP.length, t: 'in-depth protocol guides', h: `${links.learn}#deep`, i: 'search' as const },
                { n: CONCEPTS.length, t: 'glossary concepts', h: `${links.learn}#glossary`, i: 'cap' as const },
                { n: subsea.length, t: `submarine cable corridors modelled (${fmt(modelKm)} km)`, h: `${links.app}#g-core`, i: 'route' as const },
              ].map((c) => (
                <a key={c.t} href={c.h} className="glass group flex items-center gap-4 p-5 hover:border-teal-400">
                  <span className="icon-tile shrink-0"><Icon name={c.i} /></span>
                  <span>
                    <span className="block font-display text-3xl font-bold text-ink">{c.n}</span>
                    <span className="text-sm text-slate-600">{c.t} <span className="inline-block transition group-hover:translate-x-1">→</span></span>
                  </span>
                </a>
              ))}
            </div>
            <p className="mt-8 text-sm text-slate-500">
              Figures describe the date shown next to each one; the internet grows every day. Corrections and newer sources are welcome via the project's GitHub issues.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
