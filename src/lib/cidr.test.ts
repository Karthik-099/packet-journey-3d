import { describe, expect, it } from 'vitest';
import { cidrInfo, classify, sameSubnet, isValidIp } from './cidr';
import { fiberMs, haversineKm, PLACES } from './geo';

describe('cidr', () => {
  it('computes a /24', () => {
    const i = cidrInfo('192.168.1.10', 24);
    expect(i).toMatchObject({ network: '192.168.1.0/24', mask: '255.255.255.0', broadcast: '192.168.1.255', first: '192.168.1.1', last: '192.168.1.254', usable: 254 });
  });
  it('handles /31 and /32', () => {
    expect(cidrInfo('10.0.0.1', 31).usable).toBe(2);
    expect(cidrInfo('10.0.0.1', 32).first).toBe('10.0.0.1');
  });
  it('classifies ranges', () => {
    expect(classify('100.70.1.1')).toMatch(/CGNAT/);
    expect(classify('8.8.8.8')).toMatch(/Public/);
    expect(classify('172.20.0.1')).toMatch(/Private/);
  });
  it('routing decision', () => {
    expect(sameSubnet('192.168.1.10', '192.168.1.20', 24)).toBe(true);
    expect(sameSubnet('192.168.1.10', '142.250.183.14', 24)).toBe(false);
  });
  it('validates input', () => {
    expect(isValidIp('256.1.1.1')).toBe(false);
    expect(isValidIp('1.2.3.4')).toBe(true);
  });
});

describe('geo', () => {
  it('light in fiber: ~4.9 µs per km', () => {
    expect(fiberMs(1000)).toBeCloseTo(4.9, 1);
    expect(haversineKm(PLACES.mumbai, PLACES.chennai)).toBeGreaterThan(1000);
  });
});
