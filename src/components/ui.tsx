import type { ReactNode } from 'react';

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-0.5 rounded-xl border border-noc-edge bg-black/20 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-noc-cyan ${value === o.v ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-white shadow' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-200 focus-visible:outline-2 focus-visible:outline-noc-cyan">
      <span className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
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
