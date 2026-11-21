import { describe, expect, it } from 'vitest';
import { buildIndex, search } from './searchIndex';

describe('site search', () => {
  const idx = buildIndex();
  it('indexes ports, status codes, protocols and steps', () => {
    expect(idx.length).toBeGreaterThan(300);
  });
  it('finds a status code by number and words in any order', () => {
    expect(search(idx, '502')[0]!.title).toMatch(/^502 Bad Gateway/);
    expect(search(idx, 'gateway bad').some((h) => h.title.startsWith('502'))).toBe(true);
  });
  it('finds ports, providers and steps', () => {
    expect(search(idx, 'port 443').some((h) => /HTTPS/.test(h.title))).toBe(true);
    expect(search(idx, 'airtel')[0]!.kind).toMatch(/India/);
    expect(search(idx, 'tls handshake').some((h) => h.kind === 'Journey step')).toBe(true);
  });
  it('returns nothing for empty queries', () => expect(search(idx, '  ')).toEqual([]));
});
