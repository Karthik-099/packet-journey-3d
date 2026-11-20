import { concat, macBytes, ipBytes, u16, utf8 } from './bytes';
import { buildDnsAResponse, buildDnsQuery, buildIpv4, buildTcp, buildUdp, inetChecksum, SYN_OPTIONS, TCP } from './packets';

const ME = { mac: '02:1a:2b:3c:4d:5e', ip: '192.168.1.10' };
const GW = { mac: '02:11:22:33:44:01', ip: '192.168.1.1' };
const SERVER = '93.184.215.14';

/** Ethernet II without FCS (what capture files contain). */
const eth = (dst: string, src: string, type: number, payload: Uint8Array) => concat(macBytes(dst), macBytes(src), u16(type), payload);

function arp(op: 1 | 2, sMac: string, sIp: string, tMac: string, tIp: string) {
  return concat(u16(1), u16(0x0800), new Uint8Array([6, 4]), u16(op), macBytes(sMac), ipBytes(sIp), macBytes(tMac), ipBytes(tIp));
}

function icmpEcho(type: 0 | 8, id: number, seq: number) {
  const m = concat(new Uint8Array([type, 0, 0, 0]), u16(id), u16(seq), utf8('packet-journey'));
  const ck = inetChecksum(m);
  m[2] = ck >> 8;
  m[3] = ck & 0xff;
  return m;
}

/** A short, realistic session: ARP → DNS → ping → TCP handshake → HTTP request/response → close. */
export function sampleFrames(): { ts: number; data: Uint8Array }[] {
  const t0 = 1_700_000_000;
  let ts = t0;
  const out: { ts: number; data: Uint8Array }[] = [];
  const push = (dt: number, data: Uint8Array) => out.push({ ts: (ts += dt), data });
  const v4 = (src: string, dst: string, proto: number, payload: Uint8Array, ttl = 64) => buildIpv4({ src, dst, ttl, id: 0x1000 + out.length, protocol: proto, payload });
  const out4 = (proto: number, dst: string, payload: Uint8Array) => eth(GW.mac, ME.mac, 0x0800, v4(ME.ip, dst, proto, payload));
  const in4 = (proto: number, src: string, payload: Uint8Array, ttl = 56) => eth(ME.mac, GW.mac, 0x0800, v4(src, ME.ip, proto, payload, ttl));

  push(0, eth('ff:ff:ff:ff:ff:ff', ME.mac, 0x0806, arp(1, ME.mac, ME.ip, '00:00:00:00:00:00', GW.ip)));
  push(0.0009, eth(ME.mac, GW.mac, 0x0806, arp(2, GW.mac, GW.ip, ME.mac, ME.ip)));
  const q = buildDnsQuery(0x2f1c, 'example.com', 1);
  push(0.0004, out4(17, '8.8.8.8', buildUdp(ME.ip, '8.8.8.8', 54012, 53, q)));
  push(0.0118, in4(17, '8.8.8.8', buildUdp('8.8.8.8', ME.ip, 53, 54012, buildDnsAResponse(q, SERVER, 300, false))));
  push(0.002, out4(1, SERVER, icmpEcho(8, 7, 1)));
  push(0.0412, in4(1, SERVER, icmpEcho(0, 7, 1)));
  const base = { srcIp: ME.ip, dstIp: SERVER, srcPort: 51515, dstPort: 80, window: 502 };
  const rev = { srcIp: SERVER, dstIp: ME.ip, srcPort: 80, dstPort: 51515, window: 509 };
  const empty = new Uint8Array();
  push(0.003, out4(6, SERVER, buildTcp({ ...base, seq: 1000, ack: 0, flags: TCP.SYN, window: 64240, options: SYN_OPTIONS, payload: empty })));
  push(0.0409, in4(6, SERVER, buildTcp({ ...rev, seq: 5000, ack: 1001, flags: TCP.SYN | TCP.ACK, window: 65535, options: SYN_OPTIONS, payload: empty })));
  push(0.0002, out4(6, SERVER, buildTcp({ ...base, seq: 1001, ack: 5001, flags: TCP.ACK, payload: empty })));
  const req = utf8('GET / HTTP/1.1\r\nHost: example.com\r\nUser-Agent: packet-journey\r\nAccept: */*\r\n\r\n');
  push(0.0003, out4(6, SERVER, buildTcp({ ...base, seq: 1001, ack: 5001, flags: TCP.PSH | TCP.ACK, payload: req })));
  const res = utf8('HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: 45\r\n\r\n<html><body><h1>Hello, packet!</h1></body></html>');
  push(0.0431, in4(6, SERVER, buildTcp({ ...rev, seq: 5001, ack: 1001 + req.length, flags: TCP.PSH | TCP.ACK, payload: res })));
  push(0.0002, out4(6, SERVER, buildTcp({ ...base, seq: 1001 + req.length, ack: 5001 + res.length, flags: TCP.ACK, payload: empty })));
  push(0.01, out4(6, SERVER, buildTcp({ ...base, seq: 1001 + req.length, ack: 5001 + res.length, flags: TCP.FIN | TCP.ACK, payload: empty })));
  push(0.041, in4(6, SERVER, buildTcp({ ...rev, seq: 5001 + res.length, ack: 1002 + req.length, flags: TCP.FIN | TCP.ACK, payload: empty })));
  push(0.0002, out4(6, SERVER, buildTcp({ ...base, seq: 1002 + req.length, ack: 5002 + res.length, flags: TCP.ACK, payload: empty })));
  return out;
}
