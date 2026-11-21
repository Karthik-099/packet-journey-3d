import { describe, expect, it } from 'vitest';
import { analyzeHeaders, physicsCheck } from './cdn';

describe('CDN evidence from real headers', () => {
  it('Cloudflare: cf-ray names the edge city', () => {
    const e = analyzeHeaders({ 'cf-ray': '8f1c2d3e4f5a6b7c-BOM', 'cf-cache-status': 'HIT', server: 'cloudflare' });
    expect(e.operator).toBe('Cloudflare');
    expect(e.pop?.city).toBe('Mumbai');
    expect(e.cache).toBe('HIT');
  });
  it('CloudFront: x-amz-cf-pop', () => {
    const e = analyzeHeaders({ 'x-amz-cf-pop': 'MAA50-P2', 'x-cache': 'Hit from cloudfront' });
    expect(e.operator).toBe('Amazon CloudFront');
    expect(e.pop?.city).toBe('Chennai');
    expect(e.cache).toBe('HIT');
  });
  it('Fastly: x-served-by', () => {
    const e = analyzeHeaders({ 'x-served-by': 'cache-bom4743-BOM', 'x-cache': 'MISS' });
    expect(e.operator).toBe('Fastly');
    expect(e.pop?.code).toBe('BOM');
  });
  it('Wikimedia: cp5xxx is the Singapore data center (real response seen from Mumbai)', () => {
    const e = analyzeHeaders({ server: 'ATS/9.2.16', age: '41074', 'x-cache': 'cp5021 miss, cp5021 hit/497205', 'x-cache-status': 'hit-front' });
    expect(e.operator).toMatch(/Wikimedia/);
    expect(e.pop?.city).toBe('Singapore');
    expect(e.age).toBe(41074);
  });
  it('Google front end by server header; plain origin has no operator', () => {
    expect(analyzeHeaders({ server: 'gws' }).operator).toBe('Google');
    expect(analyzeHeaders({ server: 'nginx' }).operator).toBeNull();
  });
});

describe('speed-of-light check', () => {
  it('flags a server that answers faster than light could reach its geo-IP location', () => {
    // Mumbai probe, geo-IP says San Francisco (~13,500 km → ≥130 ms RTT), but TCP connect took 3 ms
    const p = physicsCheck([19.07, 72.88], [37.77, -122.42], 3);
    expect(p.minRttMs).toBeGreaterThan(120);
    expect(p.closerThanGeoIp).toBe(true);
    expect(p.maxServerKm).toBeLessThan(400);
  });
  it('accepts a far server when the RTT matches the distance', () => {
    expect(physicsCheck([19.07, 72.88], [1.35, 103.82], 60).closerThanGeoIp).toBe(false);
  });
});
