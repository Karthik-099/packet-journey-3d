import type { LatLon } from '../lib/geo';
import { SUBSEA_ROUTE, OVERLAND_ROUTE, PLACES } from '../lib/geo';

/**
 * Real submarine cable systems landing in India. Routes are hand-traced approximations
 * of the public maps (submarinecablemap.com); landing points are real cities.
 */
export interface Cable {
  id: string;
  name: string;
  rfs: number; // ready-for-service year
  lands: string;
  color: string;
  route: LatLon[];
}

const SG: LatLon = [1.29, 103.85];
const MALACCA: LatLon[] = [[6.0, 95.0], [4.0, 99.0], [2.5, 101.5]];
const SOUTH_INDIA: LatLon[] = [[15.0, 72.5], [8.0, 76.0], [6.9, 79.85], [9.5, 81.5], PLACES.chennai];
const RED_SEA_MED: LatLon[] = [[12.2, 45.5], [13.0, 43.0], [20.0, 38.5], [27.5, 34.0], [29.9, 32.55], [31.3, 32.3], [33.5, 27.0], [36.0, 17.0], [38.5, 9.0], PLACES.marseille];

export const CABLES: Cable[] = [
  { id: 'aae1', name: 'AAE-1 (Asia-Africa-Europe 1)', rfs: 2017, lands: 'Mumbai ↔ Marseille, Singapore, Hong Kong', color: '#22d3ee', route: SUBSEA_ROUTE },
  {
    id: 'smw4',
    name: 'SEA-ME-WE 4',
    rfs: 2005,
    lands: 'Mumbai, Chennai ↔ Marseille, Singapore',
    color: '#a78bfa',
    route: [SG, ...[...MALACCA].reverse(), [8.0, 93.0], PLACES.chennai, [9.5, 81.5], [6.9, 79.85], [8.0, 76.0], [15.0, 72.5], PLACES.mumbai, [20.0, 64.0], [14.0, 52.0], ...RED_SEA_MED],
  },
  {
    id: 'smw6',
    name: 'SEA-ME-WE 6',
    rfs: 2025,
    lands: 'Mumbai, Chennai ↔ Marseille, Singapore',
    color: '#f472b6',
    route: [SG, ...[...MALACCA].reverse(), [10.0, 90.0], PLACES.chennai, [9.0, 82.0], [5.8, 80.0], [7.5, 75.5], [16.0, 71.5], PLACES.mumbai, [18.0, 63.0], [13.0, 51.0], ...RED_SEA_MED],
  },
  {
    id: 'imewe',
    name: 'IMEWE (India-Middle East-Western Europe)',
    rfs: 2010,
    lands: 'Mumbai ↔ Fujairah, Jeddah, Catania, Marseille',
    color: '#34d399',
    route: [PLACES.mumbai, [22.0, 63.0], [25.1, 56.35], [22.5, 60.0], [16.0, 55.0], [12.5, 47.0], [13.0, 43.0], [21.5, 39.2], [27.5, 34.0], [29.9, 32.55], [31.3, 32.3], [34.0, 25.0], [37.5, 15.1], [40.0, 9.5], PLACES.marseille],
  },
  {
    id: 'bbg',
    name: 'Bay of Bengal Gateway',
    rfs: 2016,
    lands: 'Mumbai, Chennai ↔ Oman, UAE, Sri Lanka, Penang',
    color: '#fbbf24',
    route: [[23.7, 57.9], [21.0, 63.0], PLACES.mumbai, ...SOUTH_INDIA, [8.0, 92.0], [5.4, 100.3]],
  },
  { id: 'i2i', name: 'i2i', rfs: 2002, lands: 'Chennai ↔ Singapore', color: '#fb7185', route: [PLACES.chennai, [11.0, 88.0], [7.0, 94.0], ...MALACCA, SG] },
  { id: 'tic', name: 'TIC (Tata TGN-Intra Asia)', rfs: 2004, lands: 'Chennai ↔ Singapore', color: '#60a5fa', route: [PLACES.chennai, [12.0, 86.0], [7.5, 95.5], [3.5, 100.0], SG] },
];

/** Where traffic enters/leaves networks: IXPs, Google PoPs, data centers. */
export interface Site {
  id: string;
  name: string;
  kind: 'ixp' | 'pop' | 'dc' | 'landing';
  at: LatLon;
  detail: string;
}

export const SITES: Site[] = [
  { id: 'mum', name: 'Mumbai', kind: 'pop', at: PLACES.mumbai, detail: 'Google PoP + edge (GFE), IXPs (NIXI, DE-CIX Mumbai), cable landing stations (Versova, Chowpatty)' },
  { id: 'che', name: 'Chennai', kind: 'landing', at: PLACES.chennai, detail: 'Cable landing stations, NIXI Chennai, Google PoP' },
  { id: 'del', name: 'New Delhi', kind: 'ixp', at: [28.61, 77.21], detail: 'DE-CIX Delhi, NIXI, Google Cloud region' },
  { id: 'sgp', name: 'Singapore', kind: 'dc', at: SG, detail: 'Google data center (Jurong West), Equinix SG IXP' },
  { id: 'mrs', name: 'Marseille', kind: 'landing', at: PLACES.marseille, detail: 'Europe\'s main landing hub for cables from Asia; France-IX Marseille' },
  { id: 'fra', name: 'Frankfurt', kind: 'ixp', at: [50.11, 8.68], detail: 'DE-CIX Frankfurt, one of the largest IXPs in the world' },
  { id: 'stg', name: 'St. Ghislain', kind: 'dc', at: PLACES.stGhislain, detail: 'Google data center, Belgium' },
];

export const LONG_ROUTE: LatLon[] = [...SUBSEA_ROUTE, ...OVERLAND_ROUTE.slice(1)];
