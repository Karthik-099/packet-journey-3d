import { journeyHi } from './journey-hi';
import { journeyGoogle } from './journey-google';
import type { Journey, JourneyId } from './types';

export const JOURNEYS: Record<JourneyId, Journey> = { hi: journeyHi, google: journeyGoogle };

export const OSI = [
  { n: 7, name: 'Application', tcpip: 'Application' },
  { n: 6, name: 'Presentation', tcpip: 'Application' },
  { n: 5, name: 'Session', tcpip: 'Application' },
  { n: 4, name: 'Transport', tcpip: 'Transport' },
  { n: 3, name: 'Network', tcpip: 'Internet' },
  { n: 2, name: 'Data Link', tcpip: 'Link' },
  { n: 1, name: 'Physical', tcpip: 'Link' },
] as const;

/** Find a step by deep-link id across journeys */
export function findStep(id: string) {
  for (const j of Object.values(JOURNEYS)) {
    const i = j.steps.findIndex((s) => s.id === id);
    if (i >= 0) return { journey: j.id, index: i };
  }
  return null;
}

export * from './types';
