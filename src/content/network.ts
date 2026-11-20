import type { LatLon } from '../lib/geo';

/**
 * A simplified map of the global backbone: major interconnection hubs (cable landing
 * cities / big IXPs) joined by real submarine cable systems and terrestrial fiber.
 * Routes are hand-traced approximations of public cable maps (submarinecablemap.com).
 */
export interface Hub {
  id: string;
  name: string;
  at: LatLon;
  ixp: string; // notable exchange(s) there
}

export interface Link {
  a: string;
  b: string;
  kind: 'subsea' | 'land';
  name: string;
  /** intermediate waypoints from a → b (subsea routes avoid land) */
  via?: LatLon[];
  rfs?: number;
}

export const HUBS: Hub[] = [
  { id: 'mumbai', name: 'Mumbai', at: [19.08, 72.88], ixp: 'NIXI, DE-CIX Mumbai, landing stations' },
  { id: 'chennai', name: 'Chennai', at: [13.08, 80.27], ixp: 'NIXI Chennai, landing stations' },
  { id: 'delhi', name: 'New Delhi', at: [28.61, 77.21], ixp: 'DE-CIX Delhi, NIXI' },
  { id: 'fujairah', name: 'Fujairah (UAE)', at: [25.12, 56.33], ixp: 'UAE-IX (Dubai), landing station' },
  { id: 'djibouti', name: 'Djibouti', at: [11.59, 43.15], ixp: 'DjIX, major cable junction' },
  { id: 'marseille', name: 'Marseille', at: [43.3, 5.37], ixp: 'France-IX Marseille, landing hub' },
  { id: 'frankfurt', name: 'Frankfurt', at: [50.11, 8.68], ixp: 'DE-CIX Frankfurt' },
  { id: 'amsterdam', name: 'Amsterdam', at: [52.37, 4.9], ixp: 'AMS-IX' },
  { id: 'london', name: 'London', at: [51.51, -0.13], ixp: 'LINX' },
  { id: 'bilbao', name: 'Bilbao', at: [43.26, -2.93], ixp: 'MAREA landing (Sopelana)' },
  { id: 'lisbon', name: 'Lisbon', at: [38.72, -9.14], ixp: 'GigaPIX, Sines/Seixal landings' },
  { id: 'virginia', name: 'Virginia Beach', at: [36.85, -75.98], ixp: 'MAREA/BRUSA landing' },
  { id: 'ashburn', name: 'Ashburn', at: [39.04, -77.49], ixp: 'Equinix Ashburn ("Data Center Alley")' },
  { id: 'newyork', name: 'New York', at: [40.71, -74.0], ixp: 'DE-CIX NY, NYIIX' },
  { id: 'chicago', name: 'Chicago', at: [41.88, -87.63], ixp: 'Equinix Chicago' },
  { id: 'dallas', name: 'Dallas', at: [32.78, -96.8], ixp: 'DE-CIX Dallas' },
  { id: 'losangeles', name: 'Los Angeles', at: [34.05, -118.24], ixp: 'One Wilshire, Any2' },
  { id: 'sanjose', name: 'San Jose', at: [37.34, -121.89], ixp: 'Equinix SV (Silicon Valley)' },
  { id: 'seattle', name: 'Seattle', at: [47.61, -122.33], ixp: 'SIX' },
  { id: 'singapore', name: 'Singapore', at: [1.29, 103.85], ixp: 'Equinix SG, SGIX' },
  { id: 'hongkong', name: 'Hong Kong', at: [22.32, 114.17], ixp: 'HKIX' },
  { id: 'tokyo', name: 'Tokyo', at: [35.68, 139.69], ixp: 'JPIX, JPNAP' },
  { id: 'perth', name: 'Perth', at: [-31.95, 115.86], ixp: 'IX Australia' },
  { id: 'sydney', name: 'Sydney', at: [-33.87, 151.21], ixp: 'IX Australia, Equinix SY' },
  { id: 'fortaleza', name: 'Fortaleza', at: [-3.73, -38.52], ixp: 'Brazil’s main landing hub' },
  { id: 'saopaulo', name: 'São Paulo', at: [-23.55, -46.63], ixp: 'IX.br São Paulo' },
  { id: 'capetown', name: 'Cape Town', at: [-33.92, 18.42], ixp: 'NAPAfrica CT' },
  { id: 'johannesburg', name: 'Johannesburg', at: [-26.2, 28.05], ixp: 'NAPAfrica JHB' },
  { id: 'mombasa', name: 'Mombasa', at: [-4.04, 39.67], ixp: 'landing station (Kenya)' },
];

