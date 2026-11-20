import type { Ctx, Host, Journey } from './types';
import { buildDnsAResponse, buildDnsQuery, buildIpv4, buildTcp, buildUdp, SYN_OPTIONS, TCP, withTtl } from '../lib/packets';
import { dnsFields, ipFields, tcpFields, udpFields, type Field, type Inspection } from '../lib/inspect';
import { LONG_PATH, PLACES, fiberMs, haversineKm, type LatLon } from '../lib/geo';

/* ---------- example addresses (real public servers where noted) ---------- */
export const NET = {
  laptop: '192.168.1.10',
  router: '192.168.1.1',
  routerMac: '02:11:22:33:44:01',
  laptopMac: '02:1a:2b:3c:4d:5e',
  wan: '203.0.113.45', // RFC 5737 documentation address stands in for your public IP
  resolver: '8.8.8.8',
  root: '198.41.0.4', // a.root-servers.net (real)
  tld: '192.5.6.30', // a.gtld-servers.net (real)
  auth: '216.239.32.10', // ns1.google.com (real)
  google: '142.250.183.14', // example address in Google's 142.250.0.0/15 range
  googleEu: '142.250.74.46', // example
  sport: 51515,
  natPort: 40001,
  dnsPort: 54012,
};

/** Detected public IP if we have one, else the documentation example */
export const wanIp = (c: Ctx) => c.me?.ip && !c.me.ip.includes(':') ? c.me.ip : NET.wan;
const home = (c: Ctx) => (c.me ? [c.me.city, c.me.country].filter(Boolean).join(', ') : 'Your home (example: Mumbai)');
const ispName = (c: Ctx) => (c.me?.org ? `${c.me.org}${c.me.asn ? ' (' + c.me.asn + ')' : ''}` : 'your ISP');

/** Where you are on the map: detected location if in India, else Mumbai as the example. */
export const homeLL = (c: Ctx): LatLon => (c.me && c.me.country === 'India' && Number.isFinite(c.me.lat) ? [c.me.lat, c.me.lon] : PLACES.mumbai);
const POPS: { name: string; at: LatLon }[] = [
  { name: 'Mumbai', at: PLACES.mumbai },
  { name: 'Chennai', at: PLACES.chennai },
  { name: 'New Delhi', at: [28.61, 77.21] },
];
/** Nearest Google edge PoP to you (straight-line distance). */
export const edgePop = (c: Ctx) => {
  const h = homeLL(c);
  return POPS.reduce((a, b) => (haversineKm(h, b.at) < haversineKm(h, a.at) ? b : a));
};
/** Terrestrial fiber is ~1.4× longer than the straight line */
const toPopMs = (c: Ctx, at: LatLon) => fiberMs(haversineKm(homeLL(c), at) * 1.4);

/* ---------- latency model ---------- */
const WIFI = 2;
const ACCESS = 3;
export const coreOneWay = (c: Ctx) => (c.path === 'edge' ? 1 + toPopMs(c, edgePop(c).at) : 3 + toPopMs(c, PLACES.mumbai) + LONG_PATH.oneWayMs);
export const oneWay = (c: Ctx) => WIFI + ACCESS + coreOneWay(c);
export const rtt = (c: Ctx) => 2 * oneWay(c);
const SERVER_MS = 20;
const ms = (n: number) => (n < 1 ? n.toFixed(1) : Math.round(n).toString());

/* ---------- who & where ---------- */
const H = {
  laptop: (c: Ctx): Host => ({ name: 'Your computer', ip: NET.laptop, role: 'Client (stub resolver, browser)', location: home(c), note: 'private IP (example: browsers cannot read your LAN IP)' }),
  router: (c: Ctx): Host => ({ name: 'Home router', ip: `${NET.router} (LAN) / ${wanIp(c)} (WAN)`, role: 'Default gateway, NAT, Wi-Fi AP, DHCP', location: home(c), note: c.me ? 'WAN = your detected public IP' : 'WAN IP is an example' }),
  resolver: { name: 'Google Public DNS', ip: NET.resolver, role: 'Recursive resolver', location: 'Nearest Google site, e.g. Mumbai', note: 'anycast: same IP, many locations' },
  root: { name: 'a.root-servers.net', ip: NET.root, role: 'DNS root (operated by Verisign)', location: 'Nearest of ~1,900 root instances; several are in India', note: 'anycast, real IP' },
  tld: { name: 'a.gtld-servers.net', ip: NET.tld, role: '.com TLD server (Verisign)', location: 'Nearest anycast instance', note: 'anycast, real IP' },
  auth: { name: 'ns1.google.com', ip: NET.auth, role: "Google's authoritative nameserver", location: "Google's network, nearest PoP", note: 'anycast, real IP' },
  gfe: (c: Ctx): Host =>
    c.path === 'edge'
      ? { name: 'Google Front End (GFE)', ip: NET.google, role: 'TLS termination, load balancer', location: `Google edge, ${edgePop(c).name}`, note: 'example IP' }
      : { name: 'Google Front End (GFE)', ip: NET.googleEu, role: 'TLS termination, load balancer', location: 'St. Ghislain, Belgium (long-path demo)', note: 'example IP' },
  isp: (c: Ctx): Host => ({ name: c.me?.org || 'ISP OLT / BNG', ip: c.me?.asn || '100.64.0.1', role: 'Access network, BNG, core, BGP edge', location: c.me ? `${c.me.city || 'your city'} exchange` : "Your ISP's local exchange", note: c.me ? 'ISP + ASN detected from your IP' : 'example' }),
} satisfies Record<string, Host | ((c: Ctx) => Host)>;

