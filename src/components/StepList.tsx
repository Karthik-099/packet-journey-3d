import { JOURNEYS, OSI } from '../content';
import { useCtx, useStore } from '../store';

export function StepList() {
  const { journey, index, go, tcpip } = useStore();
  const c = useCtx();
  const steps = JOURNEYS[journey].steps;
  let t = 0;
  return (
    <nav aria-label="Steps" className="p-2">
      <ol className="space-y-0.5">
        {steps.map((s, i) => {
          t += s.latencyMs?.(c) ?? 0;
          const l = s.layer && OSI.find((x) => x.n === s.layer);
          return (
            <li key={s.id}>
              <a
                href={'#' + s.id}
                onClick={(e) => {
                  e.preventDefault();
                  go(i);
                }}
                aria-current={i === index ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition ${i === index ? 'bg-gradient-to-r from-emerald-500/25 to-cyan-400/10 text-white ring-1 ring-emerald-400/50' : i < index ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-white/5'}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i === index ? 'bg-noc-cyan shadow-[0_0_8px] shadow-noc-cyan' : i < index ? 'bg-noc-green' : 'bg-slate-700'}`} />
                <span className="flex-1 truncate">{s.short}</span>
                {l && tcpip && <span className="font-mono text-[9px] text-slate-500">{l.tcpip}</span>}
                {journey === 'google' && <span className="font-mono text-[9px] text-slate-600">{Math.round(t)}ms</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
