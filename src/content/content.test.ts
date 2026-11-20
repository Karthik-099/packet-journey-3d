import { describe, expect, it } from 'vitest';
import { JOURNEYS, resolve, type Ctx } from '.';
import { buildHi } from '../lib/hi';
import { traceroute } from './journey-google';

const combos: Ctx[] = [];
for (const tls of [false, true])
  for (const path of ['edge', 'long'] as const)
    for (const quic of [false, true])
      combos.push({ message: 'hi', tls, medium: 'copper', path, quic, hi: buildHi('hi', tls), me: quic ? { ip: '49.36.1.2', city: 'Pune', region: 'MH', country: 'India', org: 'Reliance Jio', asn: 'AS55836', lat: 18.5, lon: 73.8 } : null });

describe('content', () => {
  const ids = Object.values(JOURNEYS).flatMap((j) => j.steps.map((s) => s.id));
  it('step ids are unique', () => expect(new Set(ids).size).toBe(ids.length));
  it('every step renders under every toggle combination', () => {
    for (const c of combos)
      for (const j of Object.values(JOURNEYS))
        for (const s of j.steps) {
          expect(resolve(s.what, c).length).toBeGreaterThan(10);
          expect(resolve(s.under, c).length).toBeGreaterThan(0);
          s.inspect?.(c);
          s.checks?.(c).forEach((k) => expect(k.ok).toBe(true));
          if (s.hosts) resolve(s.hosts, c);
          const ms = s.latencyMs?.(c) ?? 0;
          expect(ms).toBeGreaterThanOrEqual(0);
        }
  });
  it('long path is much slower than edge', () => {
    const total = (c: Ctx) => JOURNEYS.google.steps.reduce((n, s) => n + (s.latencyMs?.(c) ?? 0), 0);
    expect(total(combos[2]!)).toBeGreaterThan(total(combos[0]!) + 200);
  });
  it('traceroute ends at the destination', () => {
    expect(traceroute(combos[0]!).at(-1)?.ip).toBe('142.250.183.14');
  });
});
