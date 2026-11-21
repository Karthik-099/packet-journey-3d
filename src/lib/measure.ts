/**
 * Real measurements from public, keyless research APIs (all CORS-enabled, read-only):
 * - Globalping (jsDelivr): MTR from a volunteer probe in your country
 * - RIPEstat (RIPE NCC): announced prefix, origin AS, RPKI validity
 * - PeeringDB: where a network peers (IXPs, facilities)
 */
import { geoIp, type Geo } from './lookup';
import { classify } from './cidr';

export interface MtrHop {
  ip: string | null;
  host: string | null;
  asn: number[];
  avg: number | null;
  loss: number;
  geo?: Geo | null;
}
export interface MtrResult {
  probe: { city: string; country: string; network: string; asn: number; lat: number; lon: number };
  hops: MtrHop[];
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      rej(new DOMException('aborted', 'AbortError'));
    });
  });

/** Create a Globalping measurement and poll until it finishes; returns the first probe's result. */
async function globalping(body: Record<string, unknown>, signal?: AbortSignal): Promise<{ probe: Record<string, unknown>; result: Record<string, unknown> }> {
  const r = await fetch('https://api.globalping.io/v1/measurements', { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 429) throw new Error('Measurement rate limit reached (Globalping allows ~250 tests per hour per IP). Try again later.');
  if (!r.ok) throw new Error(`Could not start the measurement (${r.status})`);
  const { id } = (await r.json()) as { id?: unknown };
  if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) throw new Error('Unexpected response from the measurement network');
  for (let i = 0; i < 40; i++) {
    await sleep(i ? 1000 : 2000, signal); // Globalping asks clients to poll at most ~2/s
    const m = (await (await fetch(`https://api.globalping.io/v1/measurements/${id}`, { signal })).json()) as Record<string, unknown>;
    if (m.status !== 'finished') continue;
    const res = (m.results as Record<string, unknown>[] | undefined)?.[0];
    if (!res) throw new Error('No probe was available for this location');
    return { probe: (res.probe ?? {}) as Record<string, unknown>, result: (res.result ?? {}) as Record<string, unknown> };
  }
  throw new Error('The measurement took too long');
}

const probeOf = (p: Record<string, unknown>) => ({ city: str(p.city), country: str(p.country), network: str(p.network), asn: num(p.asn) ?? 0, lat: num(p.latitude) ?? NaN, lon: num(p.longitude) ?? NaN });

export async function runMtr(target: string, country: string, signal?: AbortSignal): Promise<MtrResult> {
  const { probe, result } = await globalping({ type: 'mtr', target, locations: [{ magic: country || 'world' }], limit: 1, measurementOptions: { packets: 3 } }, signal);
  const hops = (result.hops as Record<string, unknown>[] | undefined) ?? [];
  return {
    probe: probeOf(probe),
    hops: hops.map((h) => {
      const s = (h.stats ?? {}) as Record<string, unknown>;
      return {
        ip: str(h.resolvedAddress) || null,
        host: str(h.resolvedHostname) || null,
        asn: Array.isArray(h.asn) ? (h.asn as unknown[]).filter((a): a is number => typeof a === 'number') : [],
        avg: num(s.avg),
        loss: num(s.loss) ?? 0,
      };
    }),
  };
}

export interface HttpCheck {
  probe: MtrResult['probe'];
  status: number | null;
  ip: string | null;
  timings: { dns: number | null; tcp: number | null; tls: number | null; firstByte: number | null; total: number | null };
  headers: Record<string, string>;
}

/** A real HTTPS HEAD request to the site from a probe in `country`: headers reveal which edge answered. */
export async function runHttpCheck(host: string, country: string, signal?: AbortSignal): Promise<HttpCheck> {
  const { probe, result } = await globalping(
    { type: 'http', target: host, locations: [{ magic: country || 'world' }], limit: 1, measurementOptions: { protocol: 'HTTPS', request: { method: 'HEAD', path: '/' } } },
    signal,
  );
  const t = (result.timings ?? {}) as Record<string, unknown>;
  const raw = (result.headers ?? {}) as Record<string, unknown>;
  const headers: Record<string, string> = {};
  // trust boundary: keep only string headers, bounded in size
  for (const [k, v] of Object.entries(raw).slice(0, 80)) if (typeof v === 'string') headers[k.toLowerCase()] = v.slice(0, 300);
  return {
    probe: probeOf(probe),
    status: num(result.statusCode),
    ip: str(result.resolvedAddress) || null,
    timings: { dns: num(t.dns), tcp: num(t.tcp), tls: num(t.tls), firstByte: num(t.firstByte), total: num(t.total) },
    headers,
  };
}

/** Geolocate public hops (private/CGNAT hops have no meaningful location). */
export async function locateHops(hops: MtrHop[], signal?: AbortSignal): Promise<MtrHop[]> {
  const out = hops.map((h) => ({ ...h }));
  const todo = out.filter((h) => h.ip && /Public/.test(classify(h.ip))).slice(0, 12);
  for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(async (h) => (h.geo = await geoIp(h.ip!, signal))));
  return out;
}

export interface BgpInfo {
  prefix: string | null;
  origins: { asn: number; holder: string }[];
  rpki: string | null; // valid | invalid | unknown | null
  ixCount: number | null;
  facCount: number | null;
  netName: string | null;
}

export async function bgpInfo(ip: string, signal?: AbortSignal): Promise<BgpInfo> {
  const po = (await (await fetch(`https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent(ip)}`, { signal })).json()) as { data?: Record<string, unknown> };
  const d = po.data ?? {};
  const prefix = str(d.resource) || null;
  const origins = (Array.isArray(d.asns) ? d.asns : []).map((a: Record<string, unknown>) => ({ asn: num(a.asn) ?? 0, holder: str(a.holder) })).filter((a) => a.asn);
  const asn = origins[0]?.asn;
  const [rpki, pdb] = await Promise.all([
    asn && prefix
      ? fetch(`https://stat.ripe.net/data/rpki-validation/data.json?resource=${asn}&prefix=${encodeURIComponent(prefix)}`, { signal })
          .then((r) => r.json() as Promise<{ data?: { status?: unknown } }>)
          .then((j) => str(j.data?.status) || null)
          .catch(() => null)
      : null,
    asn
      ? fetch(`https://www.peeringdb.com/api/net?asn=${asn}`, { signal })
          .then((r) => r.json() as Promise<{ data?: Record<string, unknown>[] }>)
          .then((j) => j.data?.[0] ?? null)
          .catch(() => null)
      : null,
  ]);
  return { prefix, origins, rpki, ixCount: pdb ? num(pdb.ix_count) : null, facCount: pdb ? num(pdb.fac_count) : null, netName: pdb ? str(pdb.name) || null : null };
}
