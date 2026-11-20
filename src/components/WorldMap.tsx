import { useMemo } from 'react';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import { HUBS, LINKS, hubById } from '../content/network';
import type { LatLon } from '../lib/geo';
import type { Route } from '../lib/routing';

const W = 720;
const H = 360;
const px = ([lat, lon]: LatLon) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H] as const;
/** Split at the antimeridian so lines don't streak across the map */
function line(pts: LatLon[]) {
  let d = '';
  pts.forEach((p, i) => {
    const [x, y] = px(p);
    const jump = i > 0 && Math.abs(p[1] - pts[i - 1]![1]) > 180;
    d += `${i === 0 || jump ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return d;
}

let landPath: string | null = null;
function getLand() {
  if (landPath) return landPath;
  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
  const fc = feature(topo, topo.objects.land) as unknown as { features: { geometry: { type: string; coordinates: number[][][][] | number[][][] } }[] };
  const polys = fc.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates as number[][][]] : (f.geometry.coordinates as number[][][][])));
  landPath = polys.flatMap((poly) => poly.map((ring) => line(ring.map(([lon, lat]) => [lat ?? 0, lon ?? 0] as LatLon)) + 'Z')).join('');
  return landPath;
}

/** Flat world map: backbone graph, your route, moving packet (progress 0..1). */
export function WorldMap({ route, progress, home, dest }: { route: Route; progress?: number; home: LatLon; dest: LatLon }) {
  const land = useMemo(getLand, []);
  const dot = useMemo(() => {
    if (progress === undefined) return null;
    const pts = route.points;
    const seg = pts.slice(1).map((p, i) => [px(pts[i]!), px(p), Math.abs(p[1] - pts[i]![1]) > 180] as const);
    const lens = seg.map(([a, b, jump]) => (jump ? 0 : Math.hypot(b[0] - a[0], b[1] - a[1])));
    let d = lens.reduce((a, b) => a + b, 0) * progress;
    for (let i = 0; i < seg.length; i++) {
      const l = lens[i]!;
      if (d <= l && l > 0) {
        const [a, b] = seg[i]!;
        return [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l] as const;
      }
      d -= l;
    }
    return px(pts.at(-1)!);
  }, [progress, route]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-noc-edge bg-gradient-to-b from-[#06122a] to-[#040a18]" role="img" aria-label="World map of backbone cables and your packet's route">
      <path d={land} fill="#10203d" stroke="#1e3a5f" strokeWidth={0.4} />
      {LINKS.map((l, i) => (
        <path key={i} d={line([hubById(l.a).at, ...(l.via ?? []), hubById(l.b).at])} fill="none" stroke={l.kind === 'subsea' ? '#38bdf8' : '#64748b'} strokeWidth={0.7} strokeOpacity={0.45} strokeDasharray={l.kind === 'land' ? '2 2' : undefined}>
          <title>{l.name}</title>
        </path>
      ))}
      <path d={line(route.points)} fill="none" stroke="#fbbf24" strokeWidth={2} />
      {HUBS.map((h) => {
        const [x, y] = px(h.at);
        return (
          <circle key={h.id} cx={x} cy={y} r={2} fill="#22d3ee">
            <title>{`${h.name}: ${h.ixp}`}</title>
          </circle>
        );
      })}
      {[
        [home, 'YOU', '#fb7185'],
        [dest, 'SERVER', '#34d399'],
      ].map(([p, t, c]) => {
        const [x, y] = px(p as LatLon);
        return (
          <g key={t as string}>
            <circle cx={x} cy={y} r={4} fill={c as string} />
            <text x={x + 6} y={y - 5} fontSize={10} fontWeight={700} fill={c as string}>{t as string}</text>
          </g>
        );
      })}
      {dot && <circle cx={dot[0]} cy={dot[1]} r={4.5} fill="#fff" stroke="#fbbf24" strokeWidth={2} />}
    </svg>
  );
}