export const LINKS: Link[] = [
  // ---- India ↔ Middle East ↔ Europe (via Red Sea + Suez) ----
  { a: 'mumbai', b: 'djibouti', kind: 'subsea', name: 'AAE-1 / SEA-ME-WE', via: [[17, 66], [13.5, 54], [12.2, 46]], rfs: 2017 },
  { a: 'djibouti', b: 'marseille', kind: 'subsea', name: 'AAE-1 / SEA-ME-WE', via: [[13, 43], [20, 38.5], [27.5, 34], [29.9, 32.55], [31.3, 32.3], [33, 28], [35.5, 18], [38.5, 9]], rfs: 2017 },
  { a: 'mumbai', b: 'fujairah', kind: 'subsea', name: 'IMEWE / FALCON', via: [[22, 63]], rfs: 2010 },
  { a: 'fujairah', b: 'djibouti', kind: 'subsea', name: 'IMEWE / AAE-1', via: [[22.5, 60], [16, 55], [12.5, 47]] },
  { a: 'mumbai', b: 'mombasa', kind: 'subsea', name: 'PEACE / 2Africa', via: [[10, 62], [0, 50]] },
  // ---- India ↔ SE Asia ----
  { a: 'chennai', b: 'singapore', kind: 'subsea', name: 'i2i / TIC / SEA-ME-WE 4', via: [[11, 88], [7, 94], [6, 95], [4, 99], [2.5, 101.5]], rfs: 2002 },
  { a: 'mumbai', b: 'chennai', kind: 'land', name: 'Indian terrestrial backbone' },
  { a: 'mumbai', b: 'delhi', kind: 'land', name: 'Indian terrestrial backbone' },
  { a: 'delhi', b: 'chennai', kind: 'land', name: 'Indian terrestrial backbone' },
  // ---- Asia Pacific ----
  { a: 'singapore', b: 'hongkong', kind: 'subsea', name: 'APG / SJC', via: [[5, 108], [12, 112], [18, 114]], rfs: 2016 },
  { a: 'hongkong', b: 'tokyo', kind: 'subsea', name: 'APG / FASTER feeder', via: [[24, 121.5], [30, 131], [33.5, 137]] },
  { a: 'tokyo', b: 'seattle', kind: 'subsea', name: 'FASTER (to Oregon)', via: [[38, 150], [45, 170], [48, -170], [48, -150], [46, -130]], rfs: 2016 },
  { a: 'tokyo', b: 'losangeles', kind: 'subsea', name: 'Unity / JUPITER', via: [[33, 150], [30, 170], [28, -170], [30, -145], [33, -125]], rfs: 2010 },
  { a: 'singapore', b: 'perth', kind: 'subsea', name: 'INDIGO-West', via: [[-6, 105], [-20, 110]], rfs: 2019 },
  { a: 'perth', b: 'sydney', kind: 'subsea', name: 'INDIGO-Central', via: [[-36, 118], [-38, 130], [-40, 145]], rfs: 2019 },
  { a: 'sydney', b: 'losangeles', kind: 'subsea', name: 'Southern Cross', via: [[-25, 165], [-10, 180], [5, -165], [21, -158], [28, -140]], rfs: 2000 },
  // ---- Europe ----
  { a: 'marseille', b: 'frankfurt', kind: 'land', name: 'European terrestrial fiber' },
  { a: 'marseille', b: 'bilbao', kind: 'land', name: 'European terrestrial fiber' },
  { a: 'bilbao', b: 'lisbon', kind: 'land', name: 'European terrestrial fiber' },
  { a: 'frankfurt', b: 'amsterdam', kind: 'land', name: 'European terrestrial fiber' },
  { a: 'amsterdam', b: 'london', kind: 'subsea', name: 'North Sea cables', via: [[52.2, 2.5]] },
  { a: 'london', b: 'frankfurt', kind: 'land', name: 'European terrestrial fiber' },
  // ---- Transatlantic ----
  { a: 'bilbao', b: 'virginia', kind: 'subsea', name: 'MAREA (Microsoft/Meta)', via: [[44.5, -10], [43, -30], [40, -50], [37.5, -68]], rfs: 2018 },
  { a: 'london', b: 'newyork', kind: 'subsea', name: 'Grace Hopper / AEC-1', via: [[50.5, -8], [51, -25], [47, -45], [42, -62]], rfs: 2022 },
  { a: 'lisbon', b: 'fortaleza', kind: 'subsea', name: 'EllaLink', via: [[33, -14], [20, -22], [5, -32]], rfs: 2021 },
  { a: 'saopaulo', b: 'newyork', kind: 'subsea', name: 'Seabras-1', via: [[-20, -38], [-5, -33], [15, -45], [30, -65]], rfs: 2017 },
  { a: 'fortaleza', b: 'saopaulo', kind: 'land', name: 'Brazilian backbone' },
  // ---- Africa ----
  { a: 'lisbon', b: 'capetown', kind: 'subsea', name: 'WACS / 2Africa (west)', via: [[30, -16], [10, -20], [0, -5], [-15, 8], [-28, 14]], rfs: 2012 },
  { a: 'capetown', b: 'johannesburg', kind: 'land', name: 'South African backbone' },
  { a: 'mombasa', b: 'johannesburg', kind: 'subsea', name: 'SEACOM / EASSy', via: [[-12, 42], [-26, 34.5]] },
  // ---- North America ----
  { a: 'virginia', b: 'ashburn', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'ashburn', b: 'newyork', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'ashburn', b: 'chicago', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'ashburn', b: 'dallas', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'chicago', b: 'seattle', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'dallas', b: 'losangeles', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'losangeles', b: 'sanjose', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'sanjose', b: 'seattle', kind: 'land', name: 'US terrestrial fiber' },
  { a: 'chicago', b: 'newyork', kind: 'land', name: 'US terrestrial fiber' },
];

export const hubById = (id: string) => HUBS.find((h) => h.id === id)!;
