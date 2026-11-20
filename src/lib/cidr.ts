const toInt = (ip: string) => ip.split('.').reduce((n, o) => n * 256 + Number(o), 0) >>> 0;
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');

export function isValidIp(ip: string) {
  const p = ip.split('.');
  return p.length === 4 && p.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
}

export const maskOf = (prefix: number) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);

const RANGES: [string, number, string][] = [
  ['10.0.0.0', 8, 'Private (RFC 1918)'],
  ['172.16.0.0', 12, 'Private (RFC 1918)'],
  ['192.168.0.0', 16, 'Private (RFC 1918)'],
  ['100.64.0.0', 10, 'Shared / CGNAT (RFC 6598)'],
  ['127.0.0.0', 8, 'Loopback'],
  ['169.254.0.0', 16, 'Link-local (APIPA)'],
  ['224.0.0.0', 4, 'Multicast'],
  ['192.0.2.0', 24, 'Documentation (RFC 5737)'],
  ['198.51.100.0', 24, 'Documentation (RFC 5737)'],
  ['203.0.113.0', 24, 'Documentation (RFC 5737)'],
];

export function classify(ip: string): string {
  const n = toInt(ip);
  for (const [base, p, label] of RANGES) if (((n & maskOf(p)) >>> 0) === toInt(base)) return label;
  return 'Public (globally routable)';
}

export function cidrInfo(ip: string, prefix: number) {
  const mask = maskOf(prefix);
  const net = (toInt(ip) & mask) >>> 0;
  const bcast = (net | ~mask) >>> 0;
  const total = 2 ** (32 - prefix);
  // /31 (RFC 3021 point-to-point) and /32 have no network/broadcast reservation
  const usable = prefix >= 31 ? total : total - 2;
  return {
    network: `${toIp(net)}/${prefix}`,
    mask: toIp(mask),
    wildcard: toIp(~mask >>> 0),
    broadcast: prefix >= 31 ? '—' : toIp(bcast),
    first: toIp(prefix >= 31 ? net : net + 1),
    last: toIp(prefix >= 31 ? bcast : bcast - 1),
    usable,
    kind: classify(ip),
    ipBits: toInt(ip).toString(2).padStart(32, '0'),
    maskBits: mask.toString(2).padStart(32, '0'),
  };
}

/** Same subnet? This is the exact test a host does before deciding "direct (ARP the host)" vs "via gateway". */
export const sameSubnet = (a: string, b: string, prefix: number) => ((toInt(a) & maskOf(prefix)) >>> 0) === ((toInt(b) & maskOf(prefix)) >>> 0);
