import type { Ctx, Host, Journey } from './types';
import { buildDnsAResponse, buildDnsQuery, buildIpv4, buildTcp, buildUdp, SYN_OPTIONS, TCP, withTtl } from '../lib/packets';
import { dnsFields, ipFields, tcpFields, udpFields, type Field, type Inspection } from '../lib/inspect';
import { buildRoute } from '../lib/routing';
import { isValidIp } from '../lib/cidr';

/* ---------- example private addresses (browsers cannot see your LAN) ---------- */
export const NET = {
  laptop: '192.168.1.10',
  router: '192.168.1.1',
  routerMac: '02:11:22:33:44:01',
  laptopMac: '02:1a:2b:3c:4d:5e',
  wan: '203.0.113.45', // RFC 5737 documentation address, used when your IPv4 is unknown
  resolver: '8.8.8.8',
  root: '198.41.0.4', // a.root-servers.net (real)
  sport: 51515,
  natPort: 40001,
  dnsPort: 54012,
};

/* ---------- live data helpers ---------- */
const D = (c: Ctx) => c.target.domain;
export const serverIp = (c: Ctx) => c.target.a[0] ?? '0.0.0.0';
export const wanIp = (c: Ctx) => (c.me?.ip && isValidIp(c.me.ip) ? c.me.ip : NET.wan);
const ispName = (c: Ctx) => (c.me?.org ? `${c.me.org}${c.me.asn ? ` (${c.me.asn})` : ''}` : 'your ISP');
const destOrg = (c: Ctx) => (c.target.geo?.org ? `${c.target.geo.org}${c.target.geo.asn ? ` (${c.target.geo.asn})` : ''}` : 'the site’s network');
const isGoogle = (c: Ctx) => c.target.cdn === 'Google';
const sat = (c: Ctx) => c.access !== 'fiber';
const ms = (n: number) => (n < 1 ? n.toFixed(1) : Math.round(n).toString());
const km = (n: number) => Math.round(n).toLocaleString('en-US');

/* ---------- latency model ---------- */
const WIFI = 2;
const ACCESS_FIXED = 2; // ONT/OLT/BNG processing on a fiber line
const SERVER_MS = 25;
/** you → ISP (incl. satellite hops) one way */
export const accessOneWay = (c: Ctx) =>
  c.access === 'fiber' ? ACCESS_FIXED + (c.route.legs[0]?.ms ?? 0) : c.route.legs.filter((l) => l.kind === 'space').reduce((n, l) => n + l.ms, 0) + (c.access === 'leo' ? 10 : 30);
/** backbone part (after the ISP) one way */
export const coreOneWay = (c: Ctx) => Math.max(0, c.route.oneWayMs - (c.access === 'fiber' ? c.route.legs[0]?.ms ?? 0 : accessOneWay(c)));
export const oneWay = (c: Ctx) => WIFI + accessOneWay(c) + coreOneWay(c);
export const rtt = (c: Ctx) => 2 * oneWay(c);
/** DNS authoritative server RTT from the resolver (near you) */
const authRtt = (c: Ctx) => {
  const g = c.target.nsGeo;
  if (c.target.nsAnycast || !g || !Number.isFinite(g.lat)) return 6;
  return 2 * buildRoute(c.home, c.homeName, [g.lat, g.lon], g.city || g.country, 'fiber').oneWayMs + 1;
};

