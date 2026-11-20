import { describe, expect, it } from 'vitest';
import { crc32, inetChecksum, buildDnsQuery, buildDnsAResponse, withTtl, verifyIpChecksum } from './packets';
import { utf8, toBin, toHex } from './bytes';
import { buildHi, receiverChecks } from './hi';
import { dnsFields } from './inspect';

describe('checksums', () => {
  it('CRC-32 check value', () => expect(crc32(utf8('123456789'))).toBe(0xcbf43926));
  it('IPv4 header checksum (Wikipedia example)', () => {
    const h = new Uint8Array([0x45, 0, 0, 0x73, 0, 0, 0x40, 0, 0x40, 0x11, 0, 0, 0xc0, 0xa8, 0, 1, 0xc0, 0xa8, 0, 0xc7]);
    expect(inetChecksum(h)).toBe(0xb861);
  });
});

describe('journey 1: "hi"', () => {
  const p = buildHi('hi', false);
  it('encodes UTF-8 exactly', () => {
    expect(toHex(p.message)).toBe('68 69');
    expect(toBin(p.message)).toBe('01101000 01101001');
  });
  it('builds 20+20+2 byte IP packet and pads the frame to 64 bytes', () => {
    expect(p.packet.length).toBe(42);
    expect(p.padding).toBe(4);
    expect(p.frame.length).toBe(64);
    expect(p.wire.length).toBe(72);
  });
  it('passes every receiver check', () => expect(Object.values(receiverChecks(p)).every(Boolean)).toBe(true));
  it('TLS record wraps the message with 5-byte header, inner type and 16-byte tag', () => {
    expect(buildHi('hi', true).l6.length).toBe(5 + 2 + 1 + 16);
  });
  it('router TTL decrement keeps a valid checksum', () => {
    expect(verifyIpChecksum(withTtl(p.packet, 63))).toBe(true);
  });
  it('handles multi-byte UTF-8', () => expect(Array.from(buildHi('é', false).message)).toEqual([0xc3, 0xa9]));
});

describe('DNS', () => {
  it('builds and parses a query for google.com', () => {
    const q = buildDnsQuery(0x1a2b, 'google.com', 1);
    expect(q.length).toBe(28);
    const r = buildDnsAResponse(q, '142.250.183.14', 300, true);
    const f = dnsFields(r, 0);
    expect(f.children?.find((c) => c.name === 'Answer')?.value).toBe('google.com A 142.250.183.14 TTL 300');
  });
});
