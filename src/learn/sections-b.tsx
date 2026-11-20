import { useState } from 'react';
import { Card, FilterTable, Flow, Grid, Section, See, Simple } from './ui';
import { TCP_FLAGS, TCP_STATES, ICMP_TYPES } from '../content/reference/misc';
import { HTTP_STATUS, type Status } from '../content/reference/http-status';
import { PORTS, PORT_RANGES, type Port } from '../content/reference/ports';
import { PROTOCOLS, type Protocol } from '../content/reference/protocols';
import { LossLab, CwndChart } from './labs';

export function Transport() {
  return (
    <Section id="transport" kicker="L4" title="TCP, UDP and QUIC">
      <Grid cols={3}>
        <Card title="TCP: reliable stream">
          <ul>
            <li>3-way handshake: SYN → SYN-ACK → ACK (1 RTT).</li>
            <li>Sequence numbers + ACKs: lost data is retransmitted, out-of-order data is reordered.</li>
            <li>Flow control: the receive window says how much the receiver can buffer.</li>
            <li>Congestion control (CUBIC, BBR): slow start from ~10 segments, back off on loss/delay.</li>
            <li>Closing: FIN/ACK each way, or RST to abort.</li>
          </ul>
          <See step="hi-l4-handshake">Handshake</See>
        </Card>
        <Card title="UDP: just datagrams" tone="violet">
          <ul>
            <li>8-byte header: ports, length, checksum.</li>
            <li>No handshake, no retransmission, no ordering.</li>
            <li>Great when the app handles loss itself or old data is useless: DNS, VoIP, gaming, video calls, QUIC.</li>
          </ul>
        </Card>
        <Card title="QUIC: modern transport over UDP" tone="emerald">
          <ul>
            <li>TLS 1.3 built in: transport + crypto handshake in 1 RTT, 0-RTT on resume.</li>
            <li>Independent streams: one lost packet doesn't stall the others.</li>
            <li>Connection IDs survive Wi-Fi ↔ 4G switches.</li>
            <li>Runs in user space, so it evolves fast. Carries HTTP/3.</li>
          </ul>
        </Card>
      </Grid>
      <LossLab />
      <CwndChart />
      <h3>TCP flags</h3>
      <Simple head={['Flag', 'Meaning']} rows={TCP_FLAGS.map(([f, d]) => [<span className="font-mono text-violet-600">{f}</span>, d])} />
      <h3>TCP states (what <code>ss -tan</code> shows)</h3>
      <Simple head={['State', 'Meaning']} rows={TCP_STATES.map(([f, d]) => [<span className="font-mono text-ink">{f}</span>, d])} />
      <h3>ICMP messages</h3>
      <Simple head={['Type', 'Name', 'Notes']} rows={ICMP_TYPES.map(([t, n, d]) => [t, <span className="text-ink">{n}</span>, d])} />
      <h3>MTU, MSS and fragmentation</h3>
      <p>Ethernet MTU is 1500 bytes; minus 20 (IP) and 20 (TCP) gives an MSS of 1460. Tunnels shrink it: PPPoE 1492, IPsec/VXLAN/WireGuard less. Packets with DF set that don't fit trigger ICMP "Fragmentation Needed"; if a firewall drops that ICMP, connections hang on large transfers (the classic "PMTUD black hole"). Fix: MSS clamping.</p>
    </Section>
  );
}

