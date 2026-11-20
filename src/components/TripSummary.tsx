import type { Ctx } from '../content';
import { JOURNEYS } from '../content';
import { rtt, traceroute } from '../content/journey-google';

/** Numbers for "your request travelled X km and came back". */
export function trip(c: Ctx) {
  const hops = traceroute(c);
  const subsea = c.route.legs.filter((l) => l.kind === 'subsea');
  const space = c.route.legs.filter((l) => l.kind === 'space');
  const total = JOURNEYS.google.steps.reduce((n, s) => n + (s.latencyMs?.(c) ?? 0), 0);
  return {
    oneWayKm: c.route.km,
    roundKm: 2 * c.route.km,
    rttMs: rtt(c),
    routers: hops.filter((h) => h.ip !== '*').length,
    subsea,
    spaceKm: space.reduce((n, l) => n + l.km, 0),
    totalMs: total,
    // how many times light could circle the Earth in the same distance, for scale
    earths: (2 * c.route.km) / 40_075,
  };
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Compact always-visible distance/time chip over the 3D view. */
export function TripHud({ c }: { c: Ctx }) {
  const t = trip(c);
  return (
    <div className="panel hidden px-3 py-2 text-right font-mono text-[11px] leading-tight sm:block" aria-label="Trip summary">
      <div className="text-slate-400">to {c.destName.slice(0, 32)}</div>
      <div className="text-white">
        ↗ {fmt(t.oneWayKm)} km · ↺ <span className="text-noc-amber">{fmt(t.roundKm)} km</span>
      </div>
      <div className="text-noc-cyan">RTT ≈ {fmt(t.rttMs)} ms · {t.routers} routers</div>
    </div>
  );
}

/** Big end-of-journey card. */
export function TripSummary({ c }: { c: Ctx }) {
  const t = trip(c);
  const rows: [string, string][] = [
    ['Distance there', `${fmt(t.oneWayKm)} km`],
    ['Distance there and back', `${fmt(t.roundKm)} km (${t.earths.toFixed(2)}× around the Earth)`],
    ['Network round trip', `≈ ${fmt(t.rttMs)} ms`],
    ['Routers that touched it (each way)', `${t.routers}`],
    ['Submarine cables', t.subsea.length ? t.subsea.map((l) => l.name).join(', ') : 'none: stayed on land'],
    ...(t.spaceKm ? ([['Through space', `${fmt(t.spaceKm)} km to the satellite and down, each way`]] as [string, string][]) : []),
    ['Whole page load (this model)', `≈ ${fmt(t.totalMs)} ms from key press to pixels`],
  ];
  return (
    <div className="rounded-lg border border-noc-amber/40 bg-gradient-to-br from-amber-400/10 to-cyan-400/5 p-3">
      <p className="text-sm text-white">
        Your request to <b className="text-noc-amber">{c.target.domain}</b> travelled <b>{fmt(t.oneWayKm)} km</b> to {c.destName} and <b>{fmt(t.oneWayKm)} km</b> back.
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-400">{k}</dt>
            <dd className="font-mono text-slate-100">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
