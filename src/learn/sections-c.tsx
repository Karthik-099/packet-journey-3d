import { Card, Flow, Grid, Section, See, Simple } from './ui';
import { SATELLITES, TOOLS } from '../content/reference/misc';
import { LINKS, HUBS } from '../content/network';
import { CONCEPTS } from '../content/concepts';

export function Physical() {
  const subsea = LINKS.filter((l) => l.kind === 'subsea');
  return (
    <Section id="physical" kicker="L1 · the real wires" title="Submarine cables, fiber and satellites">
      <p>
        Wireless is only the last few metres. Everything else is glass: about <b>99% of intercontinental traffic</b> travels through <b>550+ submarine cable systems</b>, each a garden-hose-thick cable lying on the sea floor, plus
        a dense mesh of terrestrial fiber along roads, railways and pipelines.
      </p>
      <h3>Anatomy of a submarine cable</h3>
      <Flow steps={['Data center', 'Terrestrial backhaul', 'Cable landing station', 'Beach manhole', 'Shore-end armoured cable', 'Deep-sea cable + repeaters', 'Branching unit', 'Landing station abroad']} />
      <Grid>
        <Card title="Fiber pairs & DWDM">
          <p>A modern cable carries 8–24 fiber pairs (one fiber each direction). Each fiber carries ~100+ wavelengths ("colours") with Dense Wavelength Division Multiplexing, each running at 100–800 Gbps with coherent optics: hundreds of Tbps per cable.</p>
        </Card>
        <Card title="Repeaters (optical amplifiers)" tone="violet">
          <p>Light fades as it travels. Every <b>60–80 km</b> a pressure-proof repeater with <b>EDFAs</b> (erbium-doped fiber amplifiers) boosts all wavelengths at once, optically, without converting to electricity, so they're invisible to traceroute. A trans-Pacific cable has 100+ repeaters.</p>
        </Card>
        <Card title="Power feeding" tone="amber">
          <p>The repeaters need power. <b>Power Feed Equipment</b> at the landing stations pushes up to ~15–18 kV DC down a copper conductor inside the cable, with the sea as the return path.</p>
        </Card>
        <Card title="Branching units & ROADMs" tone="emerald">
          <p><b>Branching units</b> split a cable to serve extra countries. Optical add/drop multiplexers (ROADMs) can route individual wavelengths to different landings, which is how one system like AAE-1 or SEA-ME-WE serves a dozen countries.</p>
        </Card>
        <Card title="Landing stations">
          <p>Where the cable comes ashore: power feed, Submarine Line Terminal Equipment (SLTE), and backhaul to data centers. India's cables land mainly in <b>Mumbai</b> (Versova, Chowpatty) and <b>Chennai</b>.</p>
        </Card>
        <Card title="Faults & repair ships" tone="violet">
          <p>~150–200 cable faults a year, mostly from fishing nets and ship anchors, plus earthquakes and landslides. Specialised repair ships grapple the cable, splice it on deck and re-lay it. Redundant paths and BGP reroute traffic in the meantime.</p>
        </Card>
      </Grid>
      <p>Cables modelled on this site's globe (approximate routes):</p>
      <Simple head={['Cable / corridor', 'From → to', 'In service']} rows={subsea.map((l) => [<span className="text-ink">{l.name}</span>, `${HUBS.find((h) => h.id === l.a)?.name} → ${HUBS.find((h) => h.id === l.b)?.name}`, l.rfs ?? '—'])} />
      <h3>Light isn't instant</h3>
      <p>Light in glass moves at about 2/3 of c, roughly 204,000 km/s, so every 1,000 km of fiber adds ~4.9 ms one way (~10 ms round trip). Mumbai → Marseille through the Red Sea is ~8,500 km of cable, about 42 ms each way before any router queueing. That's why CDNs put servers near you.<See step="g-core">Watch it</See></p>
      <h3>Satellites</h3>
      <Simple head={['Orbit', 'Altitude', 'Period', 'Typical RTT', 'Examples', 'Notes']} rows={SATELLITES.map((s) => [<b className="text-ink">{s.orbit}</b>, s.alt, s.period, <span className="font-mono">{s.rtt}</span>, s.examples, s.notes])} />
      <p>A LEO dish talks to a satellite overhead in Ku/Ka band, which relays the signal to a ground station (gateway) or, with laser inter-satellite links, along a chain of satellites first. GEO latency is physics: 35,786 km up and down twice per round trip is ~240 ms of light-time before anything else.<See step="g-isp">Try LEO vs GEO</See></p>
      <h3>Inside the data center</h3>
      <p>Servers sit in racks with a top-of-rack (ToR) switch; ToRs connect to every spine switch in a <b>leaf-spine (Clos)</b> fabric, so any two servers are 2–4 hops and microseconds apart, with ECMP spreading flows. Hyperscalers build these from merchant silicon, run BGP or their own SDN controllers, and use VXLAN/EVPN or custom encapsulations for tenant isolation.</p>
    </Section>
  );
}

