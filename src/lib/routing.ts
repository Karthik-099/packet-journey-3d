import { HUBS, LINKS, hubById, type Link } from '../content/network';
import { fiberMs, haversineKm, pathKm, type LatLon } from './geo';

export type LegKind = 'access' | 'land' | 'subsea' | 'space';
export interface Leg {
  name: string;
  kind: LegKind;
  from: string;
  to: string;
  km: number;
  ms: number;
  points: LatLon[];
}
export interface Route {
  legs: Leg[];
  points: LatLon[];
  km: number;
  oneWayMs: number;
  hubs: string[];
}

/** Terrestrial fiber follows roads/rail: ~1.25× the great-circle distance */
const LAND_FACTOR = 1.25;
/** Light in vacuum (satellite radio links), km per ms */
const C_KM_PER_MS = 299.792458;
const ROUTER_MS = 0.05; // forwarding/queueing per hop on an idle backbone (order of tens of µs)

const linkPts = (l: Link, reverse: boolean): LatLon[] => {
  const p = [hubById(l.a).at, ...(l.via ?? []), hubById(l.b).at];
  return reverse ? p.reverse() : p;
};
const linkKm = (l: Link) => pathKm(linkPts(l, false)) * (l.kind === 'land' ? LAND_FACTOR : 1.05);

export const nearestHub = (p: LatLon) => HUBS.reduce((a, b) => (haversineKm(p, b.at) < haversineKm(p, a.at) ? b : a));

/** Dijkstra over the hub graph by fiber km. */
export function hubPath(from: string, to: string): Link[] {
  const dist = new Map<string, number>(HUBS.map((h) => [h.id, Infinity]));
  const prev = new Map<string, Link>();
  dist.set(from, 0);
  const todo = new Set(HUBS.map((h) => h.id));
  while (todo.size) {
    let u = '';
    for (const id of todo) if (!u || dist.get(id)! < dist.get(u)!) u = id;
    todo.delete(u);
    if (u === to || dist.get(u) === Infinity) break;
    for (const l of LINKS) {
      if (l.a !== u && l.b !== u) continue;
      const v = l.a === u ? l.b : l.a;
      const d = dist.get(u)! + linkKm(l);
      if (d < dist.get(v)!) {
        dist.set(v, d);
        prev.set(v, l);
      }
    }
  }
  const out: Link[] = [];
  for (let v = to; v !== from; ) {
    const l = prev.get(v);
    if (!l) return [];
    out.unshift(l);
    v = l.a === v ? l.b : l.a;
  }
  return out;
}

const leg = (name: string, kind: LegKind, from: string, to: string, points: LatLon[], km = pathKm(points) * (kind === 'land' || kind === 'access' ? LAND_FACTOR : 1)): Leg => ({
  name,
  kind,
  from,
  to,
  km,
  ms: kind === 'space' ? km / C_KM_PER_MS : fiberMs(km),
  points,
});

export type Access = 'fiber' | 'leo' | 'geo';
const LEO_ALT = 550; // Starlink shell, km
const GEO_ALT = 35_786;

/** Slant range from ground to a satellite at `alt` km seen at elevation `elDeg`. */
export function slantKm(alt: number, elDeg: number) {
  const R = 6371;
  const e = (elDeg * Math.PI) / 180;
  return Math.sqrt((R + alt) ** 2 - (R * Math.cos(e)) ** 2) - R * Math.sin(e);
}

/**
 * Full path: home → (access: fiber, LEO or GEO satellite) → nearest hub → backbone → hub nearest the server → server.
 */
export function buildRoute(home: LatLon, homeName: string, dest: LatLon, destName: string, access: Access): Route {
  const h0 = nearestHub(home);
  const h1 = nearestHub(dest);
  const legs: Leg[] = [];
  if (access === 'fiber') legs.push(leg('Home fiber → ISP → backbone', 'access', homeName, h0.name, [home, h0.at]));
  else {
    // the satellite sits roughly between you and the ground station (gateway) near the hub
    const mid: LatLon = [(home[0] + h0.at[0]) / 2, (home[1] + h0.at[1]) / 2];
    const alt = access === 'leo' ? LEO_ALT : GEO_ALT;
    const el = access === 'leo' ? 50 : 45;
    const up = slantKm(alt, el);
    legs.push({ name: access === 'leo' ? 'Dish → LEO satellite (Ku-band radio)' : 'Dish → GEO satellite (Ka-band radio)', kind: 'space', from: homeName, to: 'satellite', km: up, ms: up / C_KM_PER_MS, points: [home, mid] });
    legs.push({ name: 'Satellite → ground station (gateway)', kind: 'space', from: 'satellite', to: `gateway near ${h0.name}`, km: up, ms: up / C_KM_PER_MS, points: [mid, h0.at] });
  }
  let cur = h0.id;
  for (const l of h0.id === h1.id ? [] : hubPath(h0.id, h1.id)) {
    const reverse = l.b === cur;
    const next = reverse ? l.a : l.b;
    legs.push(leg(l.name, l.kind, hubById(cur).name, hubById(next).name, linkPts(l, reverse), linkKm(l)));
    cur = next;
  }
  legs.push(leg(`${h1.name} → server`, 'land', h1.name, destName, [h1.at, dest]));
  const points = legs.flatMap((l, i) => (i ? l.points.slice(1) : l.points));
  const km = legs.reduce((n, l) => n + l.km, 0);
  // Satellite: Starlink adds ~10–20 ms scheduling/processing; GEO modem/hub adds ~30 ms
  const extra = access === 'leo' ? 10 : access === 'geo' ? 30 : 0;
  const oneWayMs = legs.reduce((n, l) => n + l.ms, 0) + ROUTER_MS * (legs.length + 4) + extra;
  return { legs, points, km, oneWayMs, hubs: [h0.id, ...legs.filter((l) => l.kind === 'subsea' || l.kind === 'land').map((l) => l.to)] };
}
