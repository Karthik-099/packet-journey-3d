import { useState } from 'react';
import { DEEP, type Deep } from '../content/reference/deep';
import { Section, See } from './ui';

function Guide({ d }: { d: Deep }) {
  return (
    <article id={`p-${d.id}`} className="glass scroll-mt-24 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="!mt-0 text-2xl font-bold tracking-tight text-ink">{d.name}</h3>
        <span className="rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-3 py-1 text-xs font-semibold text-white">{d.layer}</span>
      </header>
      <p className="mt-2 text-[15.5px] leading-7 text-slate-600">{d.summary}</p>
      <p className="mt-1 font-mono text-xs text-violet-700">{d.ports}</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-orange-600">How it works</h4>
          <ol className="mt-2 space-y-2">
            {d.how.map((h, i) => (
              <li key={i} className="flex gap-3 text-sm leading-6 text-slate-600">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 font-mono text-xs font-semibold text-violet-700">{i + 1}</span>
                {h}
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          {d.format && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-orange-600">Format / fields</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.format.map((f) => (
                  <span key={f} className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 font-mono text-[11px] text-violet-900">{f}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-orange-600">Security</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">{d.security}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-orange-600">Common problems</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">{d.issues.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-orange-600">Commands</h4>
            <div className="mt-1 space-y-1">{d.commands.map((c) => <code key={c} className="block overflow-x-auto whitespace-pre rounded-lg bg-[#1a1238] px-3 py-1.5 font-mono text-[12px] !text-violet-100">{c}</code>)}</div>
          </div>
        </div>
      </div>
      <footer className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        Spec: <span className="font-medium text-slate-700">{d.spec}</span>
        {d.see && <See step={d.see}>See it in the journey</See>}
      </footer>
    </article>
  );
}

export function DeepDives() {
  const [q, setQ] = useState('');
  const list = DEEP.filter((d) => (d.name + d.summary + d.layer + d.ports).toLowerCase().includes(q.toLowerCase()));
  return (
    <Section id="deep" kicker="Protocol guides" title="Protocols in depth">
      <p>The protocols every network and DevOps engineer meets daily, each explained the same way: how it works, what it looks like on the wire, how to secure it, what usually breaks, and the commands to debug it.</p>
      <div className="sticky top-16 z-10 my-4 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-200 bg-white/90 p-2 shadow-sm backdrop-blur">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter guides: tcp, dns, vpn, routing…" aria-label="Filter protocol guides" className="min-w-48 flex-1 rounded-xl bg-violet-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400" />
        <div className="flex flex-wrap gap-1">
          {DEEP.map((d) => (
            <a key={d.id} href={`#p-${d.id}`} className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-violet-100 hover:text-violet-800">{d.name.split(' ')[0]}</a>
          ))}
        </div>
      </div>
      <div className="space-y-5">{list.map((d) => <Guide key={d.id} d={d} />)}</div>
    </Section>
  );
}
