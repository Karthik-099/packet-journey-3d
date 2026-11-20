import { useEffect } from 'react';
import type { Ctx } from '../content';
import { useStore } from '../store';
import { rtt, serverIp } from '../content/journey-google';

/** Run a real MTR from a volunteer probe and compare it with the model. */
export function MeasuredPath({ c }: { c: Ctx }) {
  const { measured, measure, offline } = useStore();
  const mine = measured.domain === c.target.domain ? measured : { status: 'idle' as const };
  const hops = mine.result?.hops ?? [];
  const last = [...hops].reverse().find((h) => h.avg !== null);
  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-emerald-200">Measured, not modelled</h4>
        <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={offline || mine.status === 'loading'} onClick={() => void measure()}>
          {mine.status === 'loading' ? 'Measuring…' : mine.status === 'ok' ? 'Measure again' : 'Run a real traceroute'}
        </button>
      </div>
      <p className="mt-1 text-slate-400">
        {offline
          ? 'Live data is off.'
          : `Runs MTR to ${c.target.domain} from a volunteer probe in your country (Globalping network). Each run uses one of your ~250 free tests per hour.`}
      </p>
      {mine.status === 'failed' && <p className="mt-2 text-rose-300" role="alert">{measured.error}</p>}
      {mine.result && (
        <>
          <p className="mt-2 text-slate-300">
            Probe: <b className="text-white">{mine.result.probe.city}, {mine.result.probe.country}</b> ({mine.result.probe.network}, AS{mine.result.probe.asn})
          </p>
          <table className="mt-2 w-full font-mono text-[10.5px]">
            <thead className="text-slate-500"><tr><th className="pr-2 text-left">#</th><th className="pr-2 text-left">IP / host</th><th className="pr-2 text-left">AS</th><th className="pr-2 text-left">where</th><th className="text-right">avg</th></tr></thead>
            <tbody>
              {hops.map((h, i) => (
                <tr key={i} className="border-t border-white/5 align-top">
                  <td className="pr-2">{i + 1}</td>
                  <td className="pr-2 text-slate-200">{h.ip ?? '* (no reply)'}<div className="text-slate-500">{h.host && h.host !== h.ip ? h.host : ''}</div></td>
                  <td className="pr-2 text-noc-cyan">{h.asn.length ? `AS${h.asn.join(', AS')}` : ''}</td>
                  <td className="pr-2 text-slate-400">{h.geo ? [h.geo.city, h.geo.countryCode].filter(Boolean).join(', ') : ''}</td>
                  <td className="whitespace-nowrap text-right">{h.avg !== null ? `${h.avg.toFixed(1)} ms` : `${h.loss}% loss`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {last && (
            <p className="mt-2 rounded-lg bg-black/30 p-2 text-slate-300">
              Measured RTT to the last answering hop: <b className="text-emerald-300">{last.avg!.toFixed(0)} ms</b> · model from your location: <b className="text-white">{rtt(c).toFixed(0)} ms</b>. The probe isn't on your connection, so expect differences from your Wi-Fi and ISP access; the backbone part should be close. Geo-IP for router addresses is approximate.
            </p>
          )}
        </>
      )}
      {mine.status === 'idle' && <p className="mt-1 text-slate-500">Target IP: {serverIp(c)}</p>}
    </div>
  );
}

/** Real BGP facts for the destination prefix. */
export function LiveBgp({ ip }: { ip: string }) {
  const info = useStore((s) => s.bgp[ip]);
  const fetchBgp = useStore((s) => s.fetchBgp);
  const offline = useStore((s) => s.offline);
  useEffect(() => {
    void fetchBgp(ip);
  }, [ip, fetchBgp]);
  if (offline) return null;
  return (
    <div className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 text-xs">
      <h4 className="font-semibold text-emerald-200">Live routing data for {ip}</h4>
      {info === 'loading' || info === undefined ? (
        <p className="mt-1 text-slate-400">Asking RIPEstat and PeeringDB…</p>
      ) : info === 'error' ? (
        <p className="mt-1 text-rose-300">Could not fetch routing data.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-slate-400">Announced prefix</dt><dd className="font-mono text-white">{info.prefix ?? 'not announced'}</dd>
          <dt className="text-slate-400">Origin network</dt><dd className="font-mono text-white">{info.origins.map((o) => `AS${o.asn} ${o.holder}`).join(', ') || '—'}</dd>
          <dt className="text-slate-400">RPKI</dt>
          <dd className={`font-mono font-semibold ${info.rpki === 'valid' ? 'text-emerald-300' : info.rpki === 'invalid' ? 'text-rose-300' : 'text-amber-300'}`}>{info.rpki ?? 'unknown'}{info.rpki === 'valid' ? ' (a signed ROA authorises this origin)' : info.rpki === 'unknown' ? ' (no ROA published)' : ''}</dd>
          <dt className="text-slate-400">Peering</dt><dd className="text-white">{info.ixCount !== null ? `${info.netName ?? ''} is present at ${info.ixCount} internet exchanges and ${info.facCount} facilities (PeeringDB)` : 'not listed in PeeringDB'}</dd>
        </dl>
      )}
    </div>
  );
}