/* ---------- packet helpers ---------- */
function udpPacket(src: string, dst: string, sp: number, dp: number, dns: Uint8Array, ttl = 64): Inspection {
  const ip = buildIpv4({ src, dst, ttl, id: 0x1c46, protocol: 17, payload: buildUdp(src, dst, sp, dp, dns) });
  return { title: 'IPv4 / UDP / DNS', bytes: ip, tree: [ipFields(ip, 0), udpFields(ip, 20), dnsFields(ip, 28)] };
}
const Q = buildDnsQuery(0xa1b2, 'google.com', 1);
const Q_ITER = (() => {
  const q = Q.slice();
  q[2] = 0; // RD=0: resolvers ask authoritative servers iteratively
  return q;
})();
const referral = (zone: string, ns: string[]): Field => ({
  name: 'Response: referral (no answer, authority section)',
  value: `${zone} NS → ${ns[0]}`,
  children: ns.map((n) => ({ name: `${zone} NS`, value: n })),
});

export const synPacket = (dst: string, ttl = 64) => {
  const seg = buildTcp({ srcIp: NET.laptop, dstIp: dst, srcPort: NET.sport, dstPort: 443, seq: 0x2b7e1516, ack: 0, flags: TCP.SYN, window: 64240, options: SYN_OPTIONS, payload: new Uint8Array() });
  return buildIpv4({ src: NET.laptop, dst, ttl, id: 0x77aa, protocol: 6, payload: seg });
};
const synInspect = (dst: string, ttl = 64, title = 'TCP SYN'): Inspection => {
  const p = withTtl(synPacket(dst), ttl);
  return { title, bytes: p, tree: [ipFields(p, 0), tcpFields(p, 20, p.length - 20)] };
};

/* ---------- data for widgets ---------- */
export interface Hop {
  n: number;
  host: string;
  ip: string;
  where: string;
  ms: number;
}
export function traceroute(c: Ctx): Hop[] {
  const base: Hop[] = [
    { n: 1, host: 'home router', ip: NET.router, where: 'Home', ms: 2 },
    { n: 2, host: 'ISP BNG (CGNAT)', ip: '100.64.0.1', where: 'Local exchange', ms: 4 },
    { n: 3, host: 'ISP core router', ip: '10.12.0.1', where: `ISP core, ${c.path === 'edge' ? edgePop(c).name : 'Mumbai'}`, ms: 5 },
  ];
  const pop = edgePop(c).name;
  if (c.path === 'edge')
    return [
      ...base,
      { n: 4, host: 'peering @ IXP / PNI', ip: '72.14.194.18', where: `${pop} (IXP / private interconnect)`, ms: Math.max(6, Math.round(rtt(c) - 3)) },
      { n: 5, host: 'Google backbone', ip: '142.251.69.111', where: `Google, ${pop}`, ms: Math.max(7, Math.round(rtt(c) - 1)) },
      { n: 6, host: 'google.com (GFE)', ip: NET.google, where: `Google edge, ${pop}`, ms: Math.round(rtt(c)) },
    ];
  const sub = LONG_PATH.subseaKm / 204.2;
  return [
    ...base,
    { n: 4, host: 'transit carrier', ip: '180.87.38.5', where: 'Cable landing station, Mumbai', ms: Math.round(7 + 2 * toPopMs(c, PLACES.mumbai)) },
    { n: 5, host: 'subsea segment (no IP hops inside)', ip: '*', where: `~${Math.round(LONG_PATH.subseaKm).toLocaleString()} km under the Arabian Sea, Red Sea, Mediterranean`, ms: Math.round(7 + 2 * toPopMs(c, PLACES.mumbai) + 2 * sub) },
    { n: 6, host: 'transit carrier', ip: '80.231.153.49', where: 'Landing station, Marseille', ms: Math.round(8 + 2 * toPopMs(c, PLACES.mumbai) + 2 * sub) },
    { n: 7, host: 'Google peering', ip: '72.14.211.88', where: 'Paris', ms: Math.round(16 + 2 * toPopMs(c, PLACES.mumbai) + 2 * sub) },
    { n: 8, host: 'google (GFE)', ip: NET.googleEu, where: 'St. Ghislain, Belgium', ms: Math.round(rtt(c)) },
  ];
}

export const natTable = (c: Ctx) => [
  { proto: 'UDP', inside: `${NET.laptop}:${NET.dnsPort}`, outside: `${wanIp(c)}:40000`, remote: `${NET.resolver}:53`, note: 'DNS query' },
  { proto: 'TCP', inside: `${NET.laptop}:${NET.sport}`, outside: `${wanIp(c)}:${NET.natPort}`, remote: `${NET.google}:443`, note: 'HTTPS' },
];

