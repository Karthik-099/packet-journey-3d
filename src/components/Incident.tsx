import type { Ctx } from '../content';
import { LINKS, hubById } from '../content/network';
import { linkId } from '../lib/routing';
import { useStore } from '../store';

const RED_SEA = LINKS.filter((l) => /AAE-1|IMEWE/.test(l.name) && (l.a === 'djibouti' || l.b === 'djibouti')).map(linkId);

/** Cut submarine cables and watch BGP find another way (or fail). */
export function Incident({ c }: { c: Ctx }) {
  const cut = useStore((s) => s.cut);
  const set = useStore((s) => s.set);
  const onRoute = new Set(c.route.legs.map((l) => l.name));
  const candidates = LINKS.filter((l) => l.kind === 'subsea' && (onRoute.has(l.name) || cut.includes(linkId(l))));
  const toggle = (id: string) => set({ cut: cut.includes(id) ? cut.filter((x) => x !== id) : [...cut, id] });
  const before = c.baseline ? 2 * c.baseline.oneWayMs : null;
  const after = 2 * c.route.oneWayMs;
  return (
    <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-rose-200">Incident simulator: cut a cable</h4>
        <div className="flex gap-2">
          <button className="btn !px-2.5 !py-1 text-xs" onClick={() => set({ cut: [...new Set([...cut, ...RED_SEA])] })} title="February 2024: AAE-1, Seacom and EIG were damaged in the Red Sea">
            Red Sea, Feb 2024
          </button>
          {cut.length > 0 && <button className="btn !px-2.5 !py-1 text-xs" onClick={() => set({ cut: [] })}>Repair all</button>}
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {candidates.length === 0 && <li className="text-slate-400">This route uses no submarine cables. Try a far-away site such as naver.com or bbc.co.uk.</li>}
        {candidates.map((l) => {
          const id = linkId(l);
          const isCut = cut.includes(id);
          return (
            <li key={id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
                <input type="checkbox" checked={isCut} onChange={() => toggle(id)} className="accent-rose-500" />
                <span className={isCut ? 'text-rose-300 line-through' : 'text-slate-200'}>{l.name}</span>
                <span className="text-slate-500">{hubById(l.a).name} ↔ {hubById(l.b).name}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {cut.length > 0 && (
        <p className="mt-2 rounded-lg bg-black/30 p-2 leading-5 text-slate-300" role="status">
          {c.route.unreachable ? (
            <b className="text-rose-300">No path left in this model: the destination is unreachable. In real life, operators would reroute over terrestrial links or other cables, or the region goes dark.</b>
          ) : (
            <>
              BGP withdraws the routes over the cut cable and traffic shifts to the next-best path. Round trip{' '}
              <b className="text-white">{before?.toFixed(0)} ms → {after.toFixed(0)} ms</b>{before !== null && after > before ? <span className="text-rose-300"> (+{(after - before).toFixed(0)} ms)</span> : null}. Other networks' traffic moves too, so the remaining cables can congest: real-world latency often rises more than this model shows.
            </>
          )}
        </p>
      )}
    </div>
  );
}