export function BigNetworks() {
  return (
    <Section id="big-networks" kicker="How the giants do it" title="How big companies run their networks">
      <Grid>
        <Card title="Google">
          <ul>
            <li><b>B4</b>: SDN-controlled private WAN between data centers, run near 100% utilisation.</li>
            <li><b>Espresso</b>: SDN peering edge choosing egress per application using live performance data.</li>
            <li><b>GFE + Maglev</b>: software load balancers terminate TCP/TLS/QUIC at the edge, then requests ride Google's backbone.</li>
            <li>Google Global Cache servers inside ISPs; owns/co-owns many subsea cables (e.g. Dunant, Grace Hopper, Equiano).</li>
          </ul>
        </Card>
        <Card title="Cloudflare" tone="amber">
          <ul>
            <li>Anycast everywhere: the same IPs announced from 330+ cities, so DDoS traffic is absorbed where it starts.</li>
            <li>Every server runs every service (DNS, CDN, WAF, Workers), so any machine can answer any request.</li>
            <li>Unimog (L4 load balancer) and Argo smart routing over its backbone.</li>
          </ul>
        </Card>
        <Card title="Meta" tone="violet">
          <ul>
            <li>Edge PoPs terminate connections close to users; the Express Backbone links data centers.</li>
            <li>Katran: open-source XDP/eBPF L4 load balancer. Proxygen: L7.</li>
            <li>Co-owns cables like MAREA (with Microsoft) and 2Africa.</li>
          </ul>
        </Card>
        <Card title="Netflix" tone="emerald">
          <ul>
            <li><b>Open Connect</b>: Netflix ships cache appliances to ISPs and IXPs for free; most video never crosses the wider internet.</li>
            <li>The control plane (catalogue, accounts, steering) runs on AWS; the data plane (video bytes) is Open Connect.</li>
          </ul>
        </Card>
        <Card title="AWS / Azure / GCP">
          <ul>
            <li><b>Regions</b> made of isolated <b>Availability Zones</b> (separate buildings and power) joined by low-latency fiber.</li>
            <li>Private global backbones; Global Accelerator / Front Door / Cloud CDN put an anycast edge in front of your app.</li>
            <li>Software-defined virtual networks (VPC/VNet) on top: AWS Nitro, Azure SmartNICs, Google Andromeda.</li>
          </ul>
        </Card>
        <Card title="Akamai" tone="violet">
          <ul>
            <li>The original CDN: thousands of server clusters deep inside ISP networks.</li>
            <li>DNS-based mapping system sends each user to the best cluster.</li>
          </ul>
        </Card>
      </Grid>
      <h3>How a change reaches users safely</h3>
      <ul>
        <li><b>DNS traffic shifting</b>: weighted / latency / geo records (Route 53, Azure Traffic Manager) move users between regions; low TTLs make it quick.</li>
        <li><b>Anycast withdrawal</b>: a PoP that fails health checks stops announcing its prefix and BGP moves users to the next nearest one in seconds.</li>
        <li><b>Load-balancer deploys</b>: blue/green and canary releases shift a percentage of requests to the new version; readiness probes keep broken pods out of rotation.</li>
        <li><b>Config pipelines for the network itself</b>: routers and switches are configured from source control (GitOps for the network), validated in simulation, rolled out in stages.</li>
      </ul>
    </Section>
  );
}

