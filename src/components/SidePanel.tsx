import { AnimatePresence, motion } from 'framer-motion';
import { resolve, OSI } from '../content';
import { useCtx, useStep, useStore } from '../store';
import { PacketInspector } from './PacketInspector';
import { StepWidget } from './widgets';
import { Section, Simplified } from './ui';

export function SidePanel() {
  const step = useStep();
  const c = useCtx();
  const mode = useStore((s) => s.mode);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hosts = step.hosts ? resolve(step.hosts, c) : [];
  const inspection = step.inspect?.(c);
  const layer = step.layer ? OSI.find((l) => l.n === step.layer) : undefined;
  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={step.id}
        initial={reduced ? false : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduced ? undefined : { opacity: 0, x: -16 }}
        transition={{ duration: 0.2 }}
        className="space-y-4 p-4"
        aria-live="polite"
      >
        <header className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {layer && <span className="chip border-noc-cyan/50 text-noc-cyan">L{layer.n} {layer.name}</span>}
            {step.side && <span className="chip border-noc-edge text-slate-400">{step.side}</span>}
            {step.pdu && <span className="chip border-noc-green/50 text-noc-green">PDU: {step.pdu}</span>}
            {step.simplified && <Simplified note={step.simplified} />}
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-tight text-white">{step.title}</h2>
        </header>

        <Section title="What's happening">
          <p className="text-[15px] leading-7 text-slate-200">{resolve(step.what, c)}</p>
        </Section>

        {step.widget && <StepWidget step={step} c={c} />}

        {hosts.length > 0 && (
          <Section title="Who & where">
            <div className="overflow-x-auto rounded-md border border-noc-edge">
              <table className="w-full text-[11px]">
                <thead className="bg-white/5 text-left text-slate-500"><tr><th className="px-2 py-1">machine</th><th className="px-2 py-1">IP / ID</th><th className="px-2 py-1">location</th></tr></thead>
                <tbody>
                  {hosts.map((h, i) => (
                    <tr key={i} className="border-t border-noc-edge align-top">
                      <td className="px-2 py-1"><div className="text-slate-200">{h.name}</div><div className="text-slate-500">{h.role}</div></td>
                      <td className="px-2 py-1 font-mono text-noc-cyan">{h.ip}{h.note && <div className="font-sans text-[10px] text-slate-500">{h.note}</div>}</td>
                      <td className="px-2 py-1 text-slate-300">{h.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <details open={mode === 'expert'} className="group">
          <summary className="h-label cursor-pointer list-none">
            <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>Under the hood
          </summary>
          <div className="mt-2 space-y-2 border-l border-noc-cyan/30 pl-3">
            {resolve(step.under, c).map((p, i) => (
              <p key={i} className="text-[14px] leading-6 text-slate-300">{p}</p>
            ))}
          </div>
        </details>

        {inspection && (
          <details open={mode === 'expert'} className="group">
            <summary className="h-label cursor-pointer list-none">
              <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>Packet inspector
            </summary>
            <div className="mt-2">
              <PacketInspector key={step.id + c.message + c.tls} data={inspection} />
            </div>
          </details>
        )}
      </motion.article>
    </AnimatePresence>
  );
}