/* ---------- who & where ---------- */
const H = {
  laptop: (c: Ctx): Host => ({ name: 'Your computer', ip: NET.laptop, role: 'Client: browser + OS stub resolver', location: c.homeName, note: 'private IP (example: browsers cannot read your LAN IP)' }),
  router: (c: Ctx): Host => ({ name: 'Home router', ip: `${NET.router} (LAN) / ${wanIp(c)} (WAN)`, role: 'Default gateway, NAT, Wi-Fi AP, DHCP', location: c.homeName, note: c.me ? 'WAN = your detected public IP' : 'WAN IP is an example' }),
  isp: (c: Ctx): Host => ({
    name: sat(c) ? (c.access === 'leo' ? 'LEO satellite + gateway' : 'GEO satellite + teleport') : c.me?.org || 'Your ISP',
    ip: c.me?.asn || '—',
    role: sat(c) ? 'Radio up/down, then the operator’s PoP' : 'OLT → BNG → metro/core → BGP edge',
    location: c.route.legs[0]?.to ?? '',
    note: c.me ? 'ISP + ASN from your IP' : 'example',
  }),
  resolver: (c: Ctx): Host => ({ name: 'Google Public DNS', ip: NET.resolver, role: 'Recursive resolver (anycast)', location: `Nearest Google site to ${c.homeName}`, note: 'same IP served from many cities' }),
  root: (): Host => ({ name: 'a.root-servers.net', ip: NET.root, role: 'DNS root (Verisign)', location: 'Nearest of ~1,900 anycast root instances', note: 'real IP' }),
  tld: (c: Ctx): Host => ({ name: c.target.tldNs[0] ?? `.${c.target.tld} servers`, ip: c.target.tldNsIp ?? '—', role: `.${c.target.tld} TLD nameserver`, location: 'Anycast instance near the resolver', note: c.target.live ? 'live lookup' : 'built-in example' }),
  auth: (c: Ctx): Host => ({
    name: c.target.ns[0] ?? 'authoritative NS',
    ip: c.target.nsIp ?? '—',
    role: `Authoritative for ${c.target.zone}`,
    location: c.target.nsAnycast ? 'Anycast: nearest instance' : c.target.nsGeo ? [c.target.nsGeo.city, c.target.nsGeo.country].filter(Boolean).join(', ') : 'unknown',
    note: c.target.nsGeo?.org ? `${c.target.nsGeo.org} · geo-IP` : undefined,
  }),
  server: (c: Ctx): Host => ({
    name: c.target.cdn ? `${c.target.cdn} edge server` : `${D(c)} server`,
    ip: serverIp(c),
    role: c.target.cdn ? 'CDN/anycast front end: TLS termination, load balancing, caching' : 'Web server / load balancer',
    location: c.destName,
    note: c.target.geo ? `${destOrg(c)} · geo-IP says ${[c.target.geo.city, c.target.geo.country].filter(Boolean).join(', ')}` : undefined,
  }),
};

/* ---------- packet helpers ---------- */
function udpPacket(src: string, dst: string, sp: number, dp: number, dns: Uint8Array, ttl = 64): Inspection {
  const ip = buildIpv4({ src, dst, ttl, id: 0x1c46, protocol: 17, payload: buildUdp(src, dst, sp, dp, dns) });
  return { title: 'IPv4 / UDP / DNS', bytes: ip, tree: [ipFields(ip, 0), udpFields(ip, 20), dnsFields(ip, 28)] };
}
const query = (c: Ctx, rd: boolean) => {
  const q = buildDnsQuery(0xa1b2, D(c), 1);
  if (!rd) q[2] = 0; // resolvers ask authoritative servers iteratively (RD=0)
  return q;
};
const referral = (zone: string, ns: string[]): Field => ({
  name: 'Response: referral (no answer, authority section)',
  value: `${zone} NS → ${ns[0] ?? '?'}`,
  children: ns.slice(0, 6).map((n) => ({ name: `${zone} NS`, value: n })),
});
const ipOrDoc = (ip: string | null | undefined) => (ip && isValidIp(ip) ? ip : '192.0.2.53');

export const synPacket = (c: Ctx, ttl = 64) => {
  const seg = buildTcp({ srcIp: NET.laptop, dstIp: serverIp(c), srcPort: NET.sport, dstPort: 443, seq: 0x2b7e1516, ack: 0, flags: TCP.SYN, window: 64240, options: SYN_OPTIONS, payload: new Uint8Array() });
  return withTtl(buildIpv4({ src: NET.laptop, dst: serverIp(c), ttl: 64, id: 0x77aa, protocol: 6, payload: seg }), ttl);
};
const synInspect = (c: Ctx, ttl = 64, title = 'TCP SYN'): Inspection => {
  const p = synPacket(c, ttl);
  return { title, bytes: p, tree: [ipFields(p, 0), tcpFields(p, 20, p.length - 20)] };
};

/* ---------- traceroute ---------- */
export interface Hop {
  n: number;
  host: string;
  ip: string;
  where: string;
  ms: number;
}
export function traceroute(c: Ctx): Hop[] {
  const hops: Hop[] = [];
  let oneway = WIFI;
  const add = (host: string, ip: string, where: string) => hops.push({ n: hops.length + 1, host, ip, where, ms: Math.round(2 * oneway + 0.5) });
  add('home router', NET.router, c.homeName);
  oneway += accessOneWay(c);
  add(sat(c) ? (c.access === 'leo' ? 'satellite operator PoP' : 'teleport / hub') : 'ISP BNG (CGNAT)', sat(c) ? '100.64.0.1' : '100.64.0.1', c.route.legs.find((l) => l.kind !== 'space')?.from ?? '');
  let doc = 1;
  for (const l of c.route.legs.slice(sat(c) ? 2 : 1)) {
    oneway += l.ms;
    if (l.kind === 'subsea') hops.push({ n: hops.length + 1, host: `subsea: ${l.name}`, ip: '*', where: `~${km(l.km)} km of undersea fiber (repeaters are invisible to traceroute)`, ms: Math.round(2 * oneway) });
    const last = l === c.route.legs.at(-1);
    if (last) add(c.target.cdn ? `${c.target.cdn} front end` : D(c), serverIp(c), c.destName);
    else add(l.kind === 'subsea' ? 'landing station router' : 'backbone / peering router', `198.51.100.${doc++}`, l.to);
  }
  return hops;
}

