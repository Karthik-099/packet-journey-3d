import { afterEach, describe, expect, it, vi } from 'vitest';
import { bgpInfo, runMtr } from './measure';

afterEach(() => vi.unstubAllGlobals());

describe('measure', () => {
  it('runs an MTR and parses hops', async () => {
    vi.useFakeTimers();
    let polls = 0;
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return new Response(JSON.stringify({ id: 'abc123' }), { status: 202 });
      polls++;
      if (polls < 2) return new Response(JSON.stringify({ status: 'in-progress' }));
      return new Response(
        JSON.stringify({
          status: 'finished',
          results: [{ probe: { city: 'Mumbai', country: 'IN', network: 'Oracle', asn: 31898, latitude: 19.07, longitude: 72.88 }, result: { hops: [{ resolvedAddress: '125.17.12.178', asn: [9498], stats: { avg: 1.2, loss: 0 } }, { stats: { avg: null, loss: 100 } }] } }],
        }),
      );
    });
    const p = runMtr('naver.com', 'IN');
    await vi.runAllTimersAsync();
    const r = await p;
    vi.useRealTimers();
    expect(r.probe.city).toBe('Mumbai');
    expect(r.hops).toEqual([
      { ip: '125.17.12.178', host: null, asn: [9498], avg: 1.2, loss: 0 },
      { ip: null, host: null, asn: [], avg: null, loss: 100 },
    ]);
  });
  it('reports rate limits clearly', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 429 }));
    await expect(runMtr('x.com', 'IN')).rejects.toThrow(/rate limit/);
  });
  it('collects prefix, origin, RPKI and peering data', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('prefix-overview')) return new Response(JSON.stringify({ data: { resource: '8.8.8.0/24', asns: [{ asn: 15169, holder: 'GOOGLE' }] } }));
      if (url.includes('rpki')) return new Response(JSON.stringify({ data: { status: 'valid' } }));
      return new Response(JSON.stringify({ data: [{ name: 'Google LLC', ix_count: 154, fac_count: 135 }] }));
    });
    expect(await bgpInfo('8.8.8.8')).toEqual({ prefix: '8.8.8.0/24', origins: [{ asn: 15169, holder: 'GOOGLE' }], rpki: 'valid', ixCount: 154, facCount: 135, netName: 'Google LLC' });
  });
});
