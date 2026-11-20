/** Live DNS (DNS-over-HTTPS, dns.google JSON API) + geo-IP (ipwho.is → ipapi.co fallback). */

export interface Geo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  org: string;
  asn: string; // "AS32934"
  network?: string; // e.g. 157.240.1.0/24 when the provider knows it
}

export interface Target {
  domain: string; // lowercase, punycode, no trailing dot
  tld: string;
  zone: string; // where the NS records live (e.g. facebook.com for www.facebook.com)
  a: string[];
  aaaa: string[];
  cname: string[]; // CNAME chain, in order
  ttl: number;
  ns: string[];
  nsIp: string | null;
  nsGeo: Geo | null;
  tldNs: string[];
  tldNsIp: string | null;
  geo: Geo | null;
  /** operator if the IP belongs to a CDN/anycast network, else null */
  cdn: string | null;
  nsAnycast: boolean;
  live: boolean;
}

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/** Accepts "Facebook.com", "https://www.bbc.co.uk/news", "bücher.de" → punycode hostname, or null. */
export function normalizeDomain(input: string): string | null {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`).hostname;
  } catch {
    return null;
  }
  host = host.toLowerCase().replace(/\.$/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[')) return null; // IPs aren't domains
  return DOMAIN_RE.test(host) ? host : null;
}

/** Networks whose IPs are (almost) always nearby edge/anycast front ends, whatever geo-IP says. */
const CDN_ORGS: [RegExp, string][] = [
  [/google/i, 'Google'],
  [/facebook|meta platforms/i, 'Meta'],
  [/cloudflare/i, 'Cloudflare'],
  [/akamai/i, 'Akamai'],
  [/fastly/i, 'Fastly'],
  [/edgecast|edgio|limelight/i, 'Edgio'],
];
/** CDN hostnames seen in CNAME chains (cloud providers' IPs alone don't tell edge from origin). */
const CDN_CNAMES: [RegExp, string][] = [
  [/cloudfront\.net$/, 'Amazon CloudFront'],
  [/akamai(edge|zed)?\.net$|edgekey\.net$|edgesuite\.net$/, 'Akamai'],
  [/fastly\.net$|fastlylb\.net$/, 'Fastly'],
  [/cdn\.cloudflare\.net$/, 'Cloudflare'],
  [/azurefd\.net$|azureedge\.net$|trafficmanager\.net$/, 'Azure Front Door'],
  [/googlehosted\.com$|ghs\.google\.com$/, 'Google'],
  [/edgecastcdn\.net$/, 'Edgio'],
  [/b-cdn\.net$/, 'Bunny CDN'],
];
export const cdnOf = (org: string | undefined, cnames: string[] = []) =>
  cnames.map((c) => CDN_CNAMES.find(([re]) => re.test(c))?.[1]).find(Boolean) ?? (org ? (CDN_ORGS.find(([re]) => re.test(org))?.[1] ?? null) : null);

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}
interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

const isAnswer = (x: unknown): x is DohAnswer =>
  !!x && typeof (x as DohAnswer).data === 'string' && typeof (x as DohAnswer).type === 'number' && typeof (x as DohAnswer).TTL === 'number';

export async function doh(name: string, type: 'A' | 'AAAA' | 'NS', signal?: AbortSignal): Promise<DohResponse> {
  const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { signal, headers: { accept: 'application/dns-json' } });
  if (!r.ok) throw new Error(`DNS lookup failed (${r.status})`);
  const j = (await r.json()) as { Status?: unknown; Answer?: unknown };
  // trust boundary: keep only well-formed answers
  return { Status: typeof j.Status === 'number' ? j.Status : 2, Answer: Array.isArray(j.Answer) ? j.Answer.filter(isAnswer) : [] };
}

const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;
const strip = (s: string) => s.replace(/\.$/, '').toLowerCase();

/** Geo-IP for `ip`, or the caller's own IP when `ip` is empty. */
export async function geoIp(ip: string, signal?: AbortSignal): Promise<Geo | null> {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
  try {
    const r = await fetch(`https://ipwho.is/${ip}`, { signal });
    const j = (await r.json()) as Record<string, unknown>;
    const c = (j.connection ?? {}) as Record<string, unknown>;
    if (j.success === true && IP_RE.test(str(j.ip)))
      return {
        ip: str(j.ip),
        city: str(j.city),
        region: str(j.region),
        country: str(j.country),
        countryCode: str(j.country_code),
        lat: num(j.latitude),
        lon: num(j.longitude),
        org: str(c.org) || str(c.isp),
        asn: typeof c.asn === 'number' ? `AS${c.asn}` : '',
      };
  } catch (e) {
    if (signal?.aborted) return null;
    void e;
  }
  try {
    const r = await fetch(`https://ipapi.co/${ip ? ip + '/' : ''}json/`, { signal });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    if (!IP_RE.test(str(j.ip))) return null;
    return {
      ip: str(j.ip),
      city: str(j.city),
      region: str(j.region),
      country: str(j.country_name),
      countryCode: str(j.country_code),
      lat: num(j.latitude),
      lon: num(j.longitude),
      org: str(j.org),
      asn: str(j.asn),
      network: str(j.network) || undefined,
    };
  } catch {
    return null;
  }
}

