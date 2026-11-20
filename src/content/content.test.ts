import { describe, expect, it } from 'vitest';
import { JOURNEYS, resolve, type Ctx } from '.';
import { buildCtx, defaultCtxInput } from './ctx';
import { traceroute, rtt } from './journey-google';
import { DEFAULT_TARGET, type Target } from '../lib/lookup';

const far: Target = {
  ...DEFAULT_TARGET,
  domain: 'example.org',
  tld: 'org',
  zone: 'example.org',
  a: ['93.184.216.34'],
  cname: ['edge.example.net'],
  ns: ['a.iana-servers.net'],
  nsIp: '199.43.135.53',
  nsGeo: { ip: '199.43.135.53', city: 'Los Angeles', region: '', country: 'United States', countryCode: 'US', lat: 34, lon: -118, org: 'ICANN', asn: 'AS16876' },
  geo: { ip: '93.184.216.34', city: 'Ashburn', region: 'Virginia', country: 'United States', countryCode: 'US', lat: 39.04, lon: -77.49, org: 'Example Hosting', asn: 'AS15133' },
  cdn: null,
  nsAnycast: false,
};
const me = { ip: '49.36.1.2', city: 'Bengaluru', region: 'KA', country: 'India', countryCode: 'IN', lat: 12.97, lon: 77.59, org: 'Reliance Jio', asn: 'AS55836' };

const combos: Ctx[] = [];
for (const tls of [false, true])
  for (const access of ['fiber', 'leo', 'geo'] as const)
    for (const quic of [false, true])
      for (const target of [DEFAULT_TARGET, far])
        combos.push(buildCtx({ ...defaultCtxInput, tls, access, quic, target, me: quic ? me : null, dest: tls ? 'origin' : 'edge' }));

describe('content', () => {
  const ids = Object.values(JOURNEYS).flatMap((j) => j.steps.map((s) => s.id));
  it('step ids are unique', () => expect(new Set(ids).size).toBe(ids.length));
  it('every step renders under every toggle combination and target', () => {
    for (const c of combos)
      for (const j of Object.values(JOURNEYS)) {
        expect(resolve(j.title, c).length).toBeGreaterThan(5);
        for (const s of j.steps) {
          expect(resolve(s.what, c).length).toBeGreaterThan(10);
          expect(resolve(s.under, c).length).toBeGreaterThan(0);
          expect(resolve(s.what, c)).not.toMatch(/undefined|NaN/);
          s.inspect?.(c);
          s.checks?.(c).forEach((k) => expect(k.ok).toBe(true));
          if (s.hosts) resolve(s.hosts, c);
          const ms = s.latencyMs?.(c) ?? 0;
          expect(ms).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(ms)).toBe(true);
        }
      }
  });
  it('a US-hosted site from Bengaluru is far slower than a nearby CDN edge', () => {
    const edge = buildCtx({ ...defaultCtxInput, me });
    const us = buildCtx({ ...defaultCtxInput, me, target: far });
    expect(rtt(us)).toBeGreaterThan(rtt(edge) + 150);
    expect(us.route.legs.some((l) => l.kind === 'subsea')).toBe(true);
  });
  it('traceroute ends at the resolved server', () => {
    const c = buildCtx({ ...defaultCtxInput, me, target: far });
    expect(traceroute(c).at(-1)?.ip).toBe('93.184.216.34');
  });
});
