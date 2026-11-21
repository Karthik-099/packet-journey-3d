import { describe, expect, it } from 'vitest';
import { JOURNEYS } from '.';
import { STORY } from './story';
import { buildCtx, defaultCtxInput } from './ctx';

describe('story', () => {
  it('every step has a short plain story', () => {
    const c = buildCtx(defaultCtxInput);
    for (const j of Object.values(JOURNEYS))
      for (const s of j.steps) {
        const st = STORY[s.id]?.(c);
        expect(st, s.id).toBeDefined();
        expect(st!.line.length, s.id).toBeLessThan(170);
      }
  });
});
