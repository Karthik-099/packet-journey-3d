import { useState } from 'react';
import { Card, Flow, Grid, Section, See, Simple } from './ui';
import { OSI_TABLE, DNS_RECORDS, DNS_RCODES, SUBNETS } from '../content/reference/misc';
import { buildHi } from '../lib/hi';
import { toHex } from '../lib/bytes';
import { cidrInfo, isValidIp } from '../lib/cidr';

export function BigPicture() {
  return (
    <Section id="big-picture" kicker="Start here" title="How the world is connected">
      <p>
        The internet is not one network. It is roughly <b>75,000 independent networks</b> (Autonomous Systems) that agree to exchange traffic. Your home network, your ISP, Google, a university and a cloud region are each
        separate networks. What makes them "one internet" is a shared protocol (IP), a shared address space, a shared naming system (DNS), and a routing protocol (BGP) they all speak at their borders.
      </p>
      <Flow steps={['Your device', 'Home LAN + router', 'Access ISP', 'Regional / national backbone', 'IXP or transit carrier', 'Submarine & terrestrial fiber', 'Content network / data center']} />
      <Grid cols={3}>
        <Card title="Tier 1 networks">
          <p>Carriers that can reach every network without paying anyone for transit, because they all peer with each other. Examples: Lumen (AS3356), Arelion (AS1299), NTT (AS2914), Tata Communications (AS6453), Telecom Italia Sparkle.</p>
        </Card>
        <Card title="Tier 2 / regional ISPs" tone="violet">
          <p>Peer with many networks but buy transit for some destinations. Most national ISPs (Airtel, Jio, BSNL in India) and mobile operators sit here, plus a huge number of smaller ISPs.</p>
        </Card>
        <Card title="Content & cloud networks" tone="emerald">
          <p>Google, Meta, Microsoft, Amazon, Cloudflare, Akamai and Netflix now carry most traffic on their own private backbones, connecting directly to ISPs ("flattening" of the internet).</p>
        </Card>
      </Grid>
      <h3>Peering, transit and IXPs</h3>
      <p>
        <b>Transit</b> means paying a bigger network to deliver your traffic anywhere. <b>Peering</b> means two networks swap traffic for each other's customers directly, usually without payment. Peering happens over a private cable
        between two routers in the same building (a <b>PNI</b>, private network interconnect) or across the shared switch of an <b>Internet Exchange Point</b> (IXP) such as DE-CIX, AMS-IX, LINX, NIXI or IX.br.
      </p>
      <h3>Who runs the shared parts?</h3>
      <ul>
        <li><b>IANA / ICANN</b>: coordinate the global pools of IP addresses, AS numbers, protocol parameters and the DNS root zone.</li>
        <li><b>RIRs</b> (ARIN, RIPE NCC, APNIC, LACNIC, AFRINIC) allocate addresses and ASNs per region. India is served by APNIC.</li>
        <li><b>Root server operators</b>: 12 organisations run the 13 root server identities (a–m.root-servers.net), with 1,900+ anycast instances.</li>
        <li><b>IETF</b> writes the protocol standards (RFCs); <b>IEEE</b> standardises Ethernet and Wi-Fi.</li>
      </ul>
    </Section>
  );
}

