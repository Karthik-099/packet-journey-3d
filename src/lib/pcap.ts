/**
 * Minimal pcap / pcapng reader + dissector (Ethernet, 802.1Q, Linux SLL/SLL2, raw IP,
 * ARP, IPv4, IPv6, ICMP, TCP, UDP, DNS) and a pcap writer for sample captures.
 * Everything runs locally; nothing is uploaded.
 */
import { concat, hex, ipStr, macStr, read16, read32 } from './bytes';
import { dnsFields, ethFields, ipFields, tcpFields, udpFields, type Field, type Inspection } from './inspect';
import { flagNames } from './packets';

export interface RawPacket {
  ts: number; // seconds (float)
  data: Uint8Array;
  linktype: number;
}

export interface Dissected {
  no: number;
  ts: number;
  len: number;
  src: string;
  dst: string;
  proto: string;
  info: string;
  layers: string[];
  inspection: Inspection;
  /** conversation key and TCP details for statistics */
  conv?: string;
  tcp?: { flags: number; seq: number; ack: number; srcPort: number; dstPort: number; payloadLen: number };
  dnsName?: string;
  dnsResponse?: boolean;
}

/* ------------------------------ reading ------------------------------ */

export function readCapture(buf: ArrayBuffer): RawPacket[] {
  const b = new Uint8Array(buf);
  if (b.length < 24) throw new Error('File too small to be a capture');
  const dv = new DataView(buf);
  const magicBE = dv.getUint32(0, false);
  if (magicBE === 0x0a0d0d0a) return readPcapng(dv);
  const variants: Record<number, [boolean, number]> = {
    0xa1b2c3d4: [false, 1e-6], // big-endian µs
    0xd4c3b2a1: [true, 1e-6], // little-endian µs
    0xa1b23c4d: [false, 1e-9], // ns
    0x4d3cb2a1: [true, 1e-9],
  };
  const v = variants[magicBE];
  if (!v) throw new Error('Not a pcap or pcapng file');
  const [le, unit] = v;
  const linktype = dv.getUint32(20, le) & 0x0fffffff;
  const out: RawPacket[] = [];
  let o = 24;
  while (o + 16 <= b.length) {
    const sec = dv.getUint32(o, le);
    const frac = dv.getUint32(o + 4, le);
    const incl = dv.getUint32(o + 8, le);
    if (o + 16 + incl > b.length || incl > 262144) break; // truncated or corrupt record
    out.push({ ts: sec + frac * unit, data: b.subarray(o + 16, o + 16 + incl), linktype });
    o += 16 + incl;
  }
  return out;
}

function readPcapng(dv: DataView): RawPacket[] {
  const b = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const out: RawPacket[] = [];
  let le = true;
  const ifaces: { linktype: number; tsUnit: number }[] = [];
  let o = 0;
  while (o + 12 <= b.length) {
    const type = dv.getUint32(o, le);
    if (type === 0x0a0d0d0a) {
      le = dv.getUint32(o + 8, true) === 0x1a2b3c4d; // byte-order magic
      ifaces.length = 0;
    }
    const len = dv.getUint32(o + 4, le);
    if (len < 12 || o + len > b.length) break;
    if (type === 1) {
      // Interface Description Block: linktype + options (if_tsresol = 9)
      let tsUnit = 1e-6;
      let p = o + 16;
      while (p + 4 <= o + len - 4) {
        const code = dv.getUint16(p, le);
        const olen = dv.getUint16(p + 2, le);
        if (code === 0) break;
        if (code === 9 && olen >= 1) {
          const r = b[p + 4]!;
          tsUnit = r & 0x80 ? 2 ** -(r & 0x7f) : 10 ** -(r & 0x7f);
        }
        p += 4 + Math.ceil(olen / 4) * 4;
      }
      ifaces.push({ linktype: dv.getUint16(o + 8, le), tsUnit });
    } else if (type === 6) {
      // Enhanced Packet Block
      const iface = ifaces[dv.getUint32(o + 8, le)] ?? { linktype: 1, tsUnit: 1e-6 };
      const ts = (dv.getUint32(o + 12, le) * 2 ** 32 + dv.getUint32(o + 16, le)) * iface.tsUnit;
      const cap = dv.getUint32(o + 20, le);
      out.push({ ts, data: b.subarray(o + 28, o + 28 + cap), linktype: iface.linktype });
    } else if (type === 3) {
      // Simple Packet Block
      const iface = ifaces[0] ?? { linktype: 1, tsUnit: 1e-6 };
      out.push({ ts: 0, data: b.subarray(o + 16, o + len - 4), linktype: iface.linktype });
    }
    o += len;
  }
  return out;
}