export const natTable = (c: Ctx) => [
  { proto: 'UDP', inside: `${NET.laptop}:${NET.dnsPort}`, outside: `${wanIp(c)}:40000`, remote: `${NET.resolver}:53`, note: 'DNS query' },
  { proto: 'TCP', inside: `${NET.laptop}:${NET.sport}`, outside: `${wanIp(c)}:${NET.natPort}`, remote: `${serverIp(c)}:443`, note: 'HTTPS' },
];

/* ---------- the journey ---------- */
export const journeyGoogle: Journey = {
  id: 'google',
  title: (c) => `I type ${D(c)} and press Enter`,
  subtitle: 'From the key switch to pixels on screen, through DNS, your router, your ISP, the global backbone and the server.',
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
        'The display server (Wayland compositor via libinput, or X11) knows which window has focus and sends it the key event. The browser\'s UI thread receives it; the address bar handles Enter.',
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
      what: (c) => `"${D(c)}" has no "https://", so the browser decides: is this a search or a site? It looks like a domain, so it becomes https://${D(c)}/. Modern browsers try HTTPS first.`,
      under: (c) => [
        'The address bar guesses whether input is a URL or a search query. Chrome and Firefox default typed hosts to https:// (HTTPS-Upgrades/HTTPS-First) and fall back to http only if needed.',
        `The browser checks its built-in HSTS preload list. If ${c.target.zone} is on it (most big sites are), it is never contacted over plain HTTP. Sites can also send a Strict-Transport-Security header to opt in.`,
        `The URL parser (WHATWG URL standard) yields scheme https, host ${D(c)}${/xn--/.test(D(c)) ? ' (punycode form of an international name)' : ''}, default port 443, path /.`,
      ],
      latencyMs: () => 0.2,
      inspect: (c) => ({
        title: 'Parsed URL',
        tree: [
          { name: 'Input', value: D(c) },
          { name: 'Scheme', value: 'https (HSTS / HTTPS-first)' },
          { name: 'Host', value: D(c) },
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
      what: 'Before using the network, the browser checks if it already has the page or the address. It asks its own DNS cache, then the operating system\'s cache, which also reads the hosts file. Here nothing is cached, so we go to the network.',
      under: [
        'HTTP cache: a fresh cached copy (Cache-Control max-age) could be shown with zero network use. Most home pages are short-lived or private, so they are re-requested.',
        'Chrome keeps its own host cache (chrome://net-internals/#dns). Next is the OS stub resolver: on Linux, glibc reads /etc/nsswitch.conf (files → /etc/hosts first, then dns), often via systemd-resolved\'s cache at 127.0.0.53; on Windows, the DNS Client service and C:\\Windows\\System32\\drivers\\etc\\hosts.',
        'The browser may also use DNS-over-HTTPS straight to the resolver. This page does that too: it asks dns.google for real answers.',
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
      what: (c) => `Your computer doesn't search the internet for ${D(c)} itself. It sends one small question, "What is the IP of ${D(c)}?", to a DNS resolver: your ISP's, or a public one like 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare). Your router gave it that address via DHCP.`,
      under: (c) => [
        `A UDP datagram from ${NET.laptop}:${NET.dnsPort} (random source port) to ${NET.resolver}:53 with a random 16-bit transaction ID; both protect against spoofed answers. RD=1 means "recursion desired: do the whole lookup for me".`,
        'Browsers send A (IPv4) and AAAA (IPv6) queries in parallel, and Chrome also asks for an HTTPS record (type 65) to learn about HTTP/3 support early.',
        `8.8.8.8 is anycast: servers in many cities announce the same IP with BGP, and your packet reaches the nearest one, near ${c.homeName}.`,
        `Like every packet leaving your LAN, the query goes through your router (ARP → Wi-Fi → NAT → ${sat(c) ? 'satellite' : 'ISP'}). We show those hops in detail later.`,
      ],
      latencyMs: (c) => WIFI + accessOneWay(c) + 1,
      inspect: (c) => udpPacket(NET.laptop, NET.resolver, NET.dnsPort, 53, query(c, true)),
      hosts: (c) => [H.laptop(c), H.resolver(c)],
    },
    {
      id: 'g-dns-recursive',
      short: 'DNS 2 · Resolver cache',
      title: 'DNS 2/6: the recursive resolver checks its cache',
      focus: 'dns-resolver',
      widget: 'dns',
      what: (c) => `The resolver first checks its memory. Popular names are usually cached already. To show the full process, we pretend ${D(c)} isn't.`,
      under: (c) => [
        `Resolvers cache each record for its TTL. ${D(c)}'s A record has TTL ${c.target.ttl} s${c.target.live ? ' (live value)' : ''}.`,
        'On a miss it starts from the closest thing it knows. It always knows the root servers (the "root hints" file), and usually already has the TLD\'s NS records cached for up to 2 days.',
        'Many resolvers use QNAME minimisation (RFC 9156): they ask the root only about the TLD, not the full name, for privacy.',
      ],
      simplified: 'In real life the resolver usually has popular names cached, and DNS takes about 5–20 ms total.',
      latencyMs: () => 0.2,
      hosts: (c) => [H.resolver(c)],
    },
    {
      id: 'g-dns-root',
      short: 'DNS 3 · Root',
      title: 'DNS 3/6: root server → "ask the TLD servers"',
      focus: 'dns-root',
      widget: 'dns',
      what: (c) => `The resolver asks a root server. The root doesn't know ${D(c)}, but it knows who runs .${c.target.tld}, and replies with a referral: "ask ${c.target.tldNs[0] ?? `the .${c.target.tld} servers`}".`,
      under: [
        `There are 13 root server names (a. to m.root-servers.net) run by 12 organizations, served by about 1,900 anycast instances worldwide. a.root-servers.net is ${NET.root}.`,
        'The reply has no answer section, only an authority section (the TLD\'s NS records) plus glue A/AAAA records, so the resolver doesn\'t need another lookup to find them.',
        'Resolvers send these queries with RD=0 (iterative). Answers are signed with DNSSEC; a validating resolver like 8.8.8.8 checks the chain of signatures from the root key down.',
      ],
      latencyMs: () => 8,
      inspect: (c) => {
        const i = udpPacket(NET.resolver, NET.root, 33333, 53, query(c, false));
        return { ...i, title: 'Resolver → root query', tree: [...i.tree, referral(`${c.target.tld}.`, c.target.tldNs)] };
      },
      hosts: (c) => [H.resolver(c), H.root()],
    },
    {
      id: 'g-dns-tld',
      short: 'DNS 4 · TLD',
      title: 'DNS 4/6: TLD server → "ask the domain\'s nameservers"',
      focus: 'dns-tld',
      widget: 'dns',
      what: (c) => `The .${c.target.tld} server keeps a list of who is in charge of every .${c.target.tld} domain. It replies: "${c.target.zone} is handled by ${c.target.ns[0] ?? 'its nameservers'}".`,
      under: (c) => [
        `The registry for .${c.target.tld} runs these servers (Verisign for .com/.net, PIR for .org, NIXI for .in, …). The delegation (NS records) was set by ${c.target.zone}'s registrar.`,
        `Live answer: ${c.target.ns.join(', ') || 'no NS records found'}. If the nameserver sits inside the zone it serves, glue A records come with the referral.`,
      ],
      latencyMs: () => 10,
      inspect: (c) => {
        const i = udpPacket(NET.resolver, ipOrDoc(c.target.tldNsIp), 33334, 53, query(c, false));
        return { ...i, title: `Resolver → .${c.target.tld} TLD query`, tree: [...i.tree, referral(`${c.target.zone}.`, c.target.ns)] };
      },
      hosts: (c) => [H.resolver(c), H.tld(c)],
    },
    {
      id: 'g-dns-auth',
      short: 'DNS 5 · Authoritative',
      title: 'DNS 5/6: the authoritative server → the IP address',
      focus: 'dns-auth',
      widget: 'dns',
      what: (c) =>
        `${c.target.ns[0] ?? 'The authoritative server'} gives the final answer: ${D(c)}${c.target.cname.length ? ` is an alias (CNAME) for ${c.target.cname.at(-1)}, which` : ''} = ${serverIp(c)}.${c.target.cdn ? ` Big networks like ${c.target.cdn} hand out an address close to you, based on where the question came from.` : ''}`,
      under: (c) => [
        `The answer carries the AA (authoritative) flag. ${c.target.a.length > 1 ? `It returned ${c.target.a.length} addresses (${c.target.a.slice(0, 4).join(', ')}); clients try them in turn.` : ''}`,
        c.target.cname.length ? `CNAME chain: ${[D(c), ...c.target.cname].join(' → ')}. CDNs use CNAMEs to send you into their own DNS, which picks an edge.` : 'No CNAME: the zone answers with an A record directly.',
        c.target.nsAnycast
          ? 'These nameservers are anycast, so the instance answering is near the resolver.'
          : `This nameserver's IP is ${c.target.nsIp ?? '?'}${c.target.nsGeo ? `, located in ${[c.target.nsGeo.city, c.target.nsGeo.country].filter(Boolean).join(', ')}` : ''}. The resolver has to reach it there: about ${ms(authRtt(c))} ms round trip.`,
        `IPv6 (AAAA): ${c.target.aaaa.slice(0, 2).join(', ') || 'none published'}.`,
      ],
      latencyMs: (c) => authRtt(c),
      inspect: (c) => ({ ...udpPacket(ipOrDoc(c.target.nsIp), NET.resolver, 53, 33335, buildDnsAResponse(query(c, false), serverIp(c), c.target.ttl, true)), title: 'Authoritative response' }),
      hosts: (c) => [H.resolver(c), H.auth(c), H.server(c)],
    },
    {
      id: 'g-dns-answer',
      short: 'DNS 6 · Answer',
      title: 'DNS 6/6: answer returns to your computer and is cached',
      focus: 'laptop',
      widget: 'dns',
      what: (c) => `The resolver sends the answer back to you (${serverIp(c)}) and remembers it for ${c.target.ttl} seconds. Your OS and browser cache it too. Now the browser knows where to connect.`,
      under: [
        'The response must match the query\'s ID, source port and question, or the stub discards it (protection against cache poisoning).',
        'The browser now has IPv4 and IPv6 addresses. "Happy Eyeballs" (RFC 8305) tries IPv6 first and races IPv4 a moment later if needed. We follow IPv4.',
      ],
      latencyMs: (c) => WIFI + accessOneWay(c) + 1,
      inspect: (c) => udpPacket(NET.resolver, NET.laptop, 53, NET.dnsPort, buildDnsAResponse(query(c, true), serverIp(c), c.target.ttl, false), 118),
      hosts: (c) => [H.resolver(c), H.laptop(c), H.server(c)],
    },
    {
      id: 'g-arp',
      short: 'ARP gateway',
      title: 'Local network: ARP for the default gateway',
      focus: 'router',
      widget: 'arp',
      what: (c) => `${serverIp(c)} is not on your home network, so your computer sends the packet to your router (the "default gateway", ${NET.router}). To put it in a Wi-Fi/Ethernet frame it needs the router's MAC address, which it finds with ARP.`,
      under: (c) => [
        `Routing table lookup: ${serverIp(c)} doesn't match 192.168.1.0/24, so the 0.0.0.0/0 default route applies → via ${NET.router}. The IP destination stays the server's; only the L2 destination becomes the router's MAC (${NET.routerMac}).`,
        'The gateway MAC is almost always already in the ARP cache, because the DNS query just used it.',
      ],
      simplified: 'This ARP really happened before the first DNS query left. We show it here to follow the web connection.',
      latencyMs: () => 0.3,
      inspect: (c) => synInspect(c),
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
      what: (c) => `Your laptop's address ${NET.laptop} is private: it only means something inside your home. The router swaps it for its public address (${wanIp(c)}) and a new port, and writes this in a table so it knows where to send the reply.`,
      under: [
        'This is NAPT (port address translation). The router rewrites the source IP and port, recomputes the IP and TCP checksums, decrements TTL (64 → 63), and adds a conntrack entry (Linux: nf_conntrack).',
        'Replies to wan:port are translated back. Unsolicited inbound packets match no entry and are dropped, which is why NAT acts like a basic firewall.',
        'Many ISPs (and all satellite operators) add a second NAT (CGNAT, RFC 6598 100.64.0.0/10), so your router\'s WAN address may itself be private. With IPv6 there is normally no NAT at all.',
      ],
      latencyMs: () => 0.05,
      inspect: (c) => {
        const ap = synPacket(c, 63).slice();
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
      short: 'ISP / satellite',
      title: 'Access network: your line to the ISP',
      focus: 'isp',
      widget: 'route',
      what: (c) =>
        c.access === 'fiber'
          ? `From your router the data goes over the fiber line to ${ispName(c)}'s local exchange, then onto the provider's backbone towards ${c.route.legs[0]?.to}.`
          : c.access === 'leo'
            ? `Your dish beams the packet up to a Starlink-style satellite only ~550 km above you. It relays it down (or across laser links to other satellites) to a ground station near ${c.route.legs[1]?.to.replace('gateway near ', '')}, which connects to the internet.`
            : `Your dish sends the packet to a geostationary satellite 35,786 km above the equator, which relays it down to a ground station. Even at the speed of light that is ~0.25 s each way.`,
      under: (c) =>
        c.access === 'fiber'
          ? [
              'FTTH/GPON: your ONT sends upstream in TDMA time slots to an OLT in the exchange, shared via a passive optical splitter (1:32/1:64), 1310 nm up / 1490 nm down. Cable (DOCSIS) uses a CMTS the same way; DSL uses a DSLAM.',
              'The BNG authenticates your PPPoE/IPoE session and applies rate limits. Traffic then crosses the ISP\'s MPLS/IP metro and core routers.',
            ]
          : c.access === 'leo'
            ? [
                'LEO (Low Earth Orbit, ~550 km): thousands of satellites, each overhead for only a few minutes, so the dish uses a phased-array antenna to steer its beam electronically and hand over between satellites every ~15 s.',
                'Up/downlink use Ku/Ka-band radio. Newer satellites relay over optical inter-satellite laser links (ISLs), so traffic can cross oceans in space before coming down at a gateway.',
                `Typical RTT 25–60 ms. Here: ~${ms(2 * accessOneWay(c))} ms for the space segment, including scheduling.`,
              ]
            : [
                'GEO (geostationary, 35,786 km): one satellite seems fixed in the sky, so a simple dish works, but the distance adds ≈ 240 ms one way and RTT is typically 550–700 ms.',
                'TCP and TLS handshakes each pay that, so GEO links use performance-enhancing proxies (PEPs) that split TCP connections. QUIC can\'t be split this way.',
              ],
      latencyMs: (c) => accessOneWay(c),
      hosts: (c) => [H.router(c), H.isp(c)],
    },
    {
      id: 'g-bgp',
      short: 'BGP routing',
      title: 'BGP: how every network knows the way',
      focus: 'isp',
      widget: 'bgp',
      what: (c) =>
        `The internet is about 75,000 separate networks (Autonomous Systems). Each one announces "I can reach these addresses" using BGP. ${destOrg(c)} announces the block containing ${serverIp(c)}, and ${ispName(c)} picks the best path to it.`,
      under: (c) => [
        `Routers choose by local-preference (customer > peer > transit, set by business deals), then shortest AS-path, then MED, eBGP over iBGP, then IGP cost ("hot-potato"). ${c.target.geo?.network ? `The announced block is ${c.target.geo.network}.` : ''}`,
        'BGP is the control plane: it runs beforehand and installs the best route into the forwarding table (FIB). Each packet then needs only a hardware longest-prefix-match lookup, nanoseconds per hop. No BGP message is sent for your packet.',
        'Inside a single network, routers use an IGP (OSPF or IS-IS) to find the shortest internal path, often with MPLS labels on top.',
      ],
      latencyMs: () => 0,
      hosts: (c) => [H.isp(c), H.server(c)],
    },
    {
      id: 'g-core',
      short: 'Internet core',
      title: 'Across the backbone: cables, hubs, TTL counting down',
      focus: 'globe',
      widget: 'traceroute',
      minPlayMs: (c) => Math.max(5000, oneWay(c) * 40 + 2500),
      what: (c) => {
        const sub = c.route.legs.filter((l) => l.kind === 'subsea');
        return sub.length
          ? `The packet crosses ${sub.length} submarine cable${sub.length > 1 ? 's' : ''} (${sub.map((l) => l.name).join(', ')}): ${km(c.route.km)} km in total to ${c.destName}. Light in glass needs ~${ms(coreOneWay(c))} ms for that. Every router on the way lowers the TTL by 1.`
          : `The server is close: ${c.destName}. The packet stays on land fiber, ${km(c.route.km)} km in total, about ${ms(coreOneWay(c))} ms. Every router on the way lowers the TTL by 1.`;
      },
      under: (c) => [
        `Path: ${[c.route.legs[0]?.from, ...c.route.legs.map((l) => l.to)].join(' → ')}.`,
        'Submarine cables carry ~99% of intercontinental traffic. Each holds a few to 24 fiber pairs, each pair carrying tens of Tbps with DWDM. Optical amplifiers (EDFAs) every ~60–80 km boost the light without converting it, powered by up to ~15 kV DC through the cable.',
        'Each router decrements TTL. When TTL hits 0 the router drops the packet and sends back ICMP Time Exceeded. That\'s how traceroute discovers hops: it sends probes with TTL 1, 2, 3…',
        c.target.cdn
          ? `${c.target.cdn} runs servers in or near most countries. Geo-IP databases often show where its IP block is registered (${c.target.geo ? [c.target.geo.city, c.target.geo.country].filter(Boolean).join(', ') : '?'}), not where the serving machine is. Switch "Edge / Geo-IP" to compare.`
          : 'This site is not on a known CDN, so the geo-IP location is likely close to where the server really is.',
      ],
      simplified: 'The backbone graph and cable routes are approximations; hop IPs are documentation addresses, not a live trace.',
      latencyMs: (c) => coreOneWay(c),
      inspect: (c) => {
        const routers = traceroute(c).filter((h) => h.ip !== '*').length - 1;
        return synInspect(c, Math.max(1, 64 - routers), 'SYN as it arrives at the server (TTL decremented per router)');
      },
      hosts: (c) => [H.isp(c), H.server(c)],
    },
    {
      id: 'g-gfe',
      short: 'Server front door',
      title: 'Load balancer / CDN edge at the destination',
      focus: 'google',
      what: (c) =>
        c.target.cdn
          ? `Your packet arrives at ${c.target.cdn}'s edge. A load balancer picks one of many front-end servers, which does the secure handshake with you and forwards your request to the right service inside ${c.target.cdn}'s network.`
          : `Your packet arrives at the data center hosting ${D(c)}. A load balancer or reverse proxy (often nginx, HAProxy or a cloud load balancer) hands the connection to a web server.`,
      under: (c) => [
        isGoogle(c)
          ? 'Google: Maglev network load balancers hash the 5-tuple (so all packets of one connection hit the same machine) to a Google Front End (GFE), a reverse proxy that terminates TCP/TLS/QUIC and routes over Google\'s private backbone to backends.'
          : 'L4 load balancers spread connections by hashing the 5-tuple; L7 reverse proxies terminate TLS, look at Host/path headers and pick a backend pool. Health checks remove failed servers automatically.',
        'Inside the data center, servers sit in racks connected by top-of-rack switches to a leaf-spine fabric. Any server is only a few hops (and microseconds) from any other.',
      ],
      latencyMs: () => 0.5,
      hosts: (c) => [H.server(c)],
    },
    {
      id: 'g-tcp',
      short: 'TCP handshake',
      title: 'TCP 3-way handshake with the server',
      focus: 'google',
      widget: 'handshake',
      what: (c) =>
        c.quic
          ? 'With HTTP/3 (QUIC), there is no TCP handshake. QUIC runs over UDP and does its connection setup and encryption in one combined round trip. This step is skipped.'
          : `SYN → SYN-ACK → ACK. This costs one full round trip, about ${ms(rtt(c))} ms on this path, before any web data can be sent.`,
      under: (c) => [
        'The SYN you watched travel is answered with SYN-ACK. On the way back, your router\'s NAT table maps it to your laptop. Your laptop sends ACK, immediately followed by the TLS ClientHello.',
        `RTT here ≈ ${ms(rtt(c))} ms. That is why distance matters so much: every round trip pays it again.`,
        'TCP Fast Open could put data in the SYN, but browsers rarely use it. TLS 1.3 and QUIC reduce round trips instead.',
      ],
      latencyMs: (c) => (c.quic ? 0 : oneWay(c)),
      inspect: (c) => synInspect(c),
      hosts: (c) => [H.laptop(c), H.server(c)],
    },
    {
      id: 'g-tls',
      short: 'TLS 1.3',
      title: 'TLS 1.3 handshake: keys and certificate',
      focus: 'google',
      widget: 'tls',
      what: (c) => `Your browser and the server agree on secret keys that nobody else can compute, even someone watching every packet. The server proves it really is ${D(c)} with a certificate signed by a trusted authority. This takes one round trip.`,
      under: (c) => [
        `ClientHello: random, cipher suites (TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256), SNI = ${D(c)} (plaintext unless Encrypted Client Hello is used), ALPN [h2, http/1.1], supported_versions [TLS 1.3], key_share (X25519MLKEM768 post-quantum hybrid in current Chrome/Firefox, plus X25519).`,
        `ServerHello (its key_share) → from here on everything is encrypted: EncryptedExtensions (ALPN), Certificate (${isGoogle(c) ? '*.google.com ← WR2 ← GTS Root R1' : `${D(c)} or a wildcard ← intermediate CA ← root CA`}), CertificateVerify (a signature proving it owns the private key), Finished.`,
        'The client checks the chain against its root store, the hostname, validity dates and Certificate Transparency, then sends its Finished. It can send the HTTP request in the same flight, so TLS 1.3 costs 1 RTT (TLS 1.2 cost 2).',
      ],
      latencyMs: (c) => (c.quic ? oneWay(c) : rtt(c)),
      inspect: (c) => ({
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
                  { name: 'server_name (SNI)', value: D(c) },
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
        ],
      }),
      hosts: (c) => [H.laptop(c), H.server(c)],
    },
    {
      id: 'g-http',
      short: 'HTTP request',
      title: 'HTTP request → backend → response',
      focus: 'google',
      widget: 'http',
      what: (c) => `The browser asks for the page: "GET / from ${D(c)}" over ${c.quic ? 'HTTP/3 (QUIC)' : 'HTTP/2'}. The front end passes it to a backend that builds the page, and the HTML comes back with a status code (200 OK, or a 301/302 redirect).`,
      under: (c) => [
        c.quic
          ? 'HTTP/3 maps requests to QUIC streams over UDP 443. A lost packet only stalls its own stream (no TCP head-of-line blocking), and connections survive IP changes using connection IDs. Browsers learn about h3 from the Alt-Svc header or a DNS HTTPS record, so the very first visit is usually HTTP/2.'
          : `HTTP/2 sends binary HEADERS and DATA frames on stream 1, with headers compressed by HPACK. Pseudo-headers: :method GET, :scheme https, :authority ${D(c)}, :path /.`,
        isGoogle(c) && D(c) === 'google.com'
          ? 'google.com answers 301 Moved Permanently → https://www.google.com/. The browser re-requests www.google.com on the same connection (HTTP/2 connection coalescing: the certificate covers both names).'
          : 'Many sites redirect first (to www., to a language path, or to a login page). Each redirect costs another round trip.',
        `The backend (app servers, caches, databases) builds the response (~${SERVER_MS} ms here) and sends back status, headers (content-type, cache-control, content-encoding br/gzip) and the HTML body.`,
      ],
      latencyMs: (c) => rtt(c) + SERVER_MS,
      inspect: (c) => ({
        title: c.quic ? 'HTTP/3 request (QPACK-decoded)' : 'HTTP/2 HEADERS frame (HPACK-decoded)',
        tree: [
          { name: 'Request', children: [{ name: ':method', value: 'GET' }, { name: ':scheme', value: 'https' }, { name: ':authority', value: D(c) }, { name: ':path', value: '/' }, { name: 'user-agent', value: 'Mozilla/5.0 …' }, { name: 'accept-encoding', value: 'gzip, deflate, br, zstd' }] },
          { name: 'Response', children: [{ name: ':status', value: '200 (or 301/302 redirect)' }, { name: 'content-type', value: 'text/html; charset=UTF-8' }, { name: 'content-encoding', value: 'br' }, { name: 'alt-svc', value: 'h3=":443" (if HTTP/3 is offered)' }] },
        ],
      }),
      hosts: (c) => [H.laptop(c), H.server(c)],
    },
    {
      id: 'g-back',
      short: 'Trip back',
      title: 'The trip back to you',
      focus: 'globe',
      widget: 'summary',
      minPlayMs: (c) => Math.max(5000, oneWay(c) * 40 + 2500),
      what: (c) =>
        `The page travels back in reverse: ${c.destName} → ${[...c.route.legs].reverse().map((l) => l.from).slice(0, 4).join(' → ')} → your router, which looks up its NAT table and changes the destination back to ${NET.laptop} → Wi-Fi → your laptop. TCP puts the pieces in order and ACKs them.`,
      under: (c) => [
        `Return packets: src ${serverIp(c)}:443 → dst ${wanIp(c)}:${NET.natPort}. NAT rewrites dst to ${NET.laptop}:${NET.sport}. The return route can differ from the forward route (asymmetric routing is normal on the internet).`,
        'The HTML (~50–150 KB compressed) doesn\'t fit in one round trip at first: TCP slow start begins with an initial congestion window of 10 segments (~14 KB) and doubles each RTT, so it takes about one more round trip to finish.',
      ],
      latencyMs: (c) => rtt(c),
      hosts: (c) => [H.server(c), H.router(c), H.laptop(c)],
    },
    {
      id: 'g-render-parse',
      short: 'Parse → DOM',
      title: 'Rendering: HTML → DOM, CSS → CSSOM → render tree',
      focus: 'screen',
      widget: 'render',
      what: 'The browser reads the HTML and builds a tree of the page\'s parts (the DOM). It reads the CSS styles (the CSSOM) and combines both into a list of what is actually visible.',
      under: [
        'Bytes → characters (UTF-8, from the charset) → tokens → nodes → DOM. The preload scanner fetches scripts, CSS and images in parallel, each needing its own DNS/TCP/TLS unless it reuses a connection.',
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
      widget: 'summary',
      what: 'The browser works out where every box goes and how big it is (layout), draws text and colors into layers (paint), and the graphics card stacks the layers into the final image you see.',
      under: [
        'Layout computes the geometry. Paint records display lists per layer. Chrome rasterizes tiles on the GPU (Skia), and the compositor combines layers and hands a frame to the OS compositor.',
        'The frame appears on the next display refresh (vsync, every 16.7 ms at 60 Hz). Measures: First Contentful Paint and Largest Contentful Paint.',
      ],
      latencyMs: () => 15,
      hosts: (c) => [H.laptop(c)],
    },
  ],
};
