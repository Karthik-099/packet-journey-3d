import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { JOURNEYS, resolve } from '../content';
import { STORY } from '../content/story';
import { useCtx, useStep, useStore } from '../store';

/** Pops up on every step: what is happening in one sentence, who hands the packet to whom, and what it carries. */
export function StoryCard() {
  const journey = useStore((s) => s.journey);
  const step = useStep();
  const c = useCtx();
  const reduced = useReducedMotion();
  const steps = JOURNEYS[journey].steps;
  const n = steps.indexOf(step) + 1;
  const st = STORY[step.id]?.(c);
  const carrying = step.packetLabel ? resolve(step.packetLabel, c) : step.pdu;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        initial={reduced ? false : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="panel pointer-events-auto w-full max-w-xl px-4 py-3 shadow-2xl shadow-black/40"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <span className="chip border-noc-cyan/50 text-noc-cyan">Step {n} of {steps.length}</span>
          <div className="flex flex-1 gap-0.5" aria-hidden>
            {steps.map((s, i) => <span key={s.id} className={`h-1 flex-1 rounded-full ${i < n ? 'bg-noc-cyan' : 'bg-white/10'}`} />)}
          </div>
        </div>
        <h2 className="mt-2 font-display text-xl font-semibold text-white">{st?.head ?? step.short}</h2>
        <p className="mt-1 text-[14px] leading-snug text-slate-200">{st?.line ?? step.title}</p>
        {st && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-noc-edge bg-noc-bg px-2 py-1 font-semibold text-white">{st.from}</span>
            <span className="flex items-center text-noc-green" aria-label="sends to">
              <span className="h-px w-6 bg-noc-green" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-noc-green" />
              <span className="h-px w-6 bg-noc-green" />›
            </span>
            <span className="rounded-md border border-noc-edge bg-noc-bg px-2 py-1 font-semibold text-white">{st.to}</span>
            {carrying && carrying !== st.to && <span className="ml-auto truncate font-mono text-noc-green" title={carrying}>carrying: {carrying}</span>}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
