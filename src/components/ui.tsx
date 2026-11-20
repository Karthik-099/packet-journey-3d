import type { ReactNode } from 'react';

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-md border border-noc-edge">
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`px-2.5 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-noc-cyan ${value === o.v ? 'bg-noc-cyan/15 text-noc-cyan' : 'text-slate-400 hover:text-slate-100'}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="inline-flex items-center gap-2 text-xs text-slate-300 focus-visible:outline-2 focus-visible:outline-noc-cyan">
      <span className={`relative h-4 w-7 rounded-full transition ${on ? 'bg-noc-cyan/70' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      {children}
    </button>
  );
}

export const Simplified = ({ note }: { note: string }) => (
  <span className="chip cursor-help border-noc-amber/50 text-noc-amber" title={note} tabIndex={0} aria-label={`Simplified: ${note}`}>
    simplified
  </span>
);

export const Section = ({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) => (
  <section className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <h3 className="h-label">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);