/* ---------- the journey ---------- */
export const journeyGoogle: Journey = {
  id: 'google',
  title: 'I type google.com and press Enter',
  subtitle: 'From the key switch to pixels on screen, through DNS, your router, your ISP and Google.',
  steps: [
    {
      id: 'g-key',
      short: 'Keyboard',
      title: 'Key press → scan code → USB HID report',
      focus: 'keyboard',
      widget: 'keyboard',
      what: 'Pressing Enter closes a switch in a grid of wires. The keyboard\'s tiny chip scans the grid, sees which key closed, and sends a code for "Enter" over USB.',
      under: [
        'The keyboard MCU scans a row/column key matrix (diodes prevent ghosting) and debounces the switch for a few ms. It maps the position to a HID usage ID: Enter = 0x28 (USB HID Usage Tables, Keyboard page 0x07).',
        'USB is host-polled: the PC asks the keyboard\'s interrupt endpoint every 1–8 ms (bInterval; 125 Hz to 1000 Hz). The keyboard answers with an 8-byte boot-protocol report: [modifiers, reserved, key1..key6]. An all-zero report follows when you release the key.',
      ],
      latencyMs: () => 6,
      inspect: () => {
        const r = new Uint8Array([0, 0, 0x28, 0, 0, 0, 0, 0]);
        return {
          title: 'USB HID boot keyboard report',
          bytes: r,
          tree: [
            { name: 'Modifier byte', value: '0x00 (no Ctrl/Shift/Alt/GUI)', range: [0, 1] },
            { name: 'Reserved', value: '0x00', range: [1, 2] },
            { name: 'Keycode 1', value: '0x28 (Keyboard Return/Enter)', range: [2, 3] },
            { name: 'Keycodes 2–6', value: 'none pressed', range: [3, 8] },
          ],
        };
      },
      hosts: (c) => [H.laptop(c)],
    },
    {
      id: 'g-os',
      short: 'OS → Browser',
      title: 'Interrupt → kernel driver → input event → browser',
      focus: 'keyboard',
      what: 'The computer\'s USB controller tells the CPU "new data". The operating system turns it into a "key pressed: Enter" event and gives it to the window you are typing in: the browser.',
      under: [
        'The xHCI host controller DMA-writes the report into memory and raises an interrupt (MSI-X). The kernel\'s usbhid driver parses it and emits an input event (Linux: EV_KEY KEY_ENTER=28 through evdev /dev/input/eventN; Windows: Raw Input → WM_KEYDOWN VK_RETURN).',
        'The display server (Wayland compositor via libinput, or X11) knows which window has focus and sends it the key event. The browser\'s UI thread receives it; the omnibox handles Enter.',
      ],
      latencyMs: () => 1,
      hosts: (c) => [H.laptop(c)],
    },
    {
      id: 'g-url',
      short: 'URL + HSTS',
      title: 'Browser: parse the URL, check HSTS',
      focus: 'browser',
      widget: 'url',
      what: '"google.com" has no "https://", so the browser decides: is this a search or a site? It looks like a domain, so it becomes https://google.com/. Google is on the browser\'s built-in "always use HTTPS" list.',
      under: [
        'The omnibox guesses whether input is a URL or a search query. Modern Chrome/Firefox default typed hosts to https:// (HTTPS-First/HTTPS-Upgrades) and fall back to http only if needed.',
        'The HSTS preload list is compiled into the browser. A preloaded host is never contacted over plain HTTP, so the internal upgrade happens before any packet is sent. google.com sends Strict-Transport-Security on its responses.',
        'The URL parser (WHATWG URL standard) yields scheme https, host google.com (IDNA/punycode applied if needed), default port 443, path /.',
      ],
      latencyMs: () => 0.2,
      inspect: () => ({
        title: 'Parsed URL',
        tree: [
          { name: 'Input', value: 'google.com' },
          { name: 'Scheme', value: 'https (HSTS / HTTPS-first)' },
          { name: 'Host', value: 'google.com' },
          { name: 'Port', value: '443 (default for https)' },
          { name: 'Path', value: '/' },
        ],
      }),
      hosts: (c) => [H.laptop(c)],
    },
    {
      id: 'g-cache',
      short: 'Caches',
      title: 'Browser cache, then DNS caches (browser → OS → hosts file)',
      focus: 'browser',
      what: 'Before using the network, the browser checks if it already has the page or the address. It asks its own DNS cache, then the operating system\'s cache, which also reads the hosts file. In this walkthrough nothing is cached, so we go to the network.',
      under: [
        'HTTP cache: a fresh cached copy (Cache-Control max-age) could be shown with zero network use. Google\'s HTML is Cache-Control: private, max-age=0, so it is always re-requested.',
        'Chrome keeps its own host cache (chrome://net-internals/#dns). Next is the OS stub resolver: on Linux, glibc reads /etc/nsswitch.conf (files → /etc/hosts first, then dns), often via systemd-resolved\'s cache at 127.0.0.53; on Windows, the DNS Client service and C:\\Windows\\System32\\drivers\\etc\\hosts.',
        'The browser may also use DNS-over-HTTPS straight to the resolver and skip the OS stub.',
      ],
      latencyMs: () => 0.5,
      hosts: (c) => [H.laptop(c)],
    },
    {
      id: 'g-dns-stub',
      short: 'DNS 1 · Stub → resolver',
      title: 'DNS 1/6: stub resolver asks the recursive resolver',
      focus: 'dns-resolver',
      widget: 'dns',
      what: `Your computer doesn't search the internet for google.com itself. It sends one small question, "What is the IP of google.com?", to a DNS resolver: your ISP's, or a public one like 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare). The address came from your router via DHCP or from your settings.`,
      under: [
        `A UDP datagram from ${NET.laptop}:${NET.dnsPort} (random source port) to ${NET.resolver}:53 with a random 16-bit transaction ID; both protect against spoofed answers. RD=1 means "recursion desired: do the whole lookup for me".`,
        'Browsers send A (IPv4) and AAAA (IPv6) queries in parallel, and Chrome also asks for an HTTPS record (type 65) to learn about HTTP/3 support early. We show the A query.',
        '8.8.8.8 is anycast: hundreds of servers in many cities announce the same IP with BGP, and your packet goes to the nearest one by network distance. Your query reaches a Google DNS site in India, not one in California.',
        'Like every packet leaving your LAN, this query goes through your router (ARP → Wi-Fi → NAT → ISP). We show those hops in detail later for the web connection.',
      ],
      latencyMs: () => 4,
      inspect: () => udpPacket(NET.laptop, NET.resolver, NET.dnsPort, 53, Q),
      hosts: (c) => [H.laptop(c), H.resolver],
    },
    {
      id: 'g-dns-recursive',
      short: 'DNS 2 · Resolver cache',
      title: 'DNS 2/6: the recursive resolver checks its cache',
      focus: 'dns-resolver',
      widget: 'dns',
      what: 'The resolver first checks its own memory. For google.com it almost always has the answer cached, because millions of people ask. To show the full process, we pretend it doesn\'t.',
      under: [
        'Resolvers cache each record for its TTL (google.com A has TTL 300 s). Large anycast resolvers split caches across many machines, so hit rates vary by site.',
        'On a miss it starts from the closest thing it knows. It always knows the root servers (the "root hints" file), and usually already has the .com NS records cached for up to 2 days.',
        'Many resolvers use QNAME minimisation (RFC 9156): they ask the root only about "com", not the full name, for privacy.',
      ],
      simplified: 'In real life this step usually finds google.com in the cache, and DNS takes about 5–20 ms total.',
      latencyMs: () => 0.2,
      hosts: [H.resolver],
    },
    {
      id: 'g-dns-root',
      short: 'DNS 3 · Root',
      title: 'DNS 3/6: root server → "ask the .com servers"',
      focus: 'dns-root',
      widget: 'dns',
      what: 'The resolver asks a root server. The root doesn\'t know google.com, but it knows who runs .com, and replies with a referral: "ask a.gtld-servers.net".',
      under: [
        `There are 13 root server names (a. to m.root-servers.net) run by 12 organizations, served by about 1,900 anycast instances worldwide. a.root-servers.net is ${NET.root}.`,
        'The reply has no answer section, only an authority section (NS records for com.) plus glue A/AAAA records in the additional section, so the resolver doesn\'t need another lookup to find the .com servers.',
        'Resolvers send these queries with RD=0 (iterative). Answers are signed with DNSSEC; a validating resolver like 8.8.8.8 checks the chain of signatures from the root key down.',
      ],
      latencyMs: () => 8,
      inspect: () => {
        const i = udpPacket('8.8.8.8', NET.root, 33333, 53, Q_ITER);
        return { ...i, title: 'Resolver → root query', tree: [...i.tree, referral('com.', ['a.gtld-servers.net (192.5.6.30)', 'b.gtld-servers.net', '… m.gtld-servers.net'])] };
      },
      hosts: [H.resolver, H.root],
    },
    {
      id: 'g-dns-tld',
      short: 'DNS 4 · .com TLD',
      title: 'DNS 4/6: .com TLD server → "ask Google\'s nameservers"',
      focus: 'dns-tld',
      widget: 'dns',
      what: 'The .com server keeps a list of who is in charge of every .com domain. It replies: "google.com is handled by ns1.google.com" and gives that server\'s IP.',
      under: [
        'Verisign runs the .com registry. The delegation (NS records) was set by Google\'s registrar. The glue record ns1.google.com A 216.239.32.10 is included because the nameserver sits inside the zone it serves.',
        'NS records for google.com have a 2-day TTL at the TLD, so resolvers rarely repeat this step.',
      ],
      latencyMs: () => 10,
      inspect: () => {
        const i = udpPacket('8.8.8.8', NET.tld, 33334, 53, Q_ITER);
        return { ...i, title: 'Resolver → .com TLD query', tree: [...i.tree, referral('google.com.', ['ns1.google.com (216.239.32.10)', 'ns2.google.com', 'ns3.google.com', 'ns4.google.com'])] };
      },
      hosts: [H.resolver, H.tld],
    },
    {
      id: 'g-dns-auth',
      short: 'DNS 5 · Authoritative',
      title: 'DNS 5/6: Google\'s authoritative server → the IP address',
      focus: 'dns-auth',
      widget: 'dns',
      what: (c) =>
        `Google's own nameserver gives the final answer: google.com = ${c.path === 'edge' ? NET.google : NET.googleEu}. It picks an address of a Google front end close to you, based on where the question came from.`,
      under: [
        'The answer has the AA (authoritative) flag. Google\'s DNS returns different IPs in different places (geo-DNS). It decides based on the resolver\'s location, or your subnet if the resolver sends EDNS Client Subnet (Google Public DNS does for Google\'s own domains).',
        'This is how a user in India gets a front end in India. Separately, some Google IPs (8.8.8.8 itself, Cloud Load Balancing IPs) use anycast routing instead.',
      ],
      latencyMs: () => 6,
      inspect: (c) => {
        const ip = c.path === 'edge' ? NET.google : NET.googleEu;
        const r = buildDnsAResponse(Q_ITER, ip, 300, true);
        return { ...udpPacket(NET.auth, '8.8.8.8', 53, 33335, r), title: 'Authoritative response' };
      },
      hosts: (c) => [H.resolver, H.auth, H.gfe(c)],
    },
    {
      id: 'g-dns-answer',
      short: 'DNS 6 · Answer',
      title: 'DNS 6/6: answer returns to your computer and is cached',
      focus: 'laptop',
      widget: 'dns',
      what: (c) => `The resolver sends the answer back to you (${c.path === 'edge' ? NET.google : NET.googleEu}) and remembers it for 5 minutes. Your OS and browser cache it too. Now the browser knows where to connect.`,
      under: [
        'The response must match the query\'s ID, source port, and question, or the stub discards it (protection against cache poisoning).',
        'The browser now has a list of IPv4 and IPv6 addresses. "Happy Eyeballs" (RFC 8305) tries IPv6 first and races IPv4 a moment later if needed. We follow IPv4.',
      ],
      latencyMs: () => 4,
      inspect: (c) => udpPacket(NET.resolver, NET.laptop, 53, NET.dnsPort, buildDnsAResponse(Q, c.path === 'edge' ? NET.google : NET.googleEu, 300, false), 118),
      hosts: (c) => [H.resolver, H.laptop(c), H.gfe(c)],
    },
    {
      id: 'g-arp',
      short: 'ARP gateway',
      title: 'Local network: ARP for the default gateway',
      focus: 'router',
      widget: 'arp',
      what: `Google is not on your home network, so your computer sends the packet to your router (the "default gateway", ${NET.router}). To put it in a Wi-Fi/Ethernet frame it needs the router's MAC address, which it finds with ARP.`,
      under: [
        `Routing table lookup: ${NET.google} doesn't match 192.168.1.0/24, so the 0.0.0.0/0 default route applies → via ${NET.router}. The IP destination stays Google's; only the L2 destination becomes the router's MAC (${NET.routerMac}).`,
        'The gateway MAC is almost always already in the ARP cache, because the DNS query just used it.',
      ],
      simplified: 'This ARP really happened before the first DNS query left. We show it here to follow the web connection.',
      latencyMs: () => 0.3,
      inspect: (c) => synInspect(c.path === 'edge' ? NET.google : NET.googleEu),
      hosts: (c) => [H.laptop(c), H.router(c)],
    },
    {
      id: 'g-wifi',
      short: 'Wi-Fi hop',
      title: 'The Wi-Fi radio hop',
      focus: 'wifi',
      what: 'The packet travels by radio from your laptop to the router. Wi-Fi takes turns: devices listen before talking, and the router confirms each frame it gets.',
      under: [
        '802.11 data frames carry 3 addresses (receiver/BSSID, transmitter, final destination) and an LLC/SNAP header in place of the EtherType. The access point converts them to/from Ethernet.',
        'Access is CSMA/CA: listen, wait a random backoff, send; the receiver sends an ACK (or Block ACK). Payloads are encrypted with WPA2/WPA3 (CCMP/GCMP-AES), separate from TLS.',
        'Typical latency is 1–5 ms but it spikes with interference and busy channels. Wi-Fi is often the least predictable hop.',
      ],
      latencyMs: () => WIFI,
      hosts: (c) => [H.laptop(c), H.router(c)],
    },
    {
      id: 'g-nat',
      short: 'NAT',
      title: 'Home router NAT: private → public address',
      focus: 'router',
      widget: 'nat',
      what: (c) => `Your laptop's address ${NET.laptop} is private: it only means something inside your home. The router swaps it for its public address (${wanIp(c)}) and a new port, and writes this in a table so it knows where to send Google's reply.`,
      under: [
        'This is NAPT (port address translation). The router rewrites the source IP and port, recomputes the IP and TCP checksums, decrements TTL (64 → 63), and adds a conntrack entry (Linux: nf_conntrack).',
        'Replies to wan:port are translated back. Unsolicited inbound packets match no entry and are dropped, which is why NAT acts like a basic firewall.',
        'Many Indian mobile and fiber ISPs add a second NAT (CGNAT, RFC 6598 100.64.0.0/10), so your router\'s WAN address may itself be private.',
      ],
      latencyMs: () => 0.05,
      inspect: (c) => {
        const p = withTtl(synPacket(c.path === 'edge' ? NET.google : NET.googleEu), 63);
        const ap = p.slice();
        ap.set(wanIp(c).split('.').map(Number), 12);
        ap[20] = NET.natPort >> 8;
        ap[21] = NET.natPort & 0xff;
        const fixed = withTtl(ap, 63);
        return { title: 'After NAT (checksum recomputed)', bytes: fixed, tree: [ipFields(fixed, 0), { name: 'TCP', value: `src port ${NET.sport} → ${NET.natPort}`, range: [20, 22] }] };
      },
      hosts: (c) => [H.router(c)],
    },
    {
      id: 'g-isp',
      short: 'ISP access',
      title: 'ISP access network → ISP core',
      focus: 'isp',
      what: (c) => `From your router the data goes over the fiber (or cable) line to ${ispName(c)}'s local exchange. From there it joins the provider's big, fast network.`,
      under: [
        'FTTH/GPON: your ONT sends upstream in TDMA time slots to an OLT in the exchange, shared via a passive optical splitter (1:32/1:64), 1310 nm up / 1490 nm down. Cable (DOCSIS) uses a CMTS in a similar way.',
        'The BNG authenticates your PPPoE/IPoE session and applies rate limits. Traffic then crosses the ISP\'s MPLS/IP metro and core routers.',
      ],
      latencyMs: () => ACCESS,
      hosts: (c) => [H.router(c), H.isp(c)],
    },
    {
      id: 'g-bgp',
      short: 'BGP decision',
      title: 'BGP: how the ISP knows where Google is',
      focus: 'isp',
      what: (c) => `The internet is about 75,000 separate networks. ${c.me?.asn ? `Your ISP is ${ispName(c)}. ` : ''}They tell each other "I can reach these addresses" using BGP. Your ISP has learned that Google's addresses are reachable directly through a link to Google, which is shorter and cheaper than going through someone else.`,
      under: [
        'Google (AS15169) announces prefixes like 142.250.0.0/15. Your ISP\'s routers keep multiple paths and choose by local-preference (customer > peer > transit), then shortest AS-path, then MED, eBGP over iBGP, then IGP cost ("hot-potato").',
        'BGP is the control plane: it runs beforehand and installs the best route into the forwarding table (FIB). Each packet then needs only a hardware longest-prefix-match lookup, nanoseconds per hop. No BGP message is sent for your packet.',
      ],
      latencyMs: () => 0,
      hosts: (c) => [H.isp(c)],
    },
    {
      id: 'g-core',
      short: 'Internet core',
      title: 'Internet core: the path to Google (TTL counts down)',
      focus: 'globe',
      widget: 'traceroute',
      what: (c) =>
        c.path === 'edge'
          ? 'Realistic case: Google has servers inside India and connects directly to Indian ISPs (at Internet Exchanges like Mumbai, or by private cables). Your packet travels only a few hundred kilometres. Every router on the way lowers the TTL by 1.'
          : `Long path: the packet leaves India through a submarine cable from Mumbai, under the Arabian Sea, Red Sea and Mediterranean, about ${Math.round(LONG_PATH.km).toLocaleString()} km to Europe. Even at the speed of light in glass that takes ~${Math.round(LONG_PATH.oneWayMs)} ms each way.`,
      under: (c) => [
        c.path === 'edge'
          ? 'Google peers with Indian ISPs at IXPs (e.g. in Mumbai, Chennai) and through private network interconnects, and places Google Global Cache servers inside ISP networks. DNS gave you a nearby front-end IP, so the packet never leaves the country.'
          : `Submarine segment ~${Math.round(LONG_PATH.subseaKm).toLocaleString()} km + ~${Math.round(LONG_PATH.landKm).toLocaleString()} km overland. Light in fiber goes ~204,000 km/s (refractive index ~1.47), so propagation alone is ${ms(LONG_PATH.oneWayMs)} ms one-way. Optical repeaters (EDFAs) every ~60–80 km amplify light without converting it to electrical signals, so they don't show up in traceroute.`,
        'Each router decrements TTL. When TTL hits 0 the router drops the packet and sends back ICMP Time Exceeded. That\'s how traceroute discovers hops: it sends probes with TTL 1, 2, 3…',
        'For this long-path demo we pretend google.com is served from Belgium. Google would never do that for an Indian user, but many smaller websites are hosted on only one continent.',
      ],
      simplified: 'Hop IPs and locations are representative examples, not a live trace.',
      latencyMs: (c) => coreOneWay(c),
      inspect: (c) => {
        const hops = traceroute(c).filter((h) => h.ip !== '*').length;
        return synInspect(c.path === 'edge' ? NET.google : NET.googleEu, 64 - (hops - 1), 'SYN as it arrives at Google (TTL decremented per router)');
      },
      hosts: (c) => [H.isp(c), H.gfe(c)],
    },
    {
      id: 'g-gfe',
      short: 'Google Front End',
      title: 'Google Front End and load balancer',
      focus: 'google',
      what: 'Your packet arrives at Google. A load balancer picks one of many front-end servers. That front end does the secure handshake with you and forwards your request to the right service inside Google.',
      under: [
        'Packets for the VIP are spread by Google\'s network load balancer (Maglev, using consistent hashing on the 5-tuple, so all packets of one connection reach the same machine) to a GFE: a reverse proxy that terminates TCP/TLS/QUIC.',
        'The GFE applies DoS protection and routes the HTTP request over Google\'s private backbone to a backend cluster, possibly in another region.',
      ],
      latencyMs: () => 0.5,
      hosts: (c) => [H.gfe(c)],
    },
    {
      id: 'g-tcp',
      short: 'TCP handshake',
      title: 'TCP 3-way handshake with Google',
      focus: 'google',
      widget: 'handshake',
      what: (c) =>
        c.quic
          ? 'With HTTP/3 (QUIC), there is no TCP handshake. QUIC runs over UDP and does its connection setup and encryption in one combined round trip. This step is skipped.'
          : `SYN → SYN-ACK → ACK. This costs one full round trip, about ${ms(rtt(c))} ms on this path, before any web data can be sent.`,
      under: (c) => [
        'The SYN you watched travel is answered by the GFE with SYN-ACK. On return the NAT table maps it back to your laptop. Then your laptop sends ACK, immediately followed by the TLS ClientHello.',
        `RTT here ≈ ${ms(rtt(c))} ms. That's why the physical distance (edge vs. long path) matters so much: every round trip pays it again.`,
        'TCP Fast Open could put data in the SYN, but browsers rarely use it. TLS 1.3 and QUIC reduce round trips instead.',
      ],
      latencyMs: (c) => (c.quic ? 0 : oneWay(c)),
      inspect: (c) => synInspect(c.path === 'edge' ? NET.google : NET.googleEu),
      hosts: (c) => [H.laptop(c), H.gfe(c)],
    },
    {
      id: 'g-tls',
      short: 'TLS 1.3',
      title: 'TLS 1.3 handshake: keys and certificate',
      focus: 'google',
      widget: 'tls',
      what: 'Your browser and Google agree on secret keys that nobody else can compute, even someone watching every packet. Google proves it really is google.com with a certificate signed by a trusted authority. This takes one round trip.',
      under: [
        'ClientHello: random, cipher suites (TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256), SNI = google.com (plaintext unless ECH is used), ALPN [h2, http/1.1], supported_versions [TLS 1.3], key_share (X25519MLKEM768 post-quantum hybrid in current Chrome, plus X25519).',
        'ServerHello (its key_share) → from here on everything is encrypted with handshake keys: EncryptedExtensions (ALPN = h2), Certificate (*.google.com ← WR2 ← GTS Root R1), CertificateVerify (a signature proving it owns the private key), Finished.',
        'The client checks the chain against its root store, the hostname, validity dates and CT logs, then sends its Finished. The client can send the HTTP request in the same flight, so TLS 1.3 costs 1 RTT (TLS 1.2 cost 2). Resumption with a PSK allows 0-RTT.',
      ],
      latencyMs: (c) => (c.quic ? oneWay(c) : rtt(c)),
      inspect: () => ({
        title: 'TLS 1.3 ClientHello (decoded)',
        tree: [
          { name: 'Record: Handshake (22), legacy version 0x0301' },
          {
            name: 'ClientHello',
            children: [
              { name: 'legacy_version', value: '0x0303' },
              { name: 'random', value: '32 bytes' },
              { name: 'cipher_suites', value: 'TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256' },
              {
                name: 'extensions',
                children: [
                  { name: 'server_name (SNI)', value: 'google.com' },
                  { name: 'supported_versions', value: 'TLS 1.3' },
                  { name: 'supported_groups', value: 'X25519MLKEM768, x25519, secp256r1' },
                  { name: 'key_share', value: 'X25519MLKEM768 + x25519 public keys' },
                  { name: 'signature_algorithms', value: 'ecdsa_secp256r1_sha256, rsa_pss_rsae_sha256, …' },
                  { name: 'application_layer_protocol_negotiation', value: 'h2, http/1.1' },
                ],
              },
            ],
          },
          { name: 'ServerHello → EncryptedExtensions → Certificate → CertificateVerify → Finished', value: 'from server' },
          { name: 'Certificate chain', value: '*.google.com ← WR2 ← GTS Root R1' },
        ],
      }),
      hosts: (c) => [H.laptop(c), H.gfe(c)],
    },
    {
      id: 'g-http',
      short: 'HTTP request',
      title: 'HTTP request → Google backend → response',
      focus: 'google',
      widget: 'http',
      what: (c) =>
        `The browser asks for the page: "GET / from google.com" over ${c.quic ? 'HTTP/3 (QUIC)' : 'HTTP/2'}. Google first answers "this lives at www.google.com" (a redirect), so the browser asks again, and then gets the real page.`,
      under: (c) => [
        c.quic
          ? 'HTTP/3 maps requests to QUIC streams over UDP 443. A lost packet only stalls its own stream (no TCP head-of-line blocking), and connections survive IP changes using connection IDs. Browsers learn about h3 from the Alt-Svc header or a DNS HTTPS record, so the very first visit is usually HTTP/2.'
          : 'HTTP/2 sends binary HEADERS and DATA frames on stream 1, with headers compressed by HPACK. Pseudo-headers: :method GET, :scheme https, :authority google.com, :path /.',
        'Response 301 Moved Permanently, location: https://www.google.com/. The browser re-requests www.google.com. The certificate covers *.google.com and the IP can be shared, so it can reuse the same connection (HTTP/2 connection coalescing). It still needs a DNS lookup, usually cached.',
        `The GFE forwards to the search frontend backend over Google's internal network (Stubby/gRPC). It builds the page (~${SERVER_MS} ms) and sends back 200 OK, content-type text/html; charset=UTF-8, content-encoding br/gzip.`,
      ],
      simplified: 'The redirect\'s extra round trip is counted, but we do not draw it as a separate step.',
      latencyMs: (c) => 2 * rtt(c) + SERVER_MS,
      inspect: (c) => ({
        title: c.quic ? 'HTTP/3 request (QPACK-decoded)' : 'HTTP/2 HEADERS frame (HPACK-decoded)',
        tree: [
          { name: 'Request', children: [{ name: ':method', value: 'GET' }, { name: ':scheme', value: 'https' }, { name: ':authority', value: 'google.com' }, { name: ':path', value: '/' }, { name: 'user-agent', value: 'Mozilla/5.0 …' }, { name: 'accept-encoding', value: 'gzip, deflate, br, zstd' }] },
          { name: 'Response 1', children: [{ name: ':status', value: '301' }, { name: 'location', value: 'https://www.google.com/' }] },
          { name: 'Response 2 (www.google.com)', children: [{ name: ':status', value: '200' }, { name: 'content-type', value: 'text/html; charset=UTF-8' }, { name: 'content-encoding', value: 'br' }, { name: 'alt-svc', value: 'h3=":443"; ma=2592000' }, { name: 'strict-transport-security', value: 'max-age=31536000' }] },
        ],
      }),
      hosts: (c) => [H.laptop(c), H.gfe(c)],
    },
    {
      id: 'g-back',
      short: 'Trip back',
      title: 'The trip back to you',
      focus: 'globe',
      what: (c) =>
        `The page travels back the same way in reverse: Google → ${c.path === 'edge' ? 'peering link' : 'submarine cable'} → your ISP → your router, which looks up its NAT table and changes the destination back to ${NET.laptop} → Wi-Fi → your laptop. TCP puts the pieces in order and ACKs them.`,
      under: (c) => [
        `Return packets: src ${NET.google}:443 → dst ${wanIp(c)}:${NET.natPort}. NAT rewrites dst to ${NET.laptop}:${NET.sport}. The return route can differ from the forward route (asymmetric routing is normal on the internet).`,
        'The HTML (~50–100 KB compressed) doesn\'t fit in one round trip at first: TCP slow start begins with an initial congestion window of 10 segments (~14 KB) and doubles each RTT, so it takes about one more round trip to finish.',
      ],
      latencyMs: (c) => rtt(c),
      hosts: (c) => [H.gfe(c), H.router(c), H.laptop(c)],
    },
    {
      id: 'g-render-parse',
      short: 'Parse → DOM',
      title: 'Rendering: HTML → DOM, CSS → CSSOM → render tree',
      focus: 'screen',
      widget: 'render',
      what: 'The browser reads the HTML and builds a tree of the page\'s parts (the DOM). It reads the CSS styles (the CSSOM) and combines both into a list of what is actually visible.',
      under: [
        'Bytes → characters (UTF-8, from the charset) → tokens → nodes → DOM. The preload scanner fetches scripts, CSS and images in parallel. A parser-blocking <script> pauses parsing until it runs.',
        'CSS is render-blocking: the CSSOM must be ready before the first paint. DOM + CSSOM → render tree (display:none elements are left out).',
      ],
      latencyMs: () => 25,
      hosts: (c) => [H.laptop(c)],
    },
    {
      id: 'g-render-paint',
      short: 'Layout → Pixels',
      title: 'Layout → paint → composite on the GPU → pixels',
      focus: 'screen',
      widget: 'render',
      what: 'The browser works out where every box goes and how big it is (layout), draws text and colors into layers (paint), and the graphics card stacks the layers into the final image you see.',
      under: [
        'Layout computes the geometry. Paint records display lists per layer. Chrome rasterizes tiles on the GPU (Skia), and the compositor (Viz) combines layers and hands a frame to the OS compositor.',
        'The frame appears on the next display refresh (vsync, every 16.7 ms at 60 Hz). Measures: First Contentful Paint and Largest Contentful Paint.',
      ],
      latencyMs: () => 15,
      hosts: (c) => [H.laptop(c)],
    },
  ],
};

