import { describe, expect, it } from 'vitest';
import { buildRoute, hubPath, nearestHub, slantKm } from './routing';
import type { LatLon } from './geo';

const BLR: LatLon = [12.97, 77.59];
const NYC: LatLon = [40.71, -74.0];

describe('routing', () => {
  it('finds the nearest hub', () => expect(nearestHub(BLR).id).toBe('chennai'));
  it('India → Europe goes through the Red Sea cables', () => {
    expect(hubPath('mumbai', 'frankfurt').map((l) => l.name)).toContain('AAE-1 / SEA-ME-WE');
  });
  it('builds a continuous Bengaluru → New York route with realistic latency', () => {
    const r = buildRoute(BLR, 'Bengaluru', NYC, 'New York', 'fiber');
    for (let i = 1; i < r.legs.length; i++) expect(r.legs[i]!.from).toBe(r.legs[i - 1]!.to);
    expect(r.legs.some((l) => l.kind === 'subsea')).toBe(true);
    // real Bengaluru–NYC RTT is ~200–250 ms; one-way propagation should be ~90–130 ms
    expect(r.oneWayMs).toBeGreaterThan(80);
    expect(r.oneWayMs).toBeLessThan(140);
  });
  it('same-city server stays local', () => {
    const r = buildRoute(BLR, 'Bengaluru', [13.0, 80.2], 'Chennai', 'fiber');
    expect(r.oneWayMs).toBeLessThan(5);
  });
  it('GEO satellite adds a quarter second each way', () => {
    expect(slantKm(35_786, 90)).toBeCloseTo(35_786, 0);
    const geo = buildRoute(BLR, 'Bengaluru', [13.0, 80.2], 'Chennai', 'geo');
    expect(geo.oneWayMs).toBeGreaterThan(240);
    const leo = buildRoute(BLR, 'Bengaluru', [13.0, 80.2], 'Chennai', 'leo');
    expect(leo.oneWayMs).toBeLessThan(25);
  });
});