/** Walk from the name up to the registered zone and return its NS set. */
async function findNs(domain: string, signal?: AbortSignal) {
  const labels = domain.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const zone = labels.slice(i).join('.');
    const r = await doh(zone, 'NS', signal);
    const ns = (r.Answer ?? []).filter((a) => a.type === 2).map((a) => strip(a.data));
    if (ns.length) return { zone, ns };
  }
  return { zone: labels.slice(-2).join('.'), ns: [] as string[] };
}

const firstA = async (name: string | undefined, signal?: AbortSignal) =>
  name ? ((await doh(name, 'A', signal)).Answer ?? []).find((a) => a.type === 1)?.data ?? null : null;

export async function resolveTarget(domain: string, signal?: AbortSignal): Promise<Target> {
  const tld = domain.split('.').pop()!;
  const [a, aaaa, nsInfo, tldR] = await Promise.all([doh(domain, 'A', signal), doh(domain, 'AAAA', signal), findNs(domain, signal), doh(tld, 'NS', signal)]);
  if (a.Status === 3) throw new Error(`${domain} does not exist (NXDOMAIN)`);
  const ans = a.Answer ?? [];
  const ips = ans.filter((x) => x.type === 1).map((x) => x.data);
  if (!ips.length) throw new Error(`${domain} has no IPv4 address (A record)`);
  const tldNs = (tldR.Answer ?? []).filter((x) => x.type === 2).map((x) => strip(x.data)).sort();
  const [nsIp, tldNsIp, geo] = await Promise.all([firstA(nsInfo.ns[0], signal), firstA(tldNs[0], signal), geoIp(ips[0]!, signal)]);
  const nsGeo = nsIp ? await geoIp(nsIp, signal) : null;
  return {
    domain,
    tld,
    zone: nsInfo.zone,
    a: ips,
    aaaa: (aaaa.Answer ?? []).filter((x) => x.type === 28).map((x) => x.data),
    cname: ans.filter((x) => x.type === 5).map((x) => strip(x.data)),
    ttl: Math.min(...ans.filter((x) => x.type === 1).map((x) => x.TTL)),
    ns: nsInfo.ns,
    nsIp,
    nsGeo,
    tldNs,
    tldNsIp,
    geo,
    cdn: cdnOf(geo?.org, ans.filter((x) => x.type === 5).map((x) => strip(x.data))),
    nsAnycast: !!cdnOf(nsGeo?.org) || /google|cloudflare|awsdns|azure-dns|akam|ultradns|nsone|dynect/i.test(nsInfo.ns.join(' ')),
    live: true,
  };
}

/** Built-in data so the page works offline / before the first lookup finishes. */
export const DEFAULT_TARGET: Target = {
  domain: 'google.com',
  tld: 'com',
  zone: 'google.com',
  a: ['142.250.183.14'],
  aaaa: ['2404:6800:4009:80b::200e'],
  cname: [],
  ttl: 300,
  ns: ['ns1.google.com', 'ns2.google.com', 'ns3.google.com', 'ns4.google.com'],
  nsIp: '216.239.32.10',
  nsGeo: null,
  tldNs: ['a.gtld-servers.net', 'b.gtld-servers.net', 'c.gtld-servers.net'],
  tldNsIp: '192.5.6.30',
  geo: { ip: '142.250.183.14', city: 'Mountain View', region: 'California', country: 'United States', countryCode: 'US', lat: 37.42, lon: -122.08, org: 'Google LLC', asn: 'AS15169' },
  cdn: 'Google',
  nsAnycast: true,
  live: false,
};
