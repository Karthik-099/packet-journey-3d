/**
 * Is a site served by a nearby CDN edge or by its origin? Answered with real evidence:
 *  1. Response headers from a real HTTPS request made by a probe in your country (Globalping):
 *     CDNs name the edge that answered (cf-ray, x-amz-cf-pop, x-served-by, Wikimedia cp####…)
 *     and whether it came from cache (HIT/MISS, Age).
 *  2. Physics: TCP connect time ≈ 1 round trip. Light in fiber can't beat ~1 ms per 100 km of
 *     round trip, so if the measured RTT is shorter than that to where geo-IP says the server is,
 *     the server must be closer: an edge copy, not the geo-IP location.
 */
import { FIBER_KM_PER_MS, fiberMs, haversineKm, type LatLon } from './geo';

/** IATA airport codes CDNs use to name edge sites (city-level coordinates). */
export const IATA: Record<string, { city: string; at: LatLon }> = {
  BOM: { city: 'Mumbai', at: [19.09, 72.87] },
  DEL: { city: 'New Delhi', at: [28.56, 77.1] },
  MAA: { city: 'Chennai', at: [12.99, 80.17] },
  BLR: { city: 'Bengaluru', at: [13.2, 77.71] },
  HYD: { city: 'Hyderabad', at: [17.24, 78.43] },
  CCU: { city: 'Kolkata', at: [22.65, 88.45] },
  AMD: { city: 'Ahmedabad', at: [23.07, 72.63] },
  COK: { city: 'Kochi', at: [10.15, 76.4] },
  PNQ: { city: 'Pune', at: [18.58, 73.92] },
  NAG: { city: 'Nagpur', at: [21.09, 79.05] },
  KHI: { city: 'Karachi', at: [24.9, 67.17] },
  CMB: { city: 'Colombo', at: [7.18, 79.88] },
  DAC: { city: 'Dhaka', at: [23.84, 90.4] },
  KTM: { city: 'Kathmandu', at: [27.7, 85.36] },
  SIN: { city: 'Singapore', at: [1.36, 103.99] },
  KUL: { city: 'Kuala Lumpur', at: [2.74, 101.71] },
  BKK: { city: 'Bangkok', at: [13.69, 100.75] },
  CGK: { city: 'Jakarta', at: [-6.13, 106.66] },
  HKG: { city: 'Hong Kong', at: [22.31, 113.92] },
  NRT: { city: 'Tokyo', at: [35.77, 140.39] },
  HND: { city: 'Tokyo', at: [35.55, 139.78] },
  KIX: { city: 'Osaka', at: [34.43, 135.24] },
  ICN: { city: 'Seoul', at: [37.46, 126.44] },
  TPE: { city: 'Taipei', at: [25.08, 121.23] },
  MNL: { city: 'Manila', at: [14.51, 121.02] },
  SYD: { city: 'Sydney', at: [-33.95, 151.18] },
  MEL: { city: 'Melbourne', at: [-37.67, 144.84] },
  DXB: { city: 'Dubai', at: [25.25, 55.36] },
  FJR: { city: 'Fujairah', at: [25.11, 56.32] },
  DOH: { city: 'Doha', at: [25.27, 51.61] },
  BAH: { city: 'Bahrain', at: [26.27, 50.63] },
  RUH: { city: 'Riyadh', at: [24.96, 46.7] },
  JED: { city: 'Jeddah', at: [21.68, 39.16] },
  TLV: { city: 'Tel Aviv', at: [32.01, 34.89] },
  IST: { city: 'Istanbul', at: [41.28, 28.75] },
  FRA: { city: 'Frankfurt', at: [50.04, 8.56] },
  AMS: { city: 'Amsterdam', at: [52.31, 4.76] },
  LHR: { city: 'London', at: [51.47, -0.45] },
  LON: { city: 'London', at: [51.51, -0.13] },
  CDG: { city: 'Paris', at: [49.01, 2.55] },
  MRS: { city: 'Marseille', at: [43.44, 5.22] },
  MAD: { city: 'Madrid', at: [40.47, -3.56] },
  MXP: { city: 'Milan', at: [45.63, 8.72] },
  ARN: { city: 'Stockholm', at: [59.65, 17.94] },
  WAW: { city: 'Warsaw', at: [52.17, 20.97] },
  VIE: { city: 'Vienna', at: [48.11, 16.57] },
  ZRH: { city: 'Zurich', at: [47.46, 8.55] },
  DUB: { city: 'Dublin', at: [53.42, -6.27] },
  JNB: { city: 'Johannesburg', at: [-26.14, 28.25] },
  CPT: { city: 'Cape Town', at: [-33.97, 18.6] },
  NBO: { city: 'Nairobi', at: [-1.32, 36.93] },
  LOS: { city: 'Lagos', at: [6.58, 3.32] },
  CAI: { city: 'Cairo', at: [30.12, 31.41] },
  IAD: { city: 'Ashburn (Washington DC)', at: [38.95, -77.46] },
  JFK: { city: 'New York', at: [40.64, -73.78] },
  EWR: { city: 'Newark', at: [40.69, -74.17] },
  ORD: { city: 'Chicago', at: [41.98, -87.9] },
  ATL: { city: 'Atlanta', at: [33.64, -84.43] },
  DFW: { city: 'Dallas', at: [32.9, -97.04] },
  MIA: { city: 'Miami', at: [25.8, -80.29] },
  SEA: { city: 'Seattle', at: [47.45, -122.31] },
  SJC: { city: 'San Jose', at: [37.36, -121.93] },
  SFO: { city: 'San Francisco', at: [37.62, -122.38] },
  LAX: { city: 'Los Angeles', at: [33.94, -118.41] },
  DEN: { city: 'Denver', at: [39.86, -104.67] },
  YYZ: { city: 'Toronto', at: [43.68, -79.63] },
  GRU: { city: 'São Paulo', at: [-23.43, -46.47] },
  EZE: { city: 'Buenos Aires', at: [-34.82, -58.54] },
  SCL: { city: 'Santiago', at: [-33.39, -70.79] },
  BOG: { city: 'Bogotá', at: [4.7, -74.15] },
  QRO: { city: 'Querétaro', at: [20.62, -100.19] },
};

