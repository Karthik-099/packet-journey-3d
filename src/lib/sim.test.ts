import { describe, expect, it } from 'vitest';
import { cwndTrace, simulateHol } from './sim';

describe('simulations', () => {
  const base = { rttMs: 100, streams: 3, perStream: 20, window: 10, seed: 7 };
  it('no loss: TCP and QUIC finish together', () => {
    const r = simulateHol({ ...base, loss: 0 });
    expect(r.tcp).toEqual(r.quic);
    expect(r.lost).toBe(0);
  });
  it('with loss: QUIC streams never finish later than TCP (head-of-line blocking)', () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = simulateHol({ ...base, loss: 0.05, seed });
      r.quic.forEach((q, i) => expect(q).toBeLessThanOrEqual(r.tcp[i]!));
    }
  });
  it('congestion window grows without loss and drops on loss', () => {
    expect(cwndTrace(0, 6, 1).map((x) => x.cwnd)).toEqual([20, 40, 80, 160, 320, 640]);
    const t = cwndTrace(0.02, 40, 3);
    const i = t.findIndex((x) => x.event === 'loss');
    expect(i).toBeGreaterThan(0);
    expect(t[i]!.cwnd).toBeLessThan(t[i - 1]!.cwnd);
  });
});
