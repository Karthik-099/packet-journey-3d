import { useState } from 'react';
import { Section } from './ui';

/** Questions that come up in DevOps / SRE / network interviews, with short model answers. */
const QA: [string, string][] = [
  ['What happens when you type a URL and press Enter?', 'Input → URL parsing/HSTS → caches → DNS (stub → recursive → root → TLD → authoritative) → ARP for the gateway → NAT → ISP/BGP routing → TCP handshake → TLS 1.3 handshake (SNI, certificate) → HTTP request → load balancer/backend → response → parse DOM/CSSOM → layout → paint → composite. This whole site is a walkthrough of exactly that.'],
  ['TCP vs UDP: when would you pick each?', 'TCP gives a reliable ordered stream with congestion control: web, APIs, databases, SSH. UDP is connectionless with no retransmission: DNS, VoIP, games, video calls, and QUIC (which rebuilds reliability per stream in user space).'],
  ['Explain the TCP 3-way handshake and why it is three steps.', 'SYN (client ISN) → SYN-ACK (server ISN, ack client ISN+1) → ACK. Both sides must learn and confirm the other\'s initial sequence number; two messages would leave the server unsure the client received its ISN.'],
  ['What is the difference between a switch and a router?', 'A switch forwards frames inside one L2 network by MAC address (learning a MAC table). A router forwards packets between networks by IP address using a routing table, decrementing TTL and rewriting the L2 header on every hop.'],
  ['What does a /26 give you?', '64 addresses: mask 255.255.255.192, 62 usable hosts (network and broadcast reserved). In AWS, 5 addresses per subnet are reserved, so 59 usable.'],
  ['How does NAT work and what problems does it cause?', 'The router rewrites private src IP:port to its public IP:port and records the mapping so replies return. It breaks inbound connections (needs port forwarding, STUN/TURN for WebRTC), hides clients behind one IP (rate limits, logging) and adds state that can run out (port exhaustion on NAT gateways).'],
  ['502 vs 503 vs 504?', '502: the proxy got an invalid response or reset from upstream (crash, wrong port/protocol). 503: no healthy upstream / overloaded. 504: upstream didn\'t answer in time (slow queries, timeouts, dropped packets).'],
  ['401 vs 403?', '401: not authenticated (missing/invalid credentials). 403: authenticated or not, you are not authorised for this resource.'],
  ['How does DNS resolution work, and what is TTL?', 'A recursive resolver walks the hierarchy (root → TLD → authoritative) and caches every answer for its TTL. Lower TTLs mean faster changes and failover, higher TTLs mean fewer queries.'],
  ['What is anycast and who uses it?', 'The same IP prefix is announced from many locations; BGP sends each user to the topologically nearest one. Used by DNS roots, public resolvers (8.8.8.8, 1.1.1.1) and CDNs, and it spreads DDoS traffic across sites.'],
  ['How does TLS establish trust and keys?', 'The server presents a certificate chain to a trusted root; the client checks hostname, dates and chain. Keys come from an ephemeral (EC)DHE exchange (forward secrecy); the server signs the handshake to prove it holds the private key.'],
  ['How does BGP choose a path?', 'Highest local-preference (policy: customer > peer > transit), shortest AS-path, lowest origin type, lowest MED, eBGP over iBGP, lowest IGP cost to the next hop, then tie-breakers such as router ID.'],
  ['What is MTU, and how do you debug MTU problems?', 'The largest packet a link carries (1500 on Ethernet). Tunnels reduce it. Symptoms: small requests work but large ones hang. Test with ping -M do -s 1472, and fix with MSS clamping or allowing ICMP "fragmentation needed".'],
  ['Security group vs NACL (AWS)?', 'Security groups are stateful allow-lists attached to network interfaces (return traffic is automatic). NACLs are stateless, ordered allow/deny rules on a subnet (you must allow return/ephemeral ports).'],
  ['How do Kubernetes Services route to pods?', 'A Service gets a virtual ClusterIP; kube-proxy (iptables/IPVS) or an eBPF CNI rewrites traffic to a ready pod endpoint. CoreDNS resolves the service name. Ingress or the Gateway API adds L7 routing from outside.'],
  ['Where would you start when "the website is slow"?', 'Break it down by layer and time: curl -w for DNS, connect, TLS and TTFB; check RTT/loss with mtr; check server time and saturation (CPU, DB, queueing); then look at CDN cache hit ratio and page weight.'],
];

