import { useEffect, useState } from 'react';
import { useStore } from '../store';

const EXAMPLES = ['google.com', 'amazon.com', 'facebook.com', 'wikipedia.org', 'github.com', 'netflix.com', 'bbc.co.uk', 'naver.com', 'amazon.co.jp'];

/** "Type any domain" + visitor IP status. Lookups run in the browser (dns.google DoH, ipwho.is geo-IP). */
export function TargetBar() {
  const { target, targetStatus, targetError, trace, me, meStatus, gps, gpsStatus, set } = useStore();
  const [q, setQ] = useState(target.domain);
  useEffect(() => {
    // ?d=example.com comes from the landing page's "Trace my request" box.
    // trace() asks about location first, then looks the domain up.
    const fromUrl = new URLSearchParams(location.search).get('d');
    if (targetStatus === 'idle') trace(fromUrl || target.domain);
    // first load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setQ(target.domain), [target.domain]);
  const meLabel = gps
    ? `you: GPS ${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)} (±${gps.acc} m)${me ? ` · ${me.org}${me.asn ? ' ' + me.asn : ''}` : ''}`
    : gpsStatus === 'skipped'
      ? 'you: example location (Mumbai)'
      : meStatus === 'loading' || meStatus === 'idle'
      ? 'detecting your IP…'
      : meStatus === 'ok' && me
        ? `you: ${me.ip} · ${[me.city, me.country].filter(Boolean).join(', ')} · ${me.org}${me.asn ? ' ' + me.asn : ''}`
        : meStatus === 'off'
          ? 'you: example location (Mumbai)'
          : 'IP lookup unavailable: example location';
  return (
    <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-x-3 gap-y-1 sm:basis-auto">
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          trace(q); // keeps the current step so you can compare domains at the same point
        }}
      >
        <label className="sr-only" htmlFor="domain">Domain to visit</label>
        <div className="flex items-center rounded-md border border-noc-edge bg-black/40 focus-within:border-noc-cyan">
          <span className="pl-2 font-mono text-xs text-slate-500">https://</span>
          <input
            id="domain"
            list="domain-examples"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="any domain, e.g. facebook.com"
            spellCheck={false}
            autoCapitalize="none"
            className="w-40 min-w-0 bg-transparent px-1 py-1 font-mono text-sm text-noc-amber outline-none sm:w-56"
          />
          <button className="rounded-r-md bg-noc-cyan/15 px-2 py-1 text-sm text-noc-cyan hover:bg-noc-cyan/25" aria-label="Trace this domain">
            {targetStatus === 'loading' ? '…' : 'Go'}
          </button>
        </div>
        <datalist id="domain-examples">{EXAMPLES.map((d) => <option key={d} value={d} />)}</datalist>
      </form>
      <div className="flex min-w-0 flex-col font-mono text-[10px] leading-tight">
        {targetStatus === 'failed' ? (
          <span className="text-noc-rose" role="alert">{targetError}</span>
        ) : (
          <span className="truncate text-slate-400" title="Live DNS via dns.google (DNS-over-HTTPS); location via geo-IP">
            <span className={target.live ? 'text-noc-green' : 'text-slate-500'}>{target.live ? '● live' : '○ built-in'}</span> {target.domain} → {target.a[0]}
            {target.geo ? ` · ${[target.geo.city, target.geo.country].filter(Boolean).join(', ')} · ${target.geo.org}` : ''}
          </span>
        )}
        <span className="flex gap-2 truncate text-slate-500">
          <span className="truncate">{meLabel}</span>
          {meStatus === 'ok' && <button className="underline hover:text-white" onClick={() => set({ meStatus: 'off' })}>hide</button>}
          {meStatus === 'off' && <button className="underline hover:text-white" onClick={() => set({ meStatus: me ? 'ok' : 'idle' })}>use mine</button>}
        </span>
      </div>
    </div>
  );
}
