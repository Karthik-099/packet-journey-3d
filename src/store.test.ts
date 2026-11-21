import { describe, expect, it } from 'vitest';
import { verifiedDest } from './store';
import { analyzeHeaders, physicsCheck } from './lib/cdn';

const probe = { city: 'Mumbai', country: 'IN', network: 'x', asn: 1, lat: 19.07, lon: 72.88 };
const check = { probe, status: 200, ip: '1.2.3.4', timings: { dns: 5, tcp: 3, tls: 4, firstByte: 9, total: 20 }, headers: {} };

describe('verifiedDest', () => {
  it('uses the edge city named in the headers', () => {
    const d = verifiedDest({ status: 'ok', domain: 'x.com', check, evidence: analyzeHeaders({ 'cf-ray': 'abc-MAA' }) }, 'x.com');
    expect(d?.name).toMatch(/Chennai \(MAA\)/);
  });
  it('falls back to the probe when physics proves a nearby copy', () => {
    const d = verifiedDest({ status: 'ok', domain: 'x.com', check, evidence: analyzeHeaders({ server: 'gws' }), physics: physicsCheck([19.07, 72.88], [37.4, -122.1], 3) }, 'x.com');
    expect(d?.at).toEqual([19.07, 72.88]);
  });
  it('ignores evidence for another domain or with no proof', () => {
    expect(verifiedDest({ status: 'ok', domain: 'y.com', check, evidence: analyzeHeaders({ 'cf-ray': 'a-BOM' }) }, 'x.com')).toBeNull();
    expect(verifiedDest({ status: 'ok', domain: 'x.com', check, evidence: analyzeHeaders({ server: 'nginx' }) }, 'x.com')).toBeNull();
  });
});
