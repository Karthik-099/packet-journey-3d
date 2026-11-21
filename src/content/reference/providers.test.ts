import { describe, expect, it } from 'vitest';
import { PROVIDER_GROUPS } from './providers';
import { hasLogo } from '../../site/BrandLogo';

describe('provider directory', () => {
  const g = (id: string) => PROVIDER_GROUPS.find((x) => x.id === id)!;
  it('has the promised list sizes', () => {
    expect(g('cloud').items).toHaveLength(30);
    expect(g('isp-world').items).toHaveLength(30);
    expect(g('isp-in').items.length).toBeGreaterThanOrEqual(15);
  });
  it('every referenced logo is bundled, every url is https, no duplicates within a group', () => {
    for (const grp of PROVIDER_GROUPS) {
      expect(new Set(grp.items.map((p) => p.name)).size).toBe(grp.items.length);
      for (const p of grp.items) {
        if (p.logo) expect(hasLogo(p.logo), p.logo).toBe(true);
        expect(p.url).toMatch(/^https:\/\//);
      }
    }
  });
});
