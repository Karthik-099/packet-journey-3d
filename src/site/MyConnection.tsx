import { useEffect, useState } from 'react';

interface Timing {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
  protocol: string;
  reused: boolean;
}
interface NetInfo {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
}

/** Real timings of this page load from the browser's Navigation Timing API (no network requests). */
export function readTiming(): Timing | null {
  const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!n || !n.responseEnd) return null;
  const tls = n.secureConnectionStart > 0 ? n.connectEnd - n.secureConnectionStart : 0;
  return {
    dns: n.domainLookupEnd - n.domainLookupStart,
    tcp: n.connectEnd - n.connectStart - tls,
    tls,
    ttfb: n.responseStart - n.requestStart,
    download: n.responseEnd - n.responseStart,
    total: n.responseEnd - n.startTime,
    protocol: n.nextHopProtocol || 'unknown',
    reused: n.connectEnd - n.connectStart === 0,
  };
}

const PROTO: Record<string, string> = { h3: 'HTTP/3 over QUIC', h2: 'HTTP/2 over TLS', 'http/1.1': 'HTTP/1.1' };

export function MyConnection({ dark = false }: { dark?: boolean }) {
  const [t, setT] = useState<Timing | null>(null);
  const net = (navigator as Navigator & { connection?: NetInfo }).connection;
  useEffect(() => {
    // responseEnd is only final after the load event
    const read = () => setT(readTiming());
    if (document.readyState === 'complete') read();
    else window.addEventListener('load', read, { once: true });
  }, []);
  if (!t) return null;
  const rows: [string, number, string][] = [
    ['DNS lookup', t.dns, 'Resolving this site\'s name to an IP'],
    ['TCP handshake', t.tcp, 'SYN → SYN-ACK → ACK'],
    ['TLS handshake', t.tls, 'Keys and certificate (0 with QUIC: folded into one handshake)'],
    ['Waiting for first byte', t.ttfb, 'Request out, server work, first byte back'],
    ['Download', t.download, 'Receiving the HTML'],
  ];
  const max = Math.max(...rows.map((r) => r[1]), 1);
  const card = dark ? 'border-white/10 bg-[#04121f] text-slate-200' : 'glass text-slate-700';
  return (
    <div className={`rounded-2xl border p-5 ${card}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={`font-display text-lg font-bold ${dark ? 'text-white' : 'text-ink'}`}>Your connection, measured</h3>
        <span className="font-mono text-xs text-teal-500">{PROTO[t.protocol] ?? t.protocol} · page loaded in {t.total.toFixed(0)} ms</span>
      </div>
      <p className={`mt-1 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Real timings of how your browser just fetched this page, from its own Navigation Timing API. Nothing is sent anywhere.
        {t.reused && ' Your browser reused an existing connection (or a cache), so DNS/TCP/TLS show 0: reload in a new tab to see them.'}
      </p>
      <ul className="mt-4 space-y-2">
        {rows.map(([k, v, d]) => (
          <li key={k} className="grid grid-cols-[9.5rem_1fr_4.5rem] items-center gap-3 text-sm">
            <span title={d}>{k}</span>
            <span className={`h-2.5 rounded-sm ${dark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <span className="block h-full rounded-sm bg-gradient-to-r from-teal-500 to-cyan-400" style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="text-right font-mono">{v.toFixed(1)} ms</span>
          </li>
        ))}
      </ul>
      {net?.effectiveType && (
        <p className={`mt-3 font-mono text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Browser estimate: {net.effectiveType.toUpperCase()} class link{net.rtt ? ` · RTT ≈ ${net.rtt} ms` : ''}{net.downlink ? ` · ~${net.downlink} Mbps` : ''}
        </p>
      )}
    </div>
  );
}
