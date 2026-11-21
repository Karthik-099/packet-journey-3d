import type { Ctx } from '../content';
import { useStore } from '../store';

/** "Served by a nearby edge or the origin?" with the real evidence behind the answer. */
export function CdnCheck({ c }: { c: Ctx }) {
  const edge = useStore((s) => s.edge);
  const checkEdge = useStore((s) => s.checkEdge);
  const offline = useStore((s) => s.offline);
  const mine = edge.domain === c.target.domain ? edge : { status: 'idle' as const };
  const e = mine.status === 'ok' ? edge.evidence : undefined;
  const ph = mine.status === 'ok' ? edge.physics : undefined;
  const t = mine.status === 'ok' ? edge.check?.timings : undefined;
  const verdict = !e
    ? null
    : e.pop
      ? `Served by ${e.operator} from its ${e.pop.city} (${e.pop.code}) edge`
      : ph?.closerThanGeoIp
        ? `Served from a nearby edge${e.operator ? ` (${e.operator})` : ''}, not from ${c.target.geo?.city || 'the geo-IP location'}`
        : e.operator
          ? `Served by ${e.operator}; the edge location isn't named in the headers`
          : 'No CDN detected: the answer most likely came from the origin server';
  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-cyan-200">CDN edge or origin? (real test)</h4>
        <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={offline || !c.target.live || mine.status === 'loading'} onClick={() => void checkEdge()}>
          {mine.status === 'loading' ? 'Testing…' : mine.status === 'ok' ? 'Test again' : 'Run the test'}
        </button>
      </div>
      <p className="mt-1 text-slate-400">
        A probe in your country makes a real HTTPS request to {c.target.domain}. CDNs name the edge that answered in their response headers, and the round-trip time shows how far away the server can physically be.
      </p>
      {offline && <p className="mt-2 text-slate-500">Live data is off.</p>}
      {mine.status === 'failed' && <p className="mt-2 text-rose-300" role="alert">{edge.error}</p>}
      {verdict && (
        <p className="mt-2 rounded-lg bg-black/30 p-2 text-[13px] font-semibold text-white" role="status">
          {verdict}
          {e?.cache ? <span className="ml-2 font-mono text-[11px] font-normal text-emerald-300">cache {e.cache}</span> : null}
        </p>
      )}
      {e && (
        <ul className="mt-2 space-y-1 font-mono text-[10.5px] text-slate-300">
          {e.clues.map((x) => <li key={x}>• {x}</li>)}
        </ul>
      )}
      {ph && (
        <p className="mt-2 leading-5 text-slate-300">
          Speed-of-light test: geo-IP places this IP {Math.round(ph.geoKm).toLocaleString('en-US')} km from the probe, which needs at least <b>{ph.minRttMs.toFixed(0)} ms</b> round trip in fiber. The probe measured <b>{ph.measuredRttMs.toFixed(0)} ms</b>, so the server is at most ~{Math.round(ph.maxServerKm).toLocaleString('en-US')} km away.{' '}
          {ph.closerThanGeoIp ? <b className="text-emerald-300">It must be a closer copy: geo-IP shows where the address is registered, not where it answered.</b> : <span>That's consistent with the geo-IP location.</span>}
        </p>
      )}
      {t && (
        <p className="mt-2 font-mono text-[10.5px] text-slate-400">
          Probe in {edge.check?.probe.city}: DNS {t.dns ?? '–'} ms · TCP {t.tcp ?? '–'} ms · TLS {t.tls ?? '–'} ms · first byte {t.firstByte ?? '–'} ms · HTTP {edge.check?.status ?? '–'}
        </p>
      )}
      {!c.target.live && <p className="mt-2 text-slate-500">Look up a domain first (built-in example data can't be tested).</p>}
    </div>
  );
}