function LiveEncap() {
  const [msg, setMsg] = useState('how are you');
  const p = buildHi(msg, false);
  const rows: [string, string, number, string][] = [
    ['L7–L5', 'Data', p.message.length, toHex(p.message.slice(0, 12)) + (p.message.length > 12 ? ' …' : '')],
    ['L4', 'Segment (TCP 20 B + data)', p.segment.length, 'adds ports, seq/ack, flags, window, checksum'],
    ['L3', 'Packet (IPv4 20 B + segment)', p.packet.length, 'adds src/dst IP, TTL, protocol, header checksum'],
    ['L2', `Frame (14 B + packet${p.padding ? ` + ${p.padding} B padding` : ''} + 4 B FCS)`, p.frame.length, 'adds MACs, EtherType, CRC-32'],
    ['L1', 'Bits (+ 8 B preamble/SFD)', p.wire.length, `${p.wire.length * 8} bits on the wire`],
  ];
  return (
    <div className="glass my-4 p-4">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Your message:</span>
        <input value={msg} maxLength={64} onChange={(e) => setMsg(e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-amber-200 outline-none focus:border-cyan-300" />
      </label>
      <table className="tbl mt-3">
        <thead><tr><th>Layer</th><th>PDU</th><th>Bytes</th><th>What was added</th></tr></thead>
        <tbody>
          {rows.map(([l, n, b, d]) => (
            <tr key={l}><td className="font-mono text-cyan-300">{l}</td><td>{n}</td><td className="font-mono text-white">{b}</td><td className="font-mono text-xs">{d}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">Computed live with the same code the 3D journey uses (real IPv4/TCP checksums and Ethernet CRC-32).<See step="hi-l7">Watch it in 3D</See></p>
    </div>
  );
}

export function Osi() {
  return (
    <Section id="osi" kicker="Models" title="The OSI model, layer by layer">
      <p>
        The OSI model splits networking into 7 layers so each layer can be designed and replaced independently. Each layer talks only to the same layer on the other side, using the services of the layer below. Real-world
        protocols follow the simpler <b>TCP/IP model</b> (4 layers), but OSI numbers are how engineers talk: "an L7 load balancer", "an L2 loop", "L3 routing".
      </p>
      <Simple
        head={['#', 'Layer', 'PDU', 'Job', 'Protocols', 'Devices', 'Address']}
        rows={OSI_TABLE.map((l) => [<span className="font-mono text-cyan-300">L{l.n}</span>, <b className="text-white">{l.name}</b>, l.pdu, l.job, l.protocols, l.devices, l.address])}
      />
      <h3>OSI ↔ TCP/IP</h3>
      <Simple head={['TCP/IP layer', 'OSI layers', 'Examples']} rows={[['Application', 'L7 + L6 + L5', 'HTTP, DNS, TLS, SSH'], ['Transport', 'L4', 'TCP, UDP, QUIC'], ['Internet', 'L3', 'IP, ICMP'], ['Link', 'L2 + L1', 'Ethernet, Wi-Fi, fiber']]} />
      <h3>Encapsulation, live</h3>
      <p>Going down the stack each layer adds a header (and Ethernet also a trailer). Coming up, each layer checks and removes its own header. Type a message:</p>
      <LiveEncap />
    </Section>
  );
}

function Calc() {
  const [ip, setIp] = useState('10.20.30.40');
  const [p, setP] = useState(20);
  const i = isValidIp(ip) ? cidrInfo(ip, p) : null;
  return (
    <div className="glass my-4 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 font-mono">
        <input aria-label="IPv4 address" value={ip} onChange={(e) => setIp(e.target.value.trim())} className="w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-white outline-none focus:border-cyan-300" />
        <span className="text-slate-400">/</span>
        <input aria-label="Prefix length" type="number" min={0} max={32} value={p} onChange={(e) => setP(Math.max(0, Math.min(32, +e.target.value || 0)))} className="w-20 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-white outline-none focus:border-cyan-300" />
      </div>
      {i ? (
        <div className="mt-3 grid gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-2">
          <div>network <b className="text-white">{i.network}</b></div>
          <div>mask <b className="text-white">{i.mask}</b></div>
          <div>usable hosts <b className="text-white">{i.first} – {i.last}</b></div>
          <div>count <b className="text-white">{i.usable.toLocaleString()}</b></div>
          <div>broadcast <b className="text-white">{i.broadcast}</b></div>
          <div>type <b className="text-white">{i.kind}</b></div>
          <div className="sm:col-span-2 break-all">bits <span className="text-cyan-300">{i.ipBits.slice(0, p)}</span><span className="text-amber-300">{i.ipBits.slice(p)}</span></div>
        </div>
      ) : (
        <p className="mt-2 text-rose-300">Enter a valid IPv4 address.</p>
      )}
    </div>
  );
}

export function Addressing() {
  return (
    <Section id="addressing" kicker="L2 · L3 · L4" title="Addresses: MAC, IP, subnets, ports, endpoints">
      <Grid>
        <Card title="MAC address (L2)">
          <p>48 bits burned into (or assigned to) a network interface, e.g. <code>3c:22:fb:12:34:56</code>. Only meaningful on the local link: each router hop builds a brand-new frame with new MACs. ARP (IPv4) or NDP (IPv6) maps IP → MAC.</p>
        </Card>
        <Card title="IP address (L3)" tone="violet">
          <p>IPv4: 32 bits (<code>192.168.1.10</code>). IPv6: 128 bits (<code>2404:6800:4009::200e</code>). Split into a network part and a host part by the prefix length. Stays the same end to end (except where NAT rewrites it).</p>
        </Card>
        <Card title="Port (L4)" tone="emerald">
          <p>16-bit number choosing the process on a host: 443 = HTTPS server, 53 = DNS. Clients use random ephemeral ports. See the <a className="text-cyan-300 underline" href="#ports">port list</a>.</p>
        </Card>
        <Card title="Endpoint, socket, 5-tuple" tone="amber">
          <p>An endpoint is IP + port (<code>142.250.183.14:443</code>). A connection is identified by its 5-tuple: protocol, src IP, src port, dst IP, dst port. Firewalls, NAT, conntrack and load balancers all key on it. In APIs, "endpoint" also means a URL such as <code>https://api.example.com/v1/users</code>.</p>
        </Card>
      </Grid>
      <h3>Subnets and CIDR</h3>
      <p>
        <code>/24</code> means the first 24 bits are the network. A host decides "local or remote?" by ANDing the destination with its mask: same network → deliver directly (ARP the host); different → send to the default gateway. Routers pick the{' '}
        <b>longest matching prefix</b>.<See step="hi-l3">Routing decision</See>
      </p>
      <Calc />
      <Simple head={['Prefix', 'Mask', 'Usable hosts']} rows={SUBNETS.map((r) => r.map((c, i) => (i === 0 ? <span className="font-mono text-cyan-300">{c}</span> : <span className="font-mono">{c}</span>)))} />
      <h3>Public vs private, NAT, IPv6</h3>
      <ul>
        <li><b>Private (RFC 1918)</b>: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, reused in every home and VPC, never routed on the internet. <b>CGNAT</b>: 100.64.0.0/10 inside ISPs. Loopback 127.0.0.0/8, link-local 169.254.0.0/16.</li>
        <li><b>NAT/NAPT</b> rewrites private src IP:port to a public IP:port and keeps a table so replies return.<See step="g-nat">NAT in 3D</See></li>
        <li><b>Public vs private subnet in the cloud</b>: both use private IPs. A <i>public</i> subnet's route table sends 0.0.0.0/0 to an Internet Gateway; a <i>private</i> one sends it to a NAT gateway (outbound only) or nowhere.</li>
        <li><b>IPv6</b>: enough addresses for every device; usually no NAT. Hosts self-configure with SLAAC, find neighbours with NDP, and typically get a /64 per LAN.</li>
      </ul>
    </Section>
  );
}

export function Routing() {
  return (
    <Section id="routing" kicker="L3" title="Routing: how packets find their way">
      <p>Every router does the same thing for every packet: look up the destination IP in its forwarding table (FIB), pick the longest matching prefix, decrement TTL, rewrite the L2 header and send it out of the chosen interface. The interesting part is how the table gets filled.</p>
      <Grid cols={3}>
        <Card title="Static & connected routes">
          <p>Directly attached networks plus routes typed in by an admin. Your laptop has two: its own /24 and a default route (0.0.0.0/0) via the router.</p>
        </Card>
        <Card title="IGP: OSPF, IS-IS" tone="violet">
          <p>Inside one network. Every router floods its links, builds the same map and runs Dijkstra (shortest path first). Converges in under a second with BFD. Large ISPs prefer IS-IS.</p>
        </Card>
        <Card title="EGP: BGP" tone="emerald">
          <p>Between networks. Routers advertise prefixes with an AS-path; policy decides. Best path: highest local-pref → shortest AS-path → lowest origin → lowest MED → eBGP over iBGP → lowest IGP cost → tie-breakers.<See step="g-bgp">BGP in 3D</See></p>
        </Card>
      </Grid>
      <h3>Control plane vs data plane</h3>
      <p>Routing protocols (control plane) run in the router CPU and compute the best paths. The resulting FIB is pushed into hardware (ASICs with TCAM), which forwards each packet in nanoseconds (data plane). No BGP message is sent "for" your packet.</p>
      <h3>Tricks the big networks use</h3>
      <ul>
        <li><b>Anycast</b>: the same prefix announced from many cities; BGP sends you to the nearest. DNS roots, 8.8.8.8, 1.1.1.1 and CDNs rely on it.</li>
        <li><b>ECMP</b>: equal-cost paths share load, hashed per flow so packets of one connection stay in order.</li>
        <li><b>MPLS / Segment Routing</b>: label or source-routed paths for traffic engineering and VPNs inside ISP cores.</li>
        <li><b>RPKI</b>: signed Route Origin Authorizations so routers can reject hijacked or leaked prefixes.</li>
        <li><b>Hot-potato routing</b>: hand traffic to the next network as early as possible, so forward and return paths are often different (asymmetric).</li>
      </ul>
      <h3>TTL and traceroute</h3>
      <p>Each router decrements the IP TTL (IPv6: Hop Limit). At 0 the packet is dropped and an ICMP Time Exceeded comes back. Traceroute sends probes with TTL 1, 2, 3… to reveal each hop.<See step="g-core">Traceroute in 3D</See></p>
    </Section>
  );
}

export function Dns() {
  return (
    <Section id="dns" kicker="L7" title="DNS: the internet's phone book">
      <p>DNS turns names into records through a hierarchy of delegations, with caching at every level. A full lookup for a name nobody has asked about recently:</p>
      <Flow steps={['Browser cache', 'OS stub resolver (+ hosts file)', 'Recursive resolver (ISP, 8.8.8.8, 1.1.1.1)', 'Root server: "ask .com"', 'TLD server: "ask ns1.example.com"', 'Authoritative server: A 192.0.2.10']} />
      <p>
        <See step="g-dns-stub">All 6 DNS steps in 3D with live data</See>
      </p>
      <Grid>
        <Card title="Caching & TTLs">
          <p>Each record carries a TTL (seconds it may be cached). Low TTLs (30–300 s) allow fast failover and traffic shifting; high TTLs reduce load. Negative answers (NXDOMAIN) are cached too, per the SOA.</p>
        </Card>
        <Card title="Transport & privacy" tone="violet">
          <p>Classic DNS is plaintext UDP/53 (TCP for large answers). Encrypted options: DNS-over-TLS (853), DNS-over-HTTPS (443) and DNS-over-QUIC. DNSSEC adds signatures (integrity), not encryption.</p>
        </Card>
        <Card title="How CDNs use DNS" tone="emerald">
          <p>A CNAME hands you to the CDN's DNS, which answers with an edge near your resolver (or near your subnet with EDNS Client Subnet). Big providers combine this with anycast.</p>
        </Card>
        <Card title="Kubernetes & cloud" tone="amber">
          <p>CoreDNS answers <code>svc.namespace.svc.cluster.local</code>; private hosted zones (Route 53, Azure Private DNS) serve internal names; split-horizon gives different answers inside and outside.</p>
        </Card>
      </Grid>
      <h3>Record types</h3>
      <Simple head={['Type', 'Meaning']} rows={DNS_RECORDS.map(([t, d]) => [<span className="font-mono text-cyan-300">{t}</span>, d])} />
      <h3>Response codes</h3>
      <Simple head={['RCODE', 'Name', 'Meaning']} rows={DNS_RCODES.map(([n, t, d]) => [n, <span className="font-mono text-white">{t}</span>, d])} />
    </Section>
  );
}
