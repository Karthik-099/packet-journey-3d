import { useEffect, useMemo, useState } from 'react';
import type { Ctx, Step } from '../content';
import { useStore } from '../store';
import { charBreakdown, bin, hex } from '../lib/bytes';
import { HI, dstPort } from '../lib/hi';
import { NET, natTable, rtt, serverIp, traceroute, wanIp, oneWay } from '../content/journey-google';
import { cidrInfo, sameSubnet } from '../lib/cidr';
import { Seg, Simplified } from './ui';
import { WorldMap } from './WorldMap';
import { HeaderDiagram } from './HeaderDiagram';
import { TripSummary } from './TripSummary';
import { Incident } from './Incident';
import { LiveBgp, MeasuredPath } from './Measured';
import { useReducedMotion } from '../hooks';

const Box = ({ children }: { children: React.ReactNode }) => <div className="rounded-md border border-noc-edge bg-black/30 p-2 text-xs">{children}</div>;

function Utf8({ c }: { c: Ctx }) {
  const tls = useStore((s) => s.tls);
  const set = useStore((s) => s.set);
  const rows = charBreakdown(c.message).slice(0, 12);
  return (
    <Box>
      <table className="w-full font-mono text-[11px]">
        <thead className="text-slate-500">
          <tr><th className="text-left">char</th><th className="text-left">code point</th><th className="text-left">hex</th><th className="text-left">binary</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              <td className="text-noc-amber">{r.ch === ' ' ? '␠' : r.ch}</td>
              <td>U+{r.cp.toString(16).toUpperCase().padStart(4, '0')}</td>
              <td className="text-noc-cyan">{r.bytes.map(hex).join(' ')}</td>
              <td className="text-slate-400">{r.bytes.map(bin).join(' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2">
        <button className={`btn text-xs ${tls ? 'btn-on' : ''}`} onClick={() => set({ tls: !tls })}>
          {tls ? 'TLS on (encrypted)' : 'Encrypt with TLS'}
        </button>
        {tls && <span className="break-all font-mono text-[10px] text-violet-300">{Array.from(c.hi.l6.slice(5, 21), hex).join(' ')}…</span>}
      </div>
    </Box>
  );
}

function Session({ c }: { c: Ctx }) {
  const rows = [
    ['TCP connection', `${HI.srcIp}:${HI.srcPort} ↔ ${HI.dstIp}:${dstPort(c.tls)}`],
    ['TLS session', c.tls ? 'keys + resumption ticket' : 'off'],
    ['App session', 'login cookie / token'],
  ];
  return <Box><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-mono text-noc-cyan">{v}</dd></div>)}</dl></Box>;
}

function Handshake({ c }: { c: Ctx }) {
  const journey = useStore((s) => s.journey);
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? 3 : 0);
  useEffect(() => {
    if (reduced) return;
    setN(0);
    const t = setInterval(() => setN((x) => (x >= 3 ? 0 : x + 1)), 900);
    return () => clearInterval(t);
  }, [reduced, journey]);
  if (journey === 'google' && c.quic) return <Box>QUIC skips the TCP handshake. Its 1-RTT handshake is shown in the TLS step.</Box>;
  const [ci, si] = journey === 'hi' ? [HI.clientIsn, HI.serverIsn] : [0x2b7e1516, 0x5ac1c0de];
  const msgs = [
    { dir: 1, label: 'SYN', d: `seq=${ci}` },
    { dir: -1, label: 'SYN-ACK', d: `seq=${si} ack=${ci + 1}` },
    { dir: 1, label: 'ACK', d: `seq=${ci + 1} ack=${si + 1}` },
  ];
  return (
    <Box>
      <div className="flex justify-between font-mono text-[10px] text-slate-500"><span>client</span><span>{journey === 'hi' ? 'receiver' : c.target.domain}</span></div>
      {msgs.map((m, i) => (
        <div key={i} className={`my-1 transition-opacity duration-300 ${i < n ? 'opacity-100' : 'opacity-15'}`}>
          <div className={`flex items-center gap-1 ${m.dir < 0 ? 'flex-row-reverse' : ''}`}>
            <span className="h-px flex-1 bg-noc-cyan" />
            <span className="text-noc-cyan">{m.dir > 0 ? '→' : '←'}</span>
          </div>
          <div className="text-center font-mono text-[11px]"><b className="text-noc-amber">{m.label}</b> <span className="text-slate-400">{m.d}</span></div>
        </div>
      ))}
      {journey === 'google' && <p className="mt-1 text-slate-400">Costs 1 RTT ≈ {Math.round(rtt(c))} ms on this path.</p>}
    </Box>
  );
}

function Subnet({ src, dst, prefix }: { src: string; dst: string; prefix: number }) {
  const a = cidrInfo(src, prefix);
  const b = cidrInfo(dst, prefix);
  const same = sameSubnet(src, dst, prefix);
  const grp = (bits: string) => bits.match(/.{8}/g)!.join(' ');
  return (
    <Box>
      <p className="mb-1 text-slate-400">Routing decision: is the destination in my subnet? (dst AND mask == my network?)</p>
      <div className="overflow-x-auto font-mono text-[10.5px] leading-5">
        <div><span className="inline-block w-20 text-slate-500">mask /{prefix}</span>{grp(a.maskBits)} <span className="text-slate-500">{a.mask}</span></div>
        <div><span className="inline-block w-20 text-slate-500">me</span>{grp(a.ipBits)} <span className="text-slate-500">{src} → {a.network}</span></div>
        <div><span className="inline-block w-20 text-slate-500">dst</span>{grp(b.ipBits)} <span className="text-slate-500">{dst} → {b.network}</span></div>
      </div>
      <p className={`mt-1 ${same ? 'text-noc-green' : 'text-noc-amber'}`}>
        {same ? `Same network → deliver directly (ARP for ${dst})` : `Different network → send to default gateway ${NET.router} (ARP for the gateway)`}
      </p>
      <p className="text-slate-500">{src}: {a.kind} · {dst}: {b.kind}</p>
    </Box>
  );
}

function Arp({ c }: { c: Ctx }) {
  const journey = useStore((s) => s.journey);
  const [ip, mac, tgt] = journey === 'hi' ? [HI.srcIp, HI.srcMac, HI.dstIp] : [NET.laptop, NET.laptopMac, NET.router];
  const tmac = journey === 'hi' ? HI.dstMac : NET.routerMac;
  return (
    <div className="space-y-2">
      {journey === 'google' && <Subnet src={NET.laptop} dst={serverIp(c)} prefix={24} />}
      <Box>
        <div className="font-mono text-[11px] leading-5">
          <div><span className="text-noc-amber">REQUEST</span> → ff:ff:ff:ff:ff:ff (broadcast)</div>
          <div className="pl-4 text-slate-300">Who has {tgt}? Tell {ip} ({mac})</div>
          <div className="mt-1"><span className="text-noc-green">REPLY</span> → {mac} (unicast)</div>
          <div className="pl-4 text-slate-300">{tgt} is at {tmac}</div>
          <div className="mt-1 text-slate-500">ARP cache: {tgt} → {tmac} (REACHABLE)</div>
        </div>
      </Box>
    </div>
  );
}

function Waveform({ c }: { c: Ctx }) {
  const medium = useStore((s) => s.medium);
  const set = useStore((s) => s.set);
  const [off, setOff] = useState(0);
  const bytes = Array.from(c.hi.wire.slice(off, off + 3));
  // Ethernet transmits LSB first
  const bits = bytes.flatMap((b) => Array.from({ length: 8 }, (_, i) => (b >> i) & 1));
  const W = 24, Hh = 40;
  const d = useMemo(() => {
    const p: string[] = [];
    bits.forEach((bit, i) => {
      const x = i * W;
      if (medium === 'copper') {
        // IEEE 802.3 Manchester: 1 = low→high, 0 = high→low at mid-bit
        const [y1, y2] = bit ? [Hh - 5, 5] : [5, Hh - 5];
        p.push(`${i ? 'L' : 'M'}${x},${y1} L${x + W / 2},${y1} L${x + W / 2},${y2} L${x + W},${y2}`);
      } else if (medium === 'fiber') {
        const y = bit ? 5 : Hh - 5;
        p.push(`${i ? 'L' : 'M'}${x},${y} L${x + W},${y}`);
      } else {
        for (let k = 0; k <= 12; k++) {
          const t = k / 12;
          const y = Hh / 2 + (bit ? 1 : -1) * Math.sin(t * Math.PI * 4) * (Hh / 2 - 5);
          p.push(`${i || k ? 'L' : 'M'}${(x + t * W).toFixed(1)},${y.toFixed(1)}`);
        }
      }
    });
    return p.join(' ');
  }, [bits, medium]);
  const color = medium === 'copper' ? '#fbbf24' : medium === 'fiber' ? '#22d3ee' : '#a78bfa';
  const label = off < 7 ? 'preamble' : off === 7 ? 'SFD' : 'frame';
  return (
    <Box>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Seg label="Medium" value={medium} onChange={(m) => set({ medium: m })} options={[{ v: 'copper', l: 'Copper' }, { v: 'fiber', l: 'Fiber' }, { v: 'wifi', l: 'Wi-Fi' }]} />
        <Simplified note="Picture of the line code (Manchester / on-off light / BPSK), not exact analog levels." />
      </div>
      <svg viewBox={`0 -4 ${bits.length * W} ${Hh + 22}`} className="w-full" role="img" aria-label={`${medium} waveform of bytes ${bytes.map(hex).join(' ')}`}>
        {bits.map((b, i) => (
          <g key={i}>
            <line x1={i * W} x2={i * W} y1={0} y2={Hh} stroke="#1c2540" />
            <text x={i * W + W / 2} y={Hh + 14} fontSize={10} textAnchor="middle" fill="#94a3b8" fontFamily="monospace">{b}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke={color} strokeWidth={2} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      </svg>
      <label className="mt-1 flex items-center gap-2 text-slate-400">
        byte {off}–{off + 2} ({label}: {bytes.map(hex).join(' ')})
        <input type="range" min={0} max={c.hi.wire.length - 3} value={off} onChange={(e) => setOff(+e.target.value)} className="flex-1" aria-label="Byte offset" />
      </label>
    </Box>
  );
}

function Checks({ step, c }: { step: Step; c: Ctx }) {
  const checks = step.checks?.(c) ?? [];
  return (
    <ul className="space-y-1">
      {checks.map((k, i) => (
        <li key={i} className="flex items-center gap-2 rounded border border-noc-edge bg-black/30 px-2 py-1 text-xs">
          <span className={k.ok ? 'text-noc-green' : 'text-noc-rose'} aria-hidden>{k.ok ? 'PASS' : 'FAIL'}</span>
          <span>{k.label}</span>
          <span className="sr-only">{k.ok ? 'passed' : 'failed'}</span>
          {k.detail && <span className="ml-auto font-mono text-[10px] text-slate-500">{k.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

function Result({ c }: { c: Ctx }) {
  return (
    <Box>
      <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-sm bg-noc-cyan/20 px-3 py-2 text-base text-white">{c.message}</div></div>
      <p className="mt-2 text-right text-[10px] text-slate-500">delivered · {c.hi.wire.length} bytes on the wire</p>
    </Box>
  );
}

function Keyboard() {
  const reduced = useReducedMotion();
  const [row, setRow] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setRow((r) => (r + 1) % 4), 250);
    return () => clearInterval(t);
  }, [reduced]);
  const keys = [['Esc', 'Q', 'W', 'E'], ['Tab', 'A', 'S', 'D'], ['Shift', 'Z', 'X', 'C'], ['Ctrl', 'Space', 'Enter', '→']];
  return (
    <Box>
      <p className="mb-1 text-slate-400">The MCU drives one row at a time and reads the columns: a closed switch connects them.</p>
      <div className="grid grid-cols-4 gap-1">
        {keys.flat().map((k, i) => {
          const r = Math.floor(i / 4);
          const enter = k.includes('Enter');
          return (
            <div key={k} className={`rounded border px-1 py-1 text-center font-mono text-[10px] ${enter ? 'border-noc-amber bg-noc-amber/20 text-noc-amber' : r === row ? 'border-noc-cyan/60 text-noc-cyan' : 'border-noc-edge text-slate-500'}`}>
              {k}
            </div>
          );
        })}
      </div>
      <p className="mt-1 font-mono text-[10px] text-slate-400">matrix (row 3, col 2) → HID usage 0x28 → PS/2 set-1 scan code 0x1C → Linux KEY_ENTER (28)</p>
    </Box>
  );
}

function Url() {
  const steps = ['google.com', 'looks like a host, not a search', 'HSTS preload: yes → force https', 'https://google.com:443/'];
  return <Box><ol className="flex flex-wrap items-center gap-1 font-mono text-[11px]">{steps.map((s, i) => <li key={i} className="flex items-center gap-1">{i > 0 && <span className="text-slate-600">→</span>}<span className={i === 3 ? 'text-noc-green' : 'text-slate-300'}>{s}</span></li>)}</ol></Box>;
}

const DNS_IDS = ['g-dns-stub', 'g-dns-recursive', 'g-dns-root', 'g-dns-tld', 'g-dns-auth', 'g-dns-answer'];
function Dns({ step, c }: { step: Step; c: Ctx }) {
  const go = useStore((s) => s.go);
  const at = DNS_IDS.indexOf(step.id);
  const t = c.target;
  const ip = serverIp(c);
  const final = t.cname.at(-1) ?? t.domain;
  const rows = [
    ['you', '8.8.8.8', `${t.domain} A? (RD=1)`, 'UDP 53 · anycast → nearest Google DNS site'],
    ['8.8.8.8', 'cache', 'miss', 'cache checked first'],
    ['8.8.8.8', 'a.root-servers.net 198.41.0.4', `→ referral: ${t.tld}. NS ${t.tldNs[0] ?? '?'}`, 'root, anycast'],
    ['8.8.8.8', `${t.tldNs[0] ?? 'TLD'} ${t.tldNsIp ?? ''}`, `→ referral: ${t.zone} NS ${t.ns[0] ?? '?'}`, `.${t.tld} TLD registry`],
    ['8.8.8.8', `${t.ns[0] ?? 'NS'} ${t.nsIp ?? ''}`, `→ ${t.cname.length ? `CNAME ${final}, ` : ''}A ${ip} (AA, TTL ${t.ttl})`, t.nsAnycast ? 'authoritative, anycast' : `authoritative${t.nsGeo ? ' · ' + [t.nsGeo.city, t.nsGeo.country].filter(Boolean).join(', ') : ''}`],
    ['8.8.8.8', 'you', `${t.domain} A ${ip}`, 'cached by resolver, OS, browser'],
  ];
  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={i}>
          <button onClick={() => go(useStore.getState().index + (i - at))} className={`w-full rounded border px-2 py-1 text-left text-[11px] transition ${i === at ? 'border-noc-cyan/70 bg-noc-cyan/10' : i < at ? 'border-noc-edge text-slate-400' : 'border-noc-edge/50 text-slate-600'}`}>
            <span className="font-mono text-noc-amber">{i + 1}</span> <span className="font-mono">{r[0]} → {r[1]}</span>
            <div className="break-all pl-3 font-mono text-slate-300">{r[2]}</div>
            <div className="pl-3 text-[10px] text-slate-500">{r[3]}</div>
          </button>
        </li>
      ))}
      {!t.live && <li className="text-[10px] text-slate-500">Built-in example data. Type a domain above for a live lookup.</li>}
    </ol>
  );
}

function Nat({ c }: { c: Ctx }) {
  return (
    <Box>
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-mono text-[11px]">
        <div className="rounded border border-noc-edge p-1"><div className="text-slate-500">before (LAN side)</div>src {NET.laptop}:{NET.sport}<br />TTL 64</div>
        <span className="text-noc-cyan">⇒</span>
        <div className="rounded border border-noc-cyan/50 p-1"><div className="text-slate-500">after (WAN side)</div>src <span className="text-noc-cyan">{wanIp(c)}:{NET.natPort}</span><br />TTL 63</div>
      </div>
      <table className="w-full font-mono text-[10.5px]">
        <thead className="text-slate-500"><tr><th className="text-left">proto</th><th className="text-left">inside</th><th className="text-left">outside</th><th className="text-left">remote</th></tr></thead>
        <tbody>{natTable(c).map((r, i) => <tr key={i}><td>{r.proto}</td><td>{r.inside}</td><td className="text-noc-cyan">{r.outside}</td><td>{r.remote}</td></tr>)}</tbody>
      </table>
      {c.me?.ip.includes(':') && <p className="mt-1 text-violet-300">You reached our IP lookup over IPv6 ({c.me.ip}). With IPv6 there is normally no NAT: every device has its own global address, and the router only firewalls. The IPv4 path with NAT is shown using an example address.</p>}
      {c.me && !c.me.ip.includes(':') && <p className="mt-1 text-slate-500">Your real public IP is {c.me.ip}. If your ISP uses CGNAT, your router's WAN is actually a 100.64.x.x address and this IP belongs to the ISP's NAT.</p>}
    </Box>
  );
}

/** Hop-by-hop playback: the packet "waits" the real propagation time at each hop (slowed down 40×). */
function Traceroute({ c }: { c: Ctx }) {
  const reduced = useReducedMotion();
  const hops = traceroute(c);
  const total = oneWay(c);
  const [t, setT] = useState(0);
  useEffect(() => {
    setT(reduced ? total : 0);
    if (reduced) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const v = Math.min(total, (performance.now() - start) / 40);
      setT(v);
      if (v < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total, reduced, c.route]);
  return (
    <div className="space-y-2">
      <MeasuredPath c={c} />
      <Incident c={c} />
      <WorldMap route={c.route} home={c.home} dest={c.destPoint} progress={t / total} />
      <div className="font-mono text-[11px] text-slate-400">
        one-way elapsed: <span className="text-noc-cyan">{t.toFixed(1)} ms</span> / {total.toFixed(1)} ms · {Math.round(c.route.km).toLocaleString('en-US')} km
      </div>
      <table className="w-full font-mono text-[10.5px]">
        <thead className="text-slate-500"><tr><th className="pr-2 text-left">#</th><th className="pr-2 text-left" title="TTL left after this router">TTL</th><th className="pr-2 text-left">host / IP</th><th className="pr-2 text-left">where</th><th className="text-right">RTT</th></tr></thead>
        <tbody>
          {hops.map((h) => {
            const reached = t >= h.ms / 2 - 0.01;
            return (
              <tr key={h.n} className={`transition-opacity ${reached ? 'opacity-100' : 'opacity-25'}`}>
                <td className="pr-2 align-top">{h.n}</td>
                <td className="pr-2 align-top text-noc-amber">{h.ip === '*' ? '—' : 64 - hops.filter((x) => x.ip !== '*' && x.n < h.n).length}</td>
                <td className="pr-2"><span className="text-slate-200">{h.host}</span><br /><span className="text-slate-500">{h.ip}</span></td>
                <td className="pr-2 text-slate-400">{h.where}</td>
                <td className="whitespace-nowrap text-right align-top">{reached ? `${h.ms} ms` : '…'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Access-network legs (fiber line or satellite hops) with distance and time. */
function RouteLegs({ c }: { c: Ctx }) {
  return (
    <table className="w-full font-mono text-[10.5px]">
      <thead className="text-slate-500"><tr><th className="pr-2 text-left">leg</th><th className="pr-2 text-left">medium</th><th className="pr-2 text-right">km</th><th className="text-right">ms</th></tr></thead>
      <tbody>
        {c.route.legs.map((l, i) => (
          <tr key={i} className="border-t border-noc-edge/60 align-top">
            <td className="pr-2"><span className="text-slate-200">{l.from} → {l.to}</span><br /><span className="text-slate-500">{l.name}</span></td>
            <td className={`pr-2 ${l.kind === 'subsea' ? 'text-sky-300' : l.kind === 'space' ? 'text-violet-300' : 'text-slate-400'}`}>{l.kind === 'space' ? 'radio (c)' : l.kind === 'subsea' ? 'subsea fiber' : 'land fiber'}</td>
            <td className="pr-2 text-right">{Math.round(l.km).toLocaleString('en-US')}</td>
            <td className="text-right text-noc-cyan">{l.ms.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Longest-prefix match on a small routing table + the AS path. */
function Bgp({ c }: { c: Ctx }) {
  const ip = serverIp(c);
  const o = ip.split('.').map(Number);
  const rows = [
    { prefix: '0.0.0.0/0', via: 'transit provider', len: 0 },
    { prefix: `${o[0]}.0.0.0/8`, via: 'peer (IXP)', len: 8 },
    { prefix: `${o[0]}.${o[1]}.0.0/16`, via: `${c.target.geo?.asn || 'AS?'} direct peering`, len: 16 },
    { prefix: '10.0.0.0/8', via: 'internal (IGP)', len: 8, miss: o[0] !== 10 },
  ];
  const best = Math.max(...rows.filter((r) => !r.miss).map((r) => r.len));
  return (
    <Box>
      <p className="mb-1 text-slate-400">Router FIB lookup for <span className="font-mono text-noc-amber">{ip}</span>: the most specific (longest) matching prefix wins.</p>
      <table className="w-full font-mono text-[11px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.prefix} className={r.miss ? 'text-slate-600 line-through' : r.len === best ? 'text-noc-green' : 'text-slate-400'}>
              <td className="pr-2">{r.prefix}</td>
              <td>{r.via}</td>
              <td className="text-right">{r.len === best && !r.miss ? '← best' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 font-mono text-[11px] text-slate-300">
        AS path: <span className="text-noc-cyan">{c.me?.asn || 'AS(your ISP)'}</span> → <span className="text-noc-cyan">{c.target.geo?.asn || 'AS(destination)'}</span>
        <span className="text-slate-500"> ({c.target.geo?.org || 'destination network'})</span>
      </p>
      <p className="text-[10px] text-slate-500">Example table. Real ISP routers hold ~1,000,000 IPv4 routes.</p>
      <LiveBgp ip={ip} />
    </Box>
  );
}

function Tls({ c }: { c: Ctx }) {
  const flow = [
    ['→', 'ClientHello', `SNI ${c.target.domain}, key_share X25519MLKEM768, ALPN h2`, false],
    ['←', 'ServerHello', 'key_share, cipher TLS_AES_128_GCM_SHA256', false],
    ['←', 'EncryptedExtensions', 'ALPN = h2', true],
    ['←', 'Certificate', `${c.target.domain} ← intermediate CA ← root CA`, true],
    ['←', 'CertificateVerify', 'signature over the transcript', true],
    ['←', 'Finished', 'MAC over the transcript', true],
    ['→', 'Finished + GET /', 'client can send data right away', true],
  ] as const;
  return (
    <Box>
      {c.quic && <p className="mb-1 text-violet-300">QUIC: these same TLS 1.3 messages travel inside QUIC CRYPTO frames over UDP 443, and transport setup happens in the same round trip.</p>}
      <ul className="space-y-0.5 font-mono text-[11px]">
        {flow.map(([d, n, x, enc], i) => (
          <li key={i} className="flex gap-2"><span className="text-noc-cyan">{d}</span><b className="w-40 shrink-0 text-slate-200">{n}{enc ? ' · enc' : ''}</b><span className="text-slate-500">{x}</span></li>
        ))}
      </ul>
    </Box>
  );
}

function Http({ c }: { c: Ctx }) {
  const set = useStore((s) => s.set);
  return (
    <Box>
      <Seg label="HTTP version" value={c.quic ? 'h3' : 'h2'} onChange={(v) => set({ quic: v === 'h3' })} options={[{ v: 'h2', l: 'HTTP/2 over TCP' }, { v: 'h3', l: 'HTTP/3 over QUIC' }]} />
      <ol className="mt-2 space-y-0.5 font-mono text-[11px]">
        <li><span className="text-noc-cyan">→</span> GET https://{c.target.domain}/</li>
        <li className="pl-3 text-slate-500">front end → backend → app/cache/database (~25 ms)</li>
        <li><span className="text-noc-green">←</span> 200 OK text/html, br <span className="text-slate-500">(or 301/302 redirect)</span></li>
      </ol>
    </Box>
  );
}

function Render({ step }: { step: Step }) {
  const stages = ['Bytes', 'Tokens', 'DOM', 'CSSOM', 'Render tree', 'Layout', 'Paint', 'Composite (GPU)', 'Pixels'];
  const active = step.id === 'g-render-parse' ? [0, 1, 2, 3, 4] : [5, 6, 7, 8];
  return <div className="flex flex-wrap gap-1">{stages.map((s, i) => <span key={s} className={`chip ${active.includes(i) ? 'border-noc-cyan/60 text-noc-cyan' : 'border-noc-edge text-slate-500'}`}>{s}</span>)}</div>;
}

export function StepWidget({ step, c }: { step: Step; c: Ctx }) {
  switch (step.widget) {
    case 'utf8': return <Utf8 c={c} />;
    case 'session': return <Session c={c} />;
    case 'handshake': return <Handshake c={c} />;
    case 'subnet': return <Subnet src={HI.srcIp} dst={HI.dstIp} prefix={24} />;
    case 'arp': return <Arp c={c} />;
    case 'waveform': return <Waveform c={c} />;
    case 'checks': return <Checks step={step} c={c} />;
    case 'result': return <Result c={c} />;
    case 'keyboard': return <Keyboard />;
    case 'url': return <Url />;
    case 'dns': return <Dns step={step} c={c} />;
    case 'nat': return <Nat c={c} />;
    case 'traceroute': return <Traceroute c={c} />;
    case 'route': return <RouteLegs c={c} />;
    case 'bgp': return <Bgp c={c} />;
    case 'fields': return <HeaderDiagram step={step} c={c} />;
    case 'summary': return <TripSummary c={c} />;
    case 'tls': return <Tls c={c} />;
    case 'http': return <Http c={c} />;
    case 'render': return <Render step={step} />;
    default: return null;
  }
}