/** Wikimedia cache hosts cpNxxx: N = data center. */
const WIKIMEDIA: Record<string, { name: string; iata: string }> = {
  '1': { name: 'eqiad', iata: 'IAD' },
  '2': { name: 'codfw', iata: 'DFW' },
  '3': { name: 'esams', iata: 'AMS' },
  '4': { name: 'ulsfo', iata: 'SFO' },
  '5': { name: 'eqsin', iata: 'SIN' },
  '6': { name: 'drmrs', iata: 'MRS' },
  '7': { name: 'magru', iata: 'GRU' },
};

export interface EdgeEvidence {
  operator: string | null;
  pop: { code: string; city: string; at: LatLon } | null;
  cache: string | null; // HIT / MISS / … as reported
  age: number | null;
  clues: string[]; // human-readable evidence lines
}

const pop = (code: string | undefined) => {
  const c = code?.toUpperCase();
  return c && IATA[c] ? { code: c, ...IATA[c] } : null;
};

/** Read CDN evidence out of response headers (keys lower-case). */
export function analyzeHeaders(h: Record<string, string>): EdgeEvidence {
  const get = (k: string) => h[k] ?? h[k.toLowerCase()];
  const clues: string[] = [];
  let operator: string | null = null;
  let where: EdgeEvidence['pop'] = null;
  let cache: string | null = null;

  const cfRay = get('cf-ray');
  if (cfRay) {
    operator = 'Cloudflare';
    where = pop(cfRay.split('-').pop());
    clues.push(`cf-ray: ${cfRay} → Cloudflare edge ${where ? `${where.city} (${where.code})` : ''}`.trim());
    cache = get('cf-cache-status') ?? null;
  }
  const cfPop = get('x-amz-cf-pop');
  if (cfPop) {
    operator = 'Amazon CloudFront';
    where = pop(cfPop.slice(0, 3));
    clues.push(`x-amz-cf-pop: ${cfPop} → CloudFront edge ${where ? `${where.city} (${where.code})` : ''}`.trim());
  }
  const servedBy = get('x-served-by');
  const fastly = servedBy?.match(/cache-([a-z]{3})\d+/i);
  if (fastly) {
    operator = operator ?? 'Fastly';
    where = where ?? pop(fastly[1]);
    clues.push(`x-served-by: ${servedBy} → Fastly POP ${where ? `${where.city} (${where.code})` : fastly[1]!.toUpperCase()}`);
  }
  const xcache = get('x-cache');
  const wm = xcache?.match(/\bcp(\d)\d{3}\b/);
  if (wm && WIKIMEDIA[wm[1]!]) {
    const dc = WIKIMEDIA[wm[1]!]!;
    operator = 'Wikimedia (own CDN)';
    where = pop(dc.iata);
    clues.push(`x-cache: ${xcache} → Wikimedia cache host in data center "${dc.name}" (${where?.city})`);
  }
  if (xcache && !cache) cache = /hit/i.test(xcache) ? 'HIT' : /miss/i.test(xcache) ? 'MISS' : xcache;
  const xcs = get('x-cache-status');
  if (xcs && !cache) cache = xcs;
  const server = get('server') ?? '';
  if (!operator && /^(gws|esf|sffe|gse)$/i.test(server)) {
    operator = 'Google';
    clues.push(`server: ${server} → served by Google's front end (GFE) network`);
  }
  if (!operator && /akamai/i.test(server)) {
    operator = 'Akamai';
    clues.push(`server: ${server} → Akamai edge server`);
  }
  if (!operator && (get('x-azure-ref') || get('x-msedge-ref'))) {
    operator = 'Microsoft Azure Front Door';
    clues.push('x-azure-ref present → Azure Front Door edge');
  }
  if (!operator && (/proxygen/i.test(server) || get('x-fb-debug'))) {
    operator = 'Meta';
    clues.push(`server: ${server || 'proxygen'} → Meta edge (Proxygen)`);
  }
  if (server && !clues.some((c) => c.startsWith('server:'))) clues.push(`server: ${server}`);
  const ageRaw = get('age');
  const age = ageRaw !== undefined && /^\d+$/.test(ageRaw) ? Number(ageRaw) : null;
  if (age !== null) clues.push(`age: ${age} s → this response sat in a cache for ${age >= 3600 ? `${(age / 3600).toFixed(1)} h` : `${age} s`}`);
  if (cache) clues.push(`cache status: ${cache}`);
  return { operator, pop: where, cache, age, clues };
}

export interface Physics {
  geoKm: number;
  minRttMs: number;
  measuredRttMs: number;
  maxServerKm: number;
  closerThanGeoIp: boolean;
}

/**
 * Speed-of-light check. `measuredRttMs` should be one round trip (e.g. TCP connect time).
 * The server can be at most RTT/2 × 204 km/ms away from the probe.
 */
export function physicsCheck(probe: LatLon, geoIp: LatLon, measuredRttMs: number): Physics {
  const geoKm = haversineKm(probe, geoIp);
  const minRttMs = 2 * fiberMs(geoKm);
  const maxServerKm = (measuredRttMs / 2) * FIBER_KM_PER_MS;
  return { geoKm, minRttMs, measuredRttMs, maxServerKm, closerThanGeoIp: measuredRttMs < minRttMs * 0.8 };
}
