import { useMemo } from 'react';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import { CABLES, SITES, LONG_ROUTE } from '../content/cables';
import type { LatLon } from '../lib/geo';

// Crop: South Asia → Europe
const [LON0, LON1, LAT0, LAT1] = [-12, 108, -8, 58];
const W = 600;
const H = (W * (LAT1 - LAT0)) / (LON1 - LON0);
const px = ([lat, lon]: LatLon) => [((lon - LON0) / (LON1 - LON0)) * W, ((LAT1 - lat) / (LAT1 - LAT0)) * H] as const;
const line = (pts: LatLon[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${px(p).map((n) => n.toFixed(1)).join(',')}`).join('');

let landPath: string | null = null;
function getLand() {
  if (landPath) return landPath;
  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
  const fc = feature(topo, topo.objects.land) as unknown as { features: { geometry: { type: string; coordinates: number[][][][] | number[][][] } }[] };
  const polys = fc.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates as number[][][]] : (f.geometry.coordinates as number[][][][])));
  landPath = polys
    .flatMap((poly) => poly.map((ring) => line(ring.map(([lon, lat]) => [lat ?? 0, lon ?? 0] as LatLon)) + 'Z'))
    .join('');
  return landPath;
}

/** 2D map of India's submarine cables. `progress` (0..1) moves the packet along the long route. */
export function WorldMap({ highlight, progress, path }: { highlight?: string; progress?: number; path: 'edge' | 'long' }) {
  const land = useMemo(getLand, []);
  const dot = useMemo(() => {
    if (progress === undefined) return null;
    if (path === 'edge') return px(SITES[0]!.at);
    const segs = LONG_ROUTE.slice(1).map((p, i) => [px(LONG_ROUTE[i]!), px(p)] as const);
    const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
    let d = lens.reduce((a, b) => a + b, 0) * progress;
    for (let i = 0; i < segs.length; i++) {
      const l = lens[i]!;
      if (d <= l) {
        const [a, b] = segs[i]!;
        const t = l ? d / l : 0;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as const;
      }
      d -= l;
    }
    return px(LONG_ROUTE.at(-1)!);
  }, [progress, path]);
  return (
    <svg viewBox={`0 0 ${W} ${H.toFixed(0)}`} className="w-full rounded-md border border-noc-edge bg-[#060b18]" role="img" aria-label="Map of submarine cables between India, Europe and Southeast Asia">
      <path d={land} fill="#0f1a33" stroke="#1e3a5f" strokeWidth={0.5} />
      {CABLES.map((c) => (
        <path key={c.id} d={line(c.route)} fill="none" stroke={c.color} strokeWidth={highlight === c.id ? 2.2 : 1} strokeOpacity={highlight && highlight !== c.id ? 0.35 : 0.9}>
          <title>{`${c.name} (${c.rfs}): ${c.lands}`}</title>
        </path>
      ))}
      {path === 'long' && <path d={line(LONG_ROUTE)} fill="none" stroke="#fff" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.8} />}
      {SITES.map((s) => {
        const [x, y] = px(s.at);
        return (
          <g key={s.id}>
            <circle cx={x} cy={y} r={3} fill={s.kind === 'dc' ? '#34d399' : s.kind === 'ixp' ? '#fbbf24' : '#22d3ee'}>
              <title>{`${s.name}: ${s.detail}`}</title>
            </circle>
            <text x={x + 5} y={y - 4} fontSize={9} fill="#94a3b8">
              {s.name}
            </text>
          </g>
        );
      })}
      {dot && <circle cx={dot[0]} cy={dot[1]} r={4.5} fill="#fff" stroke="#22d3ee" strokeWidth={2} />}
    </svg>
  );
}

export function CableLegend() {
  return (
    <ul className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
      {CABLES.map((c) => (
        <li key={c.id} className="flex items-start gap-2">
          <span className="mt-1.5 h-0.5 w-4 shrink-0" style={{ background: c.color }} />
          <span>
            <span className="text-slate-200">{c.name}</span> <span className="text-slate-500">({c.rfs}) {c.lands}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
