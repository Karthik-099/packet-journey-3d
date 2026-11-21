import { useMemo, useRef, useState, type ReactNode } from 'react';
import { links } from '../site/Nav';
import { toMarkdown } from '../lib/markdown';

/** Copies an element's content as Markdown. */
export function CopyMarkdown({ target, label = 'Copy as Markdown' }: { target: () => HTMLElement | null; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const el = target();
        if (!el) return;
        await navigator.clipboard.writeText(toMarkdown(el));
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-ink print:hidden"
      aria-live="polite"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

export function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} id={id} className="scroll-mt-24 border-b border-blue-100 py-14">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{kicker}</div>
        <CopyMarkdown target={() => ref.current} />
      </div>
      <h2 className="mt-2 text-3xl font-bold text-ink">{title}</h2>
      <div className="prose-net mt-6">{children}</div>
    </section>
  );
}

export const Card = ({ title, children, tone = 'cyan' }: { title: string; children: ReactNode; tone?: 'cyan' | 'violet' | 'emerald' | 'amber' }) => {
  const c = { cyan: 'text-blue-600', violet: 'text-cyan-600', emerald: 'text-emerald-600', amber: 'text-amber-600' }[tone];
  return (
    <div className="glass p-5">
      <h4 className={`mb-2 font-semibold ${c}`}>{title}</h4>
      <div className="text-sm leading-relaxed text-slate-600 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4">{children}</div>
    </div>
  );
};

export const Grid = ({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) => <div className={`my-4 grid gap-4 ${cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>{children}</div>;

/** "See it in 3D" deep link into the journey */
export const See = ({ step, children }: { step: string; children: ReactNode }) => (
  <a href={`${links.app}#${step}`} className="ml-1 inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 no-underline hover:bg-blue-100">
    {children} →
  </a>
);

/** Searchable table */
export function FilterTable<T>({ rows, cols, placeholder, text }: { rows: T[]; cols: { h: string; cell: (r: T) => ReactNode; cls?: string }[]; placeholder: string; text: (r: T) => string }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => rows.filter((r) => text(r).toLowerCase().includes(q.toLowerCase())), [rows, q, text]);
  return (
    <div className="glass my-4 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-blue-200/70 px-3 py-2">
        
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="w-full bg-transparent py-1 text-sm text-ink outline-none placeholder:text-slate-400" />
        <span className="whitespace-nowrap text-xs text-slate-500">{shown.length} / {rows.length}</span>
      </div>
      <div className="max-h-[32rem] overflow-auto" tabIndex={0} role="region" aria-label={placeholder}>
        <table className="tbl">
          <thead className="sticky top-0 bg-white">
            <tr>{cols.map((c) => <th key={c.h}>{c.h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>{cols.map((c) => <td key={c.h} className={c.cls}>{c.cell(r)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const Simple = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="glass my-4 overflow-x-auto" tabIndex={0} role="region" aria-label={head.join(', ')}>
    <table className="tbl">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

/** Text "diagram": a row of labelled boxes joined by arrows (no images). */
export const Flow = ({ steps }: { steps: string[] }) => (
  <div className="my-4 flex flex-wrap items-center gap-2">
    {steps.map((s, i) => (
      <span key={i} className="flex items-center gap-2">
        {i > 0 && <span className="text-slate-500">→</span>}
        <span className="rounded-lg border border-blue-200/70 bg-blue-50 px-3 py-1.5 text-sm text-slate-700">{s}</span>
      </span>
    ))}
  </div>
);
