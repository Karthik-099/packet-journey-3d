import type { Access, Ctx, Dest, Medium } from './types';
import type { Geo, Target } from '../lib/lookup';
import { DEFAULT_TARGET } from '../lib/lookup';
import { buildHi } from '../lib/hi';
import { buildRoute, nearestHub } from '../lib/routing';
import { PLACES, type LatLon } from '../lib/geo';

export interface CtxInput {
  message: string;
  tls: boolean;
  medium: Medium;
  access: Access;
  dest: Dest;
  quic: boolean;
  me: Geo | null;
  target: Target;
  /** precise browser GPS position, if the visitor allowed it */
  gps?: { lat: number; lon: number; acc: number } | null;
  /** cable/link ids cut in the incident simulator */
  cut?: string[];
  /** measured serving location (CDN edge from response headers or speed-of-light test) */
  edge?: { at: LatLon; name: string } | null;
}

const valid = (g: Geo | null | undefined): g is Geo => !!g && Number.isFinite(g.lat) && Number.isFinite(g.lon);
const place = (g: Geo) => [g.city, g.country].filter(Boolean).join(', ') || g.country || 'unknown';

/** Derive everything content needs from user toggles + live data. */
export function buildCtx(i: CtxInput): Ctx {
  const home: LatLon = i.gps ? [i.gps.lat, i.gps.lon] : valid(i.me) ? [i.me.lat, i.me.lon] : PLACES.mumbai;
  const homeName = i.gps
    ? `your GPS position${valid(i.me) && i.me.city ? ` near ${i.me.city}` : ''} (±${i.gps.acc < 1000 ? `${i.gps.acc} m` : `${(i.gps.acc / 1000).toFixed(1)} km`})`
    : valid(i.me)
      ? `${place(i.me)} (approx., from IP)`
      : 'Mumbai (example)';
  const g = i.target.geo;
  let destPoint: LatLon;
  let destName: string;
  if (i.edge && i.dest === 'edge') {
    destPoint = i.edge.at;
    destName = i.edge.name;
  } else if (i.target.cdn && i.dest === 'edge') {
    const h = nearestHub(home);
    destPoint = h.at;
    destName = `${i.target.cdn} edge near ${h.name} (likely)`;
  } else if (valid(g)) {
    destPoint = [g.lat, g.lon];
    destName = place(g);
  } else {
    destPoint = nearestHub(home).at;
    destName = 'unknown (no geo-IP data)';
  }
  return { ...i, hi: buildHi(i.message, i.tls), home, homeName, destPoint, destName, route: buildRoute(home, homeName, destPoint, destName, i.access, new Set(i.cut ?? [])), baseline: i.cut?.length ? buildRoute(home, homeName, destPoint, destName, i.access) : undefined };
}

export const defaultCtxInput: CtxInput = { message: 'how are you', tls: false, medium: 'copper', access: 'fiber', dest: 'edge', quic: false, me: null, target: DEFAULT_TARGET };
