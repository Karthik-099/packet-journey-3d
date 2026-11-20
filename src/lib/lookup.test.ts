import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeDomain, resolveTarget, cdnOf } from './lookup';

describe('normalizeDomain', () => {
  it.each([
    ['Facebook.com', 'facebook.com'],
    ['https://www.bbc.co.uk/news?x=1', 'www.bbc.co.uk'],
    ['bücher.de', 'xn--bcher-kva.de'],
    ['example.com.', 'example.com'],
  ])('%s → %s', (i, o) => expect(normalizeDomain(i)).toBe(o));
  it.each(['', 'not a domain', 'localhost', '1.2.3.4', 'a..com', '-bad.com'])('rejects %j', (i) => expect(normalizeDomain(i)).toBeNull());
});

describe('cdnOf', () => {
  it('detects operators', () => {
    expect(cdnOf('Facebook, Inc.')).toBe('Meta');
    expect(cdnOf('Cloudflare, Inc.')).toBe('Cloudflare');
    expect(cdnOf('Hetzner Online GmbH')).toBeNull();
    // an AWS EC2 origin is not an edge, but a CloudFront CNAME is
    expect(cdnOf('Amazon Data Services')).toBeNull();
    expect(cdnOf('Amazon.com, Inc.', ['d111111abcdef8.cloudfront.net'])).toBe('Amazon CloudFront');
  });
});

describe('resolveTarget', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('follows CNAMEs, finds the zone NS and geolocates', async () => {
    const dns: Record<string, unknown> = {
      'www.example.org A': { Status: 0, Answer: [{ name: 'www.example.org.', type: 5, TTL: 60, data: 'edge.cdn.net.' }, { name: 'edge.cdn.net.', type: 1, TTL: 30, data: '93.184.216.34' }] },
      'www.example.org AAAA': { Status: 0 },
      'www.example.org NS': { Status: 0 },
      'example.org NS': { Status: 0, Answer: [{ name: 'example.org.', type: 2, TTL: 86400, data: 'a.iana-servers.net.' }] },
      'org NS': { Status: 0, Answer: [{ name: 'org.', type: 2, TTL: 86400, data: 'a0.org.afilias-nst.info.' }] },
      'a.iana-servers.net A': { Status: 0, Answer: [{ name: 'a', type: 1, TTL: 1, data: '199.43.135.53' }] },
      'a0.org.afilias-nst.info A': { Status: 0, Answer: [{ name: 'a', type: 1, TTL: 1, data: '199.19.56.1' }] },
    };
    vi.stubGlobal('fetch', async (url: string) => {
      const u = new URL(url);
      if (u.hostname === 'dns.google') return new Response(JSON.stringify(dns[`${u.searchParams.get('name')} ${u.searchParams.get('type')}`] ?? { Status: 0 }));
      return new Response(JSON.stringify({ success: true, ip: u.pathname.slice(1), city: 'X', country: 'Y', latitude: 1, longitude: 2, connection: { asn: 15133, org: 'Edgecast' } }));
    });
    const t = await resolveTarget('www.example.org');
    expect(t).toMatchObject({ zone: 'example.org', a: ['93.184.216.34'], cname: ['edge.cdn.net'], ttl: 30, ns: ['a.iana-servers.net'], nsIp: '199.43.135.53', tldNsIp: '199.19.56.1', cdn: 'Edgio' });
    expect(t.geo?.asn).toBe('AS15133');
  });
  it('reports NXDOMAIN', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ Status: 3 })));
    await expect(resolveTarget('nope-xyz.com')).rejects.toThrow(/NXDOMAIN/);
  });
});