/* ------------------------------ dissecting ------------------------------ */

const ipv6Str = (b: Uint8Array, o: number) => {
  const groups = Array.from({ length: 8 }, (_, i) => read16(b, o + i * 2).toString(16));
  // compress the longest run of zero groups
  let best = [-1, 0];
  for (let i = 0; i < 8; ) {
    if (groups[i] !== '0') {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === '0') j++;
    if (j - i > best[1]!) best = [i, j - i];
    i = j;
  }
  if (best[1]! < 2) return groups.join(':');
  const [s, n] = best as [number, number];
  return `${groups.slice(0, s).join(':')}::${groups.slice(s + n).join(':')}`;
};

const ICMP: Record<number, string> = { 0: 'Echo reply', 3: 'Destination unreachable', 5: 'Redirect', 8: 'Echo request', 11: 'Time exceeded' };
const WELL_KNOWN: Record<number, string> = { 22: 'SSH', 25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP', 80: 'HTTP', 123: 'NTP', 443: 'TLS/HTTPS', 3306: 'MySQL', 5432: 'PostgreSQL', 6443: 'Kubernetes API' };

export function dissect(p: RawPacket, no: number): Dissected {
  const b = p.data;
  const tree: Field[] = [{ name: `Frame ${no}: ${b.length} bytes captured`, range: [0, b.length] }];
  const layers: string[] = [];
  const d: Dissected = { no, ts: p.ts, len: b.length, src: '', dst: '', proto: 'Unknown', info: '', layers, inspection: { title: `Packet ${no}`, bytes: b, tree } };

  let o = 0;
  let etherType = -1;
  if (p.linktype === 1) {
    if (b.length < 14) return { ...d, info: 'Truncated Ethernet frame' };
    etherType = read16(b, 12);
    o = 14;
    const eth = ethFields(b.subarray(0, Math.max(14, b.length)), 0, 0, 0);
    eth.children = eth.children?.filter((c) => !/FCS|Padding/.test(c.name)); // captures usually omit the FCS
    eth.range = [0, 14];
    tree.push(eth);
    layers.push('Ethernet');
    d.src = macStr(b, 6);
    d.dst = macStr(b, 0);
    while (etherType === 0x8100 || etherType === 0x88a8) {
      const vid = read16(b, o) & 0x0fff;
      tree.push({ name: '802.1Q VLAN', value: `ID ${vid}`, range: [o - 2, o + 2] });
      layers.push('VLAN');
      etherType = read16(b, o + 2);
      o += 4;
    }
  } else if (p.linktype === 113) {
    etherType = read16(b, 14);
    o = 16;
    tree.push({ name: 'Linux cooked capture (SLL)', range: [0, 16] });
    layers.push('SLL');
  } else if (p.linktype === 276) {
    etherType = read16(b, 0);
    o = 20;
    tree.push({ name: 'Linux cooked capture v2 (SLL2)', range: [0, 20] });
    layers.push('SLL2');
  } else if (p.linktype === 101 || p.linktype === 12 || p.linktype === 228 || p.linktype === 229) {
    etherType = (b[0]! >> 4) === 6 ? 0x86dd : 0x0800;
  } else {
    return { ...d, proto: `linktype ${p.linktype}`, info: 'Unsupported link type' };
  }

  let l4 = -1;
  let l4o = -1;
  let ipEnd = b.length;
  if (etherType === 0x0806 && b.length >= o + 28) {
    const op = read16(b, o + 6);
    const spa = ipStr(b, o + 14);
    const tpa = ipStr(b, o + 24);
    tree.push({
      name: 'Address Resolution Protocol',
      value: op === 1 ? 'request' : 'reply',
      range: [o, o + 28],
      children: [
        { name: 'Opcode', value: op === 1 ? '1 (request)' : '2 (reply)', range: [o + 6, o + 8] },
        { name: 'Sender MAC', value: macStr(b, o + 8), range: [o + 8, o + 14] },
        { name: 'Sender IP', value: spa, range: [o + 14, o + 18] },
        { name: 'Target MAC', value: macStr(b, o + 18), range: [o + 18, o + 24] },
        { name: 'Target IP', value: tpa, range: [o + 24, o + 28] },
      ],
    });
    layers.push('ARP');
    return { ...d, proto: 'ARP', info: op === 1 ? `Who has ${tpa}? Tell ${spa}` : `${spa} is at ${macStr(b, o + 8)}` };
  }
  if (etherType === 0x0800 && b.length >= o + 20) {
    const ihl = (b[o]! & 0x0f) * 4;
    tree.push(ipFields(b, o));
    layers.push('IPv4');
    d.src = ipStr(b, o + 12);
    d.dst = ipStr(b, o + 16);
    l4 = b[o + 9]!;
    l4o = o + ihl;
    ipEnd = Math.min(b.length, o + read16(b, o + 2));
    d.proto = 'IPv4';
  } else if (etherType === 0x86dd && b.length >= o + 40) {
    d.src = ipv6Str(b, o + 8);
    d.dst = ipv6Str(b, o + 24);
    l4 = b[o + 6]!;
    l4o = o + 40;
    ipEnd = Math.min(b.length, l4o + read16(b, o + 4));
    tree.push({
      name: 'Internet Protocol Version 6',
      value: `${d.src} → ${d.dst}`,
      range: [o, ipEnd],
      children: [
        { name: 'Payload length', value: String(read16(b, o + 4)), range: [o + 4, o + 6] },
        { name: 'Next header', value: String(l4), range: [o + 6, o + 7] },
        { name: 'Hop limit', value: String(b[o + 7]), range: [o + 7, o + 8] },
        { name: 'Source', value: d.src, range: [o + 8, o + 24] },
        { name: 'Destination', value: d.dst, range: [o + 24, o + 40] },
      ],
    });
    layers.push('IPv6');
    d.proto = 'IPv6';
  } else {
    return { ...d, proto: `0x${etherType.toString(16).padStart(4, '0')}`, info: 'Unsupported EtherType' };
  }

  if (l4 === 6 && ipEnd >= l4o + 20) {
    const hl = (b[l4o + 12]! >> 4) * 4;
    const sp = read16(b, l4o);
    const dp = read16(b, l4o + 2);
    const flags = b[l4o + 13]!;
    const payloadLen = Math.max(0, ipEnd - l4o - hl);
    tree.push(tcpFields(b, l4o, ipEnd - l4o));
    layers.push('TCP');
    d.tcp = { flags, seq: read32(b, l4o + 4), ack: read32(b, l4o + 8), srcPort: sp, dstPort: dp, payloadLen };
    d.conv = [`${d.src}:${sp}`, `${d.dst}:${dp}`].sort().join(' ↔ ');
    const app = WELL_KNOWN[dp] ?? WELL_KNOWN[sp];
    d.proto = payloadLen && app ? app : 'TCP';
    d.info = `${sp} → ${dp} [${flagNames(flags)}] Seq=${d.tcp.seq} Ack=${d.tcp.ack} Win=${read16(b, l4o + 14)} Len=${payloadLen}`;
    const po = l4o + hl;
    if (payloadLen && (b[po] === 0x16 || b[po] === 0x17) && b[po + 1] === 0x03) {
      tree.push({ name: 'Transport Layer Security', value: b[po] === 0x16 ? 'Handshake record' : 'Application data (encrypted)', range: [po, ipEnd] });
      layers.push('TLS');
      d.proto = 'TLS';
    } else if (payloadLen && /^(GET|POST|PUT|HEAD|DELETE|PATCH|OPTIONS|HTTP\/1)/.test(String.fromCharCode(...b.subarray(po, po + 8)))) {
      const line = String.fromCharCode(...b.subarray(po, Math.min(ipEnd, po + 120))).split('\r\n')[0]!;
      tree.push({ name: 'Hypertext Transfer Protocol', value: line, range: [po, ipEnd] });
      layers.push('HTTP');
      d.proto = 'HTTP';
      d.info = line;
    }
  } else if (l4 === 17 && ipEnd >= l4o + 8) {
    const sp = read16(b, l4o);
    const dp = read16(b, l4o + 2);
    tree.push(udpFields(b, l4o));
    layers.push('UDP');
    d.conv = [`${d.src}:${sp}`, `${d.dst}:${dp}`].sort().join(' ↔ ');
    d.proto = 'UDP';
    d.info = `${sp} → ${dp} Len=${read16(b, l4o + 4) - 8}`;
    if ((sp === 53 || dp === 53 || sp === 5353 || dp === 5353) && ipEnd >= l4o + 20) {
      try {
        const dns = dnsFields(b.subarray(0, ipEnd), l4o + 8);
        tree.push(dns);
        layers.push('DNS');
        d.proto = 'DNS';
        const qf = dns.children?.find((c) => c.name === 'Query')?.value ?? '';
        d.dnsName = qf.split(':')[0];
        d.dnsResponse = !!(read16(b, l4o + 10) & 0x8000);
        const ans = dns.children?.find((c) => c.name === 'Answer')?.value;
        d.info = `${d.dnsResponse ? 'Standard query response' : 'Standard query'} ${qf}${ans ? ` → ${ans}` : ''}`;
      } catch {
        /* malformed DNS: keep UDP view */
      }
    } else if (sp === 443 || dp === 443) {
      d.proto = 'QUIC';
      layers.push('QUIC');
    }
  } else if ((l4 === 1 || l4 === 58) && ipEnd >= l4o + 4) {
    const t = b[l4o]!;
    const name = l4 === 1 ? ICMP[t] ?? `type ${t}` : { 128: 'Echo request', 129: 'Echo reply', 135: 'Neighbor solicitation', 136: 'Neighbor advertisement', 134: 'Router advertisement', 1: 'Destination unreachable', 3: 'Time exceeded', 2: 'Packet too big' }[t] ?? `type ${t}`;
    tree.push({ name: l4 === 1 ? 'Internet Control Message Protocol' : 'ICMPv6', value: name, range: [l4o, ipEnd], children: [{ name: 'Type', value: String(t), range: [l4o, l4o + 1] }, { name: 'Code', value: String(b[l4o + 1]), range: [l4o + 1, l4o + 2] }] });
    layers.push(l4 === 1 ? 'ICMP' : 'ICMPv6');
    d.proto = l4 === 1 ? 'ICMP' : 'ICMPv6';
    d.info = name;
  } else {
    d.info = `IP protocol ${l4}`;
  }
  return d;
}

/* ------------------------------ statistics ------------------------------ */

export function stats(pk: Dissected[]) {
  const protocols = new Map<string, number>();
  const convs = new Map<string, { packets: number; bytes: number }>();
  const dns = new Map<string, number>();
  const syn = new Map<string, number>();
  const handshakes: { conv: string; rttMs: number }[] = [];
  const seen = new Set<string>();
  let retrans = 0;
  for (const p of pk) {
    for (const l of p.layers) protocols.set(l, (protocols.get(l) ?? 0) + 1);
    if (p.conv) {
      const c = convs.get(p.conv) ?? { packets: 0, bytes: 0 };
      c.packets++;
      c.bytes += p.len;
      convs.set(p.conv, c);
    }
    if (p.dnsName && !p.dnsResponse) dns.set(p.dnsName, (dns.get(p.dnsName) ?? 0) + 1);
    if (p.tcp) {
      const t = p.tcp;
      const key = `${p.src}:${t.srcPort}>${p.dst}:${t.dstPort}`;
      if (t.flags & 0x02 && !(t.flags & 0x10)) syn.set(key, p.ts);
      if (t.flags & 0x02 && t.flags & 0x10) {
        const back = `${p.dst}:${t.dstPort}>${p.src}:${t.srcPort}`;
        const t0 = syn.get(back);
        if (t0 !== undefined) handshakes.push({ conv: p.conv!, rttMs: (p.ts - t0) * 1000 });
      }
      if (t.payloadLen > 0) {
        const id = `${key}#${t.seq}#${t.payloadLen}`;
        if (seen.has(id)) retrans++;
        seen.add(id);
      }
    }
  }
  const sortDesc = <V,>(m: Map<string, V>, f: (v: V) => number) => [...m].sort((a, b) => f(b[1]) - f(a[1]));
  return {
    protocols: sortDesc(protocols, (v) => v),
    conversations: sortDesc(convs, (v) => v.bytes).slice(0, 10),
    dns: sortDesc(dns, (v) => v).slice(0, 15),
    handshakes,
    retrans,
    duration: pk.length ? pk.at(-1)!.ts - pk[0]!.ts : 0,
  };
}

/* ------------------------------ writing ------------------------------ */

/** Classic little-endian pcap (Ethernet) from frames and timestamps. */
export function writePcap(frames: { ts: number; data: Uint8Array }[]): Uint8Array {
  const head = new Uint8Array(24);
  const dv = new DataView(head.buffer);
  dv.setUint32(0, 0xa1b2c3d4, true);
  dv.setUint16(4, 2, true);
  dv.setUint16(6, 4, true);
  dv.setUint32(16, 262144, true);
  dv.setUint32(20, 1, true); // LINKTYPE_ETHERNET
  const recs = frames.map((f) => {
    const r = new Uint8Array(16);
    const v = new DataView(r.buffer);
    v.setUint32(0, Math.floor(f.ts), true);
    v.setUint32(4, Math.round((f.ts % 1) * 1e6), true);
    v.setUint32(8, f.data.length, true);
    v.setUint32(12, f.data.length, true);
    return concat(r, f.data);
  });
  return concat(head, ...recs);
}

export const fmtHexPreview = (b: Uint8Array, n = 16) => Array.from(b.subarray(0, n), hex).join(' ');
