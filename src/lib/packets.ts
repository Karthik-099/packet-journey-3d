import { concat, u16, u32, ipBytes, macBytes, utf8, read16 } from './bytes';

/** RFC 1071 Internet checksum (ones' complement of ones' complement sum). */
export function inetChecksum(b: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < b.length; i += 2) sum += ((b[i] ?? 0) << 8) | (b[i + 1] ?? 0);
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16);
  return ~sum & 0xffff;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** IEEE 802.3 CRC-32 (same polynomial as zlib). */
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = (CRC_TABLE[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export const TCP = { FIN: 0x01, SYN: 0x02, RST: 0x04, PSH: 0x08, ACK: 0x10, URG: 0x20 } as const;
export const flagNames = (f: number) =>
  (Object.entries(TCP) as [string, number][]).filter(([, v]) => f & v).map(([k]) => k).join(', ') || 'none';

export interface TcpOpts {
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  seq: number;
  ack: number;
  flags: number;
  window: number;
  options?: Uint8Array;
  payload: Uint8Array;
}

export function buildTcp(o: TcpOpts): Uint8Array {
  const options = o.options ?? new Uint8Array();
  const hlen = 20 + options.length; // options are always padded to 4-byte multiples by the caller
  const hdr = concat(
    u16(o.srcPort),
    u16(o.dstPort),
    u32(o.seq),
    u32(o.ack),
    new Uint8Array([(hlen / 4) << 4, o.flags]),
    u16(o.window),
    u16(0), // checksum placeholder
    u16(0), // urgent pointer
    options,
  );
  const seg = concat(hdr, o.payload);
  // Pseudo-header: src IP, dst IP, zero, protocol 6, TCP length
  const pseudo = concat(ipBytes(o.srcIp), ipBytes(o.dstIp), new Uint8Array([0, 6]), u16(seg.length));
  const ck = inetChecksum(concat(pseudo, seg));
  seg[16] = ck >>> 8;
  seg[17] = ck & 0xff;
  return seg;
}

/** Linux-style SYN options: MSS 1460, SACK permitted, timestamps, NOP, window scale 7. */
export const SYN_OPTIONS = new Uint8Array([
  0x02, 0x04, 0x05, 0xb4, 0x04, 0x02, 0x08, 0x0a, 0x00, 0x9c, 0x4f, 0x10, 0x00, 0x00, 0x00, 0x00, 0x01, 0x03, 0x03, 0x07,
]);

export interface IpOpts {
  src: string;
  dst: string;
  ttl: number;
  id: number;
  protocol: number;
  payload: Uint8Array;
}

export function buildIpv4(o: IpOpts): Uint8Array {
  const hdr = concat(
    new Uint8Array([0x45, 0x00]), // version 4, IHL 5 (20 bytes), DSCP/ECN 0
    u16(20 + o.payload.length),
    u16(o.id),
    u16(0x4000), // flags: Don't Fragment, offset 0
    new Uint8Array([o.ttl, o.protocol]),
    u16(0),
    ipBytes(o.src),
    ipBytes(o.dst),
  );
  const ck = inetChecksum(hdr);
  hdr[10] = ck >>> 8;
  hdr[11] = ck & 0xff;
  return concat(hdr, o.payload);
}

/** Recompute an IPv4 header checksum after changing TTL etc. (what every router does). */
export function withTtl(packet: Uint8Array, ttl: number): Uint8Array {
  const p = packet.slice();
  p[8] = ttl;
  p[10] = 0;
  p[11] = 0;
  const ck = inetChecksum(p.subarray(0, 20));
  p[10] = ck >>> 8;
  p[11] = ck & 0xff;
  return p;
}

export const ETH_MIN_PAYLOAD = 46;

export interface EthFrame {
  frame: Uint8Array; // dst..FCS (what Wireshark shows, plus FCS)
  padding: number;
  fcs: number;
}

export function buildEthernet(dst: string, src: string, etherType: number, payload: Uint8Array): EthFrame {
  const padding = Math.max(0, ETH_MIN_PAYLOAD - payload.length);
  const body = concat(macBytes(dst), macBytes(src), u16(etherType), payload, new Uint8Array(padding));
  const fcs = crc32(body);
  // FCS is transmitted least-significant byte first
  const fcsBytes = new Uint8Array([fcs & 0xff, (fcs >>> 8) & 0xff, (fcs >>> 16) & 0xff, fcs >>> 24]);
  return { frame: concat(body, fcsBytes), padding, fcs };
}

/** 7 bytes preamble 0x55 + Start Frame Delimiter 0xD5 */
export const PREAMBLE_SFD = new Uint8Array([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0xd5]);

export function verifyFcs(frame: Uint8Array): boolean {
  const body = frame.subarray(0, frame.length - 4);
  const f = frame.subarray(frame.length - 4);
  const got = ((f[0] ?? 0) | ((f[1] ?? 0) << 8) | ((f[2] ?? 0) << 16) | ((f[3] ?? 0) << 24)) >>> 0;
  return crc32(body) === got;
}

export const verifyIpChecksum = (ipPacket: Uint8Array) => inetChecksum(ipPacket.subarray(0, 20)) === 0;

export function verifyTcpChecksum(srcIp: string, dstIp: string, seg: Uint8Array): boolean {
  const pseudo = concat(ipBytes(srcIp), ipBytes(dstIp), new Uint8Array([0, 6]), u16(seg.length));
  return inetChecksum(concat(pseudo, seg)) === 0;
}

/** RFC 1035 DNS query with one question and recursion desired. */
export function buildDnsQuery(id: number, name: string, qtype: number): Uint8Array {
  const labels = name.split('.').filter(Boolean).flatMap((l) => [l.length, ...utf8(l)]);
  return concat(
    u16(id),
    u16(0x0100), // standard query, RD=1
    u16(1),
    u16(0),
    u16(0),
    u16(0),
    new Uint8Array([...labels, 0]),
    u16(qtype),
    u16(1), // class IN
  );
}

/** DNS response answering with one A record (name compressed as pointer to offset 12). */
export function buildDnsAResponse(query: Uint8Array, ip: string, ttl: number, aa: boolean): Uint8Array {
  const q = query.slice();
  q[2] = 0x81 | (aa ? 0x04 : 0); // QR=1, RD=1, AA
  q[3] = 0x80; // RA=1, RCODE=0
  q[7] = 1; // ANCOUNT=1
  return concat(q, u16(0xc00c), u16(1), u16(1), u32(ttl), u16(4), ipBytes(ip));
}

/**
 * shortcut: not real AES-GCM; a deterministic keystream stands in for the cipher so the
 * record layout (header, length, inner type, 16-byte tag) is exact. Upgrade only if teaching crypto.
 */
export function fakeTlsRecord(plain: Uint8Array): Uint8Array {
  const inner = concat(plain, new Uint8Array([0x17])); // TLS 1.3 inner content type = application_data
  let s = 0x9e3779b9;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s & 0xff;
  };
  const ct = inner.map((b) => b ^ next());
  const tag = new Uint8Array(16).map(() => next());
  const body = concat(ct, tag);
  return concat(new Uint8Array([0x17, 0x03, 0x03]), u16(body.length), body);
}

export const tlsRecordLen = (rec: Uint8Array) => read16(rec, 3);

export function buildUdp(srcIp: string, dstIp: string, srcPort: number, dstPort: number, payload: Uint8Array): Uint8Array {
  const seg = concat(u16(srcPort), u16(dstPort), u16(8 + payload.length), u16(0), payload);
  const pseudo = concat(ipBytes(srcIp), ipBytes(dstIp), new Uint8Array([0, 17]), u16(seg.length));
  const ck = inetChecksum(concat(pseudo, seg)) || 0xffff;
  seg[6] = ck >>> 8;
  seg[7] = ck & 0xff;
  return seg;
}
