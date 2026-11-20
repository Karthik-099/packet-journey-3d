import { describe, expect, it } from 'vitest';
import { Counter } from './index';

/** In-memory stand-in for Durable Object storage */
function fakeState() {
  const m = new Map<string, unknown>();
  return {
    storage: {
      get: async (k: string) => m.get(k),
      put: async (o: Record<string, unknown>) => Object.entries(o).forEach(([k, v]) => m.set(k, v)),
    },
  };
}

describe('like counter', () => {
  it('counts each visitor once and everyone sees the same number', async () => {
    const c = new Counter(fakeState() as never);
    const call = async (path: string, v: string) => (await c.fetch(new Request(`https://counter/${path}?v=${v}`))).json();
    expect(await call('get', 'alice')).toEqual({ count: 0, liked: false });
    expect(await call('up', 'alice')).toEqual({ count: 1, liked: true });
    expect(await call('up', 'alice')).toEqual({ count: 1, liked: true }); // no double likes
    expect(await call('get', 'bob')).toEqual({ count: 1, liked: false }); // next visitor sees 1
    expect(await call('up', 'bob')).toEqual({ count: 2, liked: true }); // and makes it 2
  });
});
