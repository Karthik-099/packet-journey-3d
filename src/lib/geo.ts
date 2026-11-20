/** [lat, lon] in degrees */
export type LatLon = [number, number];

const R_EARTH_KM = 6371;
/** Speed of light in single-mode fiber (group index ~1.468): ~204,000 km/s → ~4.9 µs per km */
export const FIBER_KM_PER_MS = 299_792.458 / 1.468 / 1000;

export function haversineKm([la1, lo1]: LatLon, [la2, lo2]: LatLon): number {
  const r = Math.PI / 180;
  const dLa = (la2 - la1) * r;
  const dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(a));
}

export const pathKm = (pts: LatLon[]) => pts.slice(1).reduce((km, p, i) => km + haversineKm(pts[i]!, p), 0);
export const fiberMs = (km: number) => km / FIBER_KM_PER_MS;

export const PLACES = {
  mumbai: [19.08, 72.88] as LatLon,
  chennai: [13.08, 80.27] as LatLon,
  bengaluru: [12.97, 77.59] as LatLon,
  marseille: [43.3, 5.37] as LatLon,
  stGhislain: [50.47, 3.82] as LatLon, // Google data center, Belgium
};

/**
 * Approximate route of a Mumbai → Europe system (e.g. SEA-ME-WE / AAE-1 style) via the
 * Arabian Sea, Gulf of Aden, Red Sea, Suez and the Mediterranean, then overland to Belgium.
 */
export const SUBSEA_ROUTE: LatLon[] = [
  PLACES.mumbai,
  [17.0, 66.0],
  [13.5, 54.0],
  [12.2, 45.5],
  [13.0, 43.0],
  [20.0, 38.5],
  [27.5, 34.0],
  [29.9, 32.55],
  [31.3, 32.3],
  [33.0, 28.0],
  [35.5, 18.0],
  [38.5, 9.0],
  PLACES.marseille,
];
export const OVERLAND_ROUTE: LatLon[] = [PLACES.marseille, [45.76, 4.84], [48.86, 2.35], PLACES.stGhislain];

export const LONG_PATH = (() => {
  const subseaKm = pathKm(SUBSEA_ROUTE);
  const landKm = pathKm(OVERLAND_ROUTE) * 1.2; // terrestrial fiber follows roads/rail, not great circles
  const km = subseaKm + landKm;
  return { subseaKm, landKm, km, oneWayMs: fiberMs(km) };
})();

/** lat/lon → point on a sphere of radius r (three.js Y-up) */
export function toXYZ([lat, lon]: LatLon, r: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return [-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)];
}