export function Tls() {
  return (
    <Section id="tls" kicker="L6 / security" title="TLS and HTTPS">
      <p>TLS gives three guarantees: <b>confidentiality</b> (nobody can read it), <b>integrity</b> (nobody can change it unnoticed) and <b>authentication</b> (you are talking to the real domain owner). HTTPS is simply HTTP inside TLS.</p>
      <h3>The TLS 1.3 handshake (1 round trip)</h3>
      <Flow steps={['ClientHello: versions, ciphers, SNI, ALPN, key_share', 'ServerHello: chosen cipher + key_share', 'EncryptedExtensions (encrypted)', 'Certificate (encrypted)', 'CertificateVerify (encrypted)', 'Finished (encrypted)', 'Client Finished + HTTP request']} />
      <p>
        Both sides combine their key shares with (EC)Diffie-Hellman (X25519, or the post-quantum hybrid X25519MLKEM768 in current browsers) to derive the same secret without ever sending it. That's <b>forward secrecy</b>: stealing the server's private key later
        doesn't decrypt old traffic. The certificate only proves identity: the server signs the handshake transcript with its private key (CertificateVerify).<See step="g-tls">TLS in 3D</See>
      </p>
      <Grid>
        <Card title="Certificates & PKI">
          <ul>
            <li>Leaf certificate (domain) ← intermediate CA ← root CA in your OS/browser trust store.</li>
            <li>Browsers check: chain, hostname (SAN), dates, revocation, and Certificate Transparency logs.</li>
            <li>ACME (Let's Encrypt, cert-manager in Kubernetes) automates issuance and renewal.</li>
          </ul>
        </Card>
        <Card title="Things you'll meet in ops" tone="violet">
          <ul>
            <li><b>SNI</b>: hostname in the ClientHello so one IP can serve many certificates. ECH encrypts it.</li>
            <li><b>ALPN</b>: negotiates h2 / http/1.1 inside the handshake.</li>
            <li><b>mTLS</b>: the client presents a certificate too (service meshes, zero trust).</li>
            <li><b>TLS termination</b> at a load balancer/ingress, optionally re-encrypting to the backend.</li>
            <li><b>HSTS</b>: tells browsers to always use HTTPS for a domain.</li>
          </ul>
        </Card>
      </Grid>
    </Section>
  );
}

const STATUS_CLASS: Record<string, string> = { '1': 'text-sky-600', '2': 'text-emerald-600', '3': 'text-violet-600', '4': 'text-amber-600', '5': 'text-rose-600' };

export function Http() {
  const [cls, setCls] = useState('all');
  const rows = HTTP_STATUS.filter((s) => cls === 'all' || String(s.code)[0] === cls || (cls === 'vendor' && s.nonStandard)).sort((a, b) => a.code - b.code);
  return (
    <Section id="http" kicker="L7" title="HTTP: methods, versions and every status code">
      <Grid>
        <Card title="Methods">
          <ul>
            <li><b>GET</b> read · <b>HEAD</b> headers only · <b>OPTIONS</b> capabilities (CORS preflight)</li>
            <li><b>POST</b> create / process · <b>PUT</b> replace · <b>PATCH</b> partial update · <b>DELETE</b> remove</li>
            <li>Safe: GET, HEAD, OPTIONS. Idempotent: those + PUT, DELETE. Retrying POST can duplicate actions.</li>
          </ul>
        </Card>
        <Card title="Versions" tone="violet">
          <ul>
            <li><b>HTTP/1.1</b>: text, one request at a time per connection; browsers open ~6 per host.</li>
            <li><b>HTTP/2</b>: binary frames, many streams on one TCP connection, HPACK. A lost TCP packet stalls all streams.</li>
            <li><b>HTTP/3</b>: same semantics over QUIC; no transport head-of-line blocking.</li>
          </ul>
        </Card>
      </Grid>
      <h3>Status codes</h3>
      <p>The first digit is the class: 1xx informational, 2xx success, 3xx redirection, 4xx client error, 5xx server error. The "In production" column shows the usual real-world causes.</p>
      <div className="flex flex-wrap gap-2">
        {[['all', 'All'], ['1', '1xx'], ['2', '2xx'], ['3', '3xx'], ['4', '4xx'], ['5', '5xx'], ['vendor', 'nginx / Cloudflare']].map(([v, l]) => (
          <button key={v} onClick={() => setCls(v!)} className={`rounded-lg border px-3 py-1 text-sm ${cls === v ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-200/70 text-slate-500 hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      <FilterTable<Status>
        key={cls}
        rows={rows}
        placeholder="Search codes, e.g. 502, gateway, rate"
        text={(s) => `${s.code} ${s.name} ${s.meaning} ${s.ops ?? ''} ${s.nonStandard ?? ''}`}
        cols={[
          { h: 'Code', cell: (s) => <span className={`font-mono font-bold ${STATUS_CLASS[String(s.code)[0]!]}`}>{s.code}</span> },
          { h: 'Name', cell: (s) => <span className="text-ink">{s.name}{s.nonStandard && <span className="ml-1 rounded bg-violet-100 px-1 text-[10px] text-slate-500">{s.nonStandard}</span>}</span> },
          { h: 'Meaning', cell: (s) => s.meaning },
          { h: 'In production', cell: (s) => <span className="text-slate-500">{s.ops ?? ''}</span> },
        ]}
      />
      <h3>401 vs 403, 502 vs 503 vs 504</h3>
      <Grid>
        <Card title="401 vs 403" tone="amber">
          <p><b>401</b>: "I don't know who you are": log in or send a valid token. <b>403</b>: "I know who you are, and you're not allowed": fix permissions/policy, not credentials.</p>
        </Card>
        <Card title="502 / 503 / 504" tone="amber">
          <p>All come from a proxy or load balancer in front of your app. <b>502</b>: upstream answered with garbage or reset (crashed, wrong port/protocol). <b>503</b>: no healthy upstream (readiness failing, overloaded). <b>504</b>: upstream too slow (timeouts, slow query, firewall silently dropping).</p>
        </Card>
      </Grid>
    </Section>
  );
}

export function Ports() {
  return (
    <Section id="ports" kicker="L4" title="Ports you should know">
      <Simple head={['Range', 'Name', 'Notes']} rows={PORT_RANGES.map((r) => [<span className="font-mono text-violet-600">{r.range}</span>, <span className="text-ink">{r.name}</span>, r.note])} />
      <FilterTable<Port>
        rows={[...PORTS].sort((a, b) => parseInt(a.port) - parseInt(b.port))}
        placeholder="Search ports, e.g. 443, ssh, kubernetes, database"
        text={(p) => `${p.port} ${p.proto} ${p.service} ${p.use}`}
        cols={[
          { h: 'Port', cell: (p) => <span className="font-mono font-bold text-violet-600">{p.port}</span>, cls: 'whitespace-nowrap' },
          { h: 'Proto', cell: (p) => <span className="font-mono text-xs">{p.proto}</span> },
          { h: 'Service', cell: (p) => <span className="text-ink">{p.service}</span> },
          { h: 'Used for', cell: (p) => p.use },
        ]}
      />
    </Section>
  );
}

export function Protocols() {
  return (
    <Section id="protocols" kicker="Directory" title="Protocol directory">
      <p>{PROTOCOLS.length} protocols grouped by where they live in the stack. Search by name, layer ("L3"), port or purpose.</p>
      <FilterTable<Protocol>
        rows={PROTOCOLS}
        placeholder="Search protocols, e.g. L2, VPN, routing, 443"
        text={(p) => `${p.name} ${p.full} ${p.layer} ${p.transport} ${p.what} ${p.rfc ?? ''}`}
        cols={[
          { h: 'Protocol', cell: (p) => <div><div className="font-semibold text-ink">{p.name}</div><div className="text-xs text-slate-500">{p.full}</div></div> },
          { h: 'Layer', cell: (p) => <span className="font-mono text-xs text-violet-600">{p.layer}</span>, cls: 'whitespace-nowrap' },
          { h: 'Runs over', cell: (p) => <span className="font-mono text-xs">{p.transport}</span> },
          { h: 'What it does', cell: (p) => p.what },
          { h: 'Spec', cell: (p) => <span className="text-xs text-slate-500">{p.rfc ?? ''}</span> },
        ]}
      />
    </Section>
  );
}