export function Cloud() {
  return (
    <Section id="cloud" kicker="Cloud" title="Cloud networking">
      <Grid>
        <Card title="VPC / VNet building blocks">
          <ul>
            <li><b>VPC/VNet</b>: your private address space (e.g. 10.0.0.0/16) in a region.</li>
            <li><b>Subnets</b> per AZ; public ones route 0.0.0.0/0 → Internet Gateway, private ones → NAT Gateway.</li>
            <li><b>Route tables</b>, <b>Security Groups</b> (stateful, per NIC) vs <b>NACLs</b> (stateless, per subnet; Azure NSGs are stateful).</li>
            <li><b>Load balancers</b>: L4 (NLB, Azure LB) vs L7 (ALB, App Gateway) with TLS termination and path routing.</li>
            <li><b>Private endpoints / PrivateLink</b>: reach PaaS services on a private IP; <b>peering</b> and <b>Transit Gateway / Virtual WAN</b> connect many VPCs; VPN or Direct Connect / ExpressRoute to on-prem.</li>
          </ul>
        </Card>
      </Grid>
      <Flow steps={['User', 'DNS (Azure DNS / Route 53)', 'CDN / WAF / Front Door', 'Public load balancer', 'Private subnet', 'VM or service']} />
    </Section>
  );
}

export function Security() {
  return (
    <Section id="security" kicker="Defence" title="Network security essentials">
      <Grid cols={3}>
        <Card title="Firewalls">
          <p>Stateless ACLs match packets; stateful firewalls track connections (conntrack) so replies are allowed automatically. Next-gen firewalls inspect L7 and identify applications.</p>
        </Card>
        <Card title="DDoS" tone="amber">
          <p>Volumetric floods (UDP amplification via DNS, NTP, memcached), protocol attacks (SYN floods, mitigated by SYN cookies) and L7 floods. Defence: anycast scrubbing, rate limits, WAF rules, autoscaling.</p>
        </Card>
        <Card title="Zero trust & VPN" tone="emerald">
          <p>Don't trust the network location: authenticate every request (identity-aware proxies, mTLS). VPNs (IPsec, WireGuard) encrypt site-to-site and remote-access links.</p>
        </Card>
      </Grid>
      <ul>
        <li><b>Common attacks</b>: ARP spoofing on LANs, DNS cache poisoning (defeated by random IDs/ports and DNSSEC), BGP hijacks (RPKI), TLS downgrade (prevented by TLS 1.3 + HSTS).</li>
        <li><b>Segmentation</b>: VLANs, subnets, security groups and network policies limit how far an attacker can move.</li>
      </ul>
    </Section>
  );
}

export function Toolkit() {
  return (
    <Section id="toolkit" kicker="Hands-on" title="Troubleshooting toolkit">
      <p>Work bottom-up: link → IP/route → DNS → TCP port → TLS → HTTP. Each command tests one layer.</p>
      <Simple head={['Command', 'What it tells you']} rows={TOOLS.map(([c, d]) => [<code className="whitespace-pre-wrap break-all">{c}</code>, d])} />
    </Section>
  );
}

export function Glossary() {
  return (
    <Section id="glossary" kicker="A–Z" title="Glossary">
      <div className="grid gap-3 md:grid-cols-2">
        {[...CONCEPTS].sort((a, b) => a.term.localeCompare(b.term)).map((c) => (
          <details key={c.id} className="glass p-4">
            <summary className="cursor-pointer font-semibold text-ink">
              {c.term} {c.aka && <span className="ml-1 text-xs font-normal text-slate-500">{c.aka}</span>}
              <p className="mt-1 text-sm font-normal text-slate-500">{c.short}</p>
            </summary>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              {c.body.map((b, i) => <p key={i}>{b}</p>)}
              {c.example && <p className="font-mono text-xs text-blue-600">{c.example}</p>}
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}
