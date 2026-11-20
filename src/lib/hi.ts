import { concat, utf8 } from './bytes';
import {
  buildEthernet,
  buildIpv4,
  buildTcp,
  fakeTlsRecord,
  PREAMBLE_SFD,
  SYN_OPTIONS,
  TCP,
  verifyFcs,
  verifyIpChecksum,
  verifyTcpChecksum,
} from './packets';

/** Example addresses for Journey 1 (two hosts on the same LAN, joined by one cable). */
export const HI = {
  srcIp: '192.168.1.10',
  dstIp: '192.168.1.20',
  srcMac: '02:1a:2b:3c:4d:5e',
  dstMac: '02:aa:bb:cc:dd:ee',
  srcPort: 52344,
  clientIsn: 0x6c2f1a30,
  serverIsn: 0x1f4e9b02,
  ttl: 64,
  ipId: 0x3f21,
  window: 502, // ×128 (window scale 7) = 64256 bytes
} as const;

export const dstPort = (tls: boolean) => (tls ? 443 : 80);

export interface HiPackets {
  message: Uint8Array; // UTF-8 bytes
  l6: Uint8Array; // what L6 hands down (plain or TLS record)
  segment: Uint8Array;
  packet: Uint8Array;
  frame: Uint8Array;
  padding: number;
  fcs: number;
  wire: Uint8Array; // preamble + SFD + frame
  handshake: { name: string; seg: Uint8Array; from: 'client' | 'server' }[];
}

export function buildHi(text: string, tls: boolean): HiPackets {
  const message = utf8(text);
  const l6 = tls ? fakeTlsRecord(message) : message;
  const dp = dstPort(tls);
  const base = { srcIp: HI.srcIp, dstIp: HI.dstIp, srcPort: HI.srcPort, dstPort: dp, window: HI.window };
  const segment = buildTcp({ ...base, seq: HI.clientIsn + 1, ack: HI.serverIsn + 1, flags: TCP.PSH | TCP.ACK, payload: l6 });
  const packet = buildIpv4({ src: HI.srcIp, dst: HI.dstIp, ttl: HI.ttl, id: HI.ipId, protocol: 6, payload: segment });
  const { frame, padding, fcs } = buildEthernet(HI.dstMac, HI.srcMac, 0x0800, packet);
  const empty = new Uint8Array();
  const handshake = [
    { name: 'SYN', from: 'client' as const, seg: buildTcp({ ...base, seq: HI.clientIsn, ack: 0, flags: TCP.SYN, window: 64240, options: SYN_OPTIONS, payload: empty }) },
    {
      name: 'SYN-ACK',
      from: 'server' as const,
      seg: buildTcp({ srcIp: HI.dstIp, dstIp: HI.srcIp, srcPort: dp, dstPort: HI.srcPort, seq: HI.serverIsn, ack: HI.clientIsn + 1, flags: TCP.SYN | TCP.ACK, window: 65160, options: SYN_OPTIONS, payload: empty }),
    },
    { name: 'ACK', from: 'client' as const, seg: buildTcp({ ...base, seq: HI.clientIsn + 1, ack: HI.serverIsn + 1, flags: TCP.ACK, payload: empty }) },
  ];
  return { message, l6, segment, packet, frame, padding, fcs, wire: concat(PREAMBLE_SFD, frame), handshake };
}

/** The checks a receiver really performs, computed on the actual bytes. */
export function receiverChecks(p: HiPackets) {
  return {
    fcs: verifyFcs(p.frame),
    mac: true, // destination MAC in frame === receiver NIC MAC (we built it that way)
    ipChecksum: verifyIpChecksum(p.packet),
    ipDst: p.packet.subarray(16, 20).join('.') === HI.dstIp,
    ttl: (p.packet[8] ?? 0) > 0,
    tcpChecksum: verifyTcpChecksum(HI.srcIp, HI.dstIp, p.segment),
  };
}