export function Interview() {
  return (
    <Section id="interview" kicker="Career" title="Interview questions (DevOps / SRE / network)">
      <div className="space-y-2">
        {QA.map(([q, a]) => (
          <details key={q} className="glass p-4">
            <summary className="cursor-pointer font-medium text-white">{q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

interface Q {
  q: string;
  options: string[];
  answer: number;
  why: string;
}
export const QUIZ: Q[] = [
  { q: 'Which layer adds the destination MAC address?', options: ['L4 Transport', 'L3 Network', 'L2 Data Link', 'L1 Physical'], answer: 2, why: 'MAC addresses live in the Ethernet/Wi-Fi header: Layer 2.' },
  { q: 'A host at 10.0.1.20/24 wants to reach 10.0.2.5. Where does it send the frame?', options: ['Directly to 10.0.2.5', 'To its default gateway', 'Broadcast to everyone', 'To the DNS server'], answer: 1, why: '10.0.2.5 is outside 10.0.1.0/24, so the frame goes to the gateway (the IP destination stays 10.0.2.5).' },
  { q: 'Which DNS server says "I don\'t know, ask the .com servers"?', options: ['Recursive resolver', 'Root server', 'Authoritative server', 'Stub resolver'], answer: 1, why: 'Root servers only refer resolvers to the right TLD servers.' },
  { q: 'Your load balancer returns 504. Most likely cause?', options: ['Wrong password', 'Upstream too slow to respond', 'Page does not exist', 'TLS certificate expired on the client'], answer: 1, why: '504 Gateway Timeout means the proxy gave up waiting for the backend.' },
  { q: 'Why is TLS 1.3 faster than TLS 1.2 on a new connection?', options: ['Smaller certificates', '1 round trip instead of 2', 'It skips encryption', 'It uses UDP'], answer: 1, why: 'Key shares are sent in the first flight, so the handshake completes in 1 RTT.' },
  { q: 'Roughly how long does light take through 1,000 km of fiber?', options: ['0.5 ms', '5 ms', '50 ms', '500 ms'], answer: 1, why: '~204,000 km/s in glass → ~4.9 ms per 1,000 km one way.' },
  { q: 'What do submarine cable repeaters do?', options: ['Route packets by IP', 'Optically amplify the light every 60–80 km', 'Encrypt the traffic', 'Store a cache of websites'], answer: 1, why: 'EDFA amplifiers boost all wavelengths optically; they don\'t look at packets.' },
  { q: 'Typical round-trip time over a GEO satellite?', options: ['~5 ms', '~40 ms', '~150 ms', '~600 ms'], answer: 3, why: '35,786 km up and down, twice per round trip ≈ 480 ms of light-time plus processing.' },
  { q: 'Which protocol carries routes between autonomous systems?', options: ['OSPF', 'BGP', 'ARP', 'RIP'], answer: 1, why: 'BGP is the inter-domain routing protocol of the internet (TCP 179).' },
  { q: 'Which port does the Kubernetes API server listen on by default?', options: ['443', '6443', '8080', '10250'], answer: 1, why: '6443; 10250 is the kubelet.' },
  { q: 'What does TTL in an IP header prevent?', options: ['Replay attacks', 'Packets looping forever', 'Fragmentation', 'Slow DNS'], answer: 1, why: 'Each router decrements it; at 0 the packet is dropped (and traceroute uses that).' },
  { q: 'HTTP/3 runs on top of…', options: ['TCP', 'QUIC over UDP', 'SCTP', 'Raw IP'], answer: 1, why: 'HTTP/3 maps requests onto QUIC streams, and QUIC runs over UDP.' },
];

export function Quiz() {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const score = QUIZ.filter((q, i) => picked[i] === q.answer).length;
  const done = Object.keys(picked).length;
  return (
    <Section id="quiz" kicker="Practice" title="Test yourself">
      <p>
        {done ? (
          <>
            Score: <b className="text-white">{score}</b> / {done} answered ({QUIZ.length} total).
          </>
        ) : (
          'Pick an answer to see the explanation.'
        )}
        {done > 0 && (
          <button onClick={() => setPicked({})} className="ml-3 text-sm text-cyan-300 underline">
            reset
          </button>
        )}
      </p>
      <ol className="mt-4 grid gap-4 md:grid-cols-2">
        {QUIZ.map((q, i) => {
          const p = picked[i];
          return (
            <li key={i} className="glass p-4">
              <p className="font-medium text-white">
                {i + 1}. {q.q}
              </p>
              <div className="mt-3 grid gap-2" role="radiogroup" aria-label={q.q}>
                {q.options.map((o, j) => {
                  const state = p === undefined ? '' : j === q.answer ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200' : j === p ? 'border-rose-400/60 bg-rose-400/10 text-rose-200' : 'opacity-60';
                  return (
                    <button key={o} role="radio" aria-checked={p === j} disabled={p !== undefined} onClick={() => setPicked({ ...picked, [i]: j })} className={`rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-200 transition enabled:hover:border-cyan-300/50 ${state}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
              {p !== undefined && <p className="mt-2 text-sm text-slate-400">{p === q.answer ? 'Correct. ' : 'Not quite. '}{q.why}</p>}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
