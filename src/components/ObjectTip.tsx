import { OBJECT_TIPS } from '../content/concepts';
import { useStore } from '../store';

export function ObjectTip() {
  const tip = useStore((s) => s.tip);
  const set = useStore((s) => s.set);
  const t = tip ? OBJECT_TIPS[tip] : undefined;
  if (!t) return null;
  return (
    <div role="status" className="panel absolute left-3 top-3 z-20 max-w-xs p-3 text-xs shadow-xl">
      <div className="mb-1 flex items-center justify-between gap-2">
        <b className="text-noc-cyan">{t.title}</b>
        <button onClick={() => set({ tip: null })} className="text-slate-500 hover:text-white" aria-label="Close tooltip">×</button>
      </div>
      <p className="text-slate-300">{t.body}</p>
    </div>
  );
}
