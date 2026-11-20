import { describe, expect, it } from 'vitest';
import { dissect, readCapture, stats, writePcap } from './pcap';
import { sampleFrames } from './sample-capture';

describe('pcap', () => {
  const file = writePcap(sampleFrames());
  const pk = readCapture(file.buffer as ArrayBuffer).map((p, i) => dissect(p, i + 1));

  it('round-trips the sample capture and dissects every layer', () => {
    expect(pk).toHaveLength(15);
    expect(pk.map((p) => p.proto)).toEqual(['ARP', 'ARP', 'DNS', 'DNS', 'ICMP', 'ICMP', 'TCP', 'TCP', 'TCP', 'HTTP', 'HTTP', 'TCP', 'TCP', 'TCP', 'TCP']);
    expect(pk[0]!.info).toBe('Who has 192.168.1.1? Tell 192.168.1.10');
    expect(pk[3]!.info).toMatch(/example.com A 93.184.215.14/);
    expect(pk[9]!.info).toBe('GET / HTTP/1.1');
  });

  it('computes statistics: handshake RTT, DNS names, no retransmissions', () => {
    const s = stats(pk);
    expect(s.handshakes[0]!.rttMs).toBeCloseTo(40.9, 1);
    expect(s.dns[0]![0]).toBe('example.com');
    expect(s.retrans).toBe(0);
    expect(s.protocols.find(([p]) => p === 'TCP')![1]).toBe(9);
  });

  it('reads pcapng (SHB + IDB + EPB)', () => {
    const frame = sampleFrames()[0]!.data;
    const pad = (n: number) => Math.ceil(n / 4) * 4;
    const blk = (type: number, body: Uint8Array) => {
      const len = 12 + body.length;
      const out = new Uint8Array(len);
      const dv = new DataView(out.buffer);
      dv.setUint32(0, type, true);
      dv.setUint32(4, len, true);
      out.set(body, 8);
      dv.setUint32(len - 4, len, true);
      return out;
    };
    const shb = new Uint8Array(16);
    new DataView(shb.buffer).setUint32(0, 0x1a2b3c4d, true);
    new DataView(shb.buffer).setInt32(8, -1, true);
    new DataView(shb.buffer).setInt32(12, -1, true);
    const idb = new Uint8Array(8);
    new DataView(idb.buffer).setUint16(0, 1, true);
    const epb = new Uint8Array(20 + pad(frame.length));
    const v = new DataView(epb.buffer);
    v.setUint32(12, frame.length, true);
    v.setUint32(16, frame.length, true);
    epb.set(frame, 20);
    const parts = [blk(0x0a0d0d0a, shb), blk(1, idb), blk(6, epb)];
    const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) {
      all.set(p, o);
      o += p.length;
    }
    const pk2 = readCapture(all.buffer);
    expect(pk2).toHaveLength(1);
    expect(dissect(pk2[0]!, 1).proto).toBe('ARP');
  });

  it('rejects non-captures', () => expect(() => readCapture(new Uint8Array(64).buffer)).toThrow(/pcap/));
});
