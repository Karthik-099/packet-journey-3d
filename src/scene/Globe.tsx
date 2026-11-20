import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import { CABLES, SITES, LONG_ROUTE } from '../content/cables';
import { toXYZ, type LatLon } from '../lib/geo';
import { Label3D, alongPolyline, tipProps } from './common';

export const GLOBE_R = 3;
const FACE: LatLon = [26, 48]; // rotate so the India–Europe corridor faces the camera

/** Great-circle interpolate lat/lon polyline so lines hug the sphere. */
function densify(route: LatLon[], r: number, steps = 8): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = new THREE.Vector3(...toXYZ(route[i]!, 1));
    const b = new THREE.Vector3(...toXYZ(route[i + 1]!, 1));
    for (let k = 0; k < steps; k++) out.push(a.clone().lerp(b, k / steps).normalize().multiplyScalar(r));
  }
  out.push(new THREE.Vector3(...toXYZ(route.at(-1)!, r)));
  return out;
}

function Coastlines() {
  const geo = useMemo(() => {
    const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
    const m = mesh(topo, topo.objects.land) as unknown as { coordinates: number[][][] };
    const pos: number[] = [];
    for (const line of m.coordinates)
      for (let i = 0; i < line.length - 1; i++) {
        const [lo1, la1] = line[i]!;
        const [lo2, la2] = line[i + 1]!;
        pos.push(...toXYZ([la1!, lo1!], GLOBE_R * 1.002), ...toXYZ([la2!, lo2!], GLOBE_R * 1.002));
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#38bdf8" transparent opacity={0.55} />
    </lineSegments>
  );
}

export interface GlobeProps {
  position: [number, number, number];
  path: 'edge' | 'long';
  /** 'out' = travel to Google, 'back' = return trip, undefined = idle */
  travel?: 'out' | 'back';
  /** real one-way propagation in ms; animation runs 40× slower so it can be followed */
  oneWayMs: number;
  showLabels: boolean;
  home: LatLon;
  /** nearest Google edge PoP (edge path destination) */
  pop: LatLon;
  reduced: boolean;
}

export function Globe({ position, path, travel, oneWayMs, showLabels, home, pop, reduced }: GlobeProps) {
  const [rx, ry] = useMemo(() => {
    const [x, , z] = toXYZ(FACE, 1);
    return [(FACE[0] * Math.PI) / 180, -Math.atan2(x, z)];
  }, []);
  const cables = useMemo(() => CABLES.map((c) => ({ ...c, pts: densify(c.route, GLOBE_R * 1.006) })), []);
  const route = useMemo(() => {
    const r: LatLon[] = path === 'edge' ? [home, pop] : [home, ...LONG_ROUTE];
    const pts = densify(r, GLOBE_R * 1.02, 10);
    // lift the middle a bit for the short edge hop so it is visible
    if (path === 'edge') pts.forEach((p, i) => p.multiplyScalar(1 + Math.sin((i / (pts.length - 1)) * Math.PI) * 0.04));
    return pts;
  }, [path, home, pop]);
  const dot = useRef<THREE.Mesh>(null);
  const start = useRef(0);
  useEffect(() => {
    start.current = performance.now();
  }, [travel, path]);
  useFrame(() => {
    if (!dot.current) return;
    dot.current.visible = !!travel;
    if (!travel) return;
    const dur = Math.max(800, oneWayMs * 40);
    const t = reduced ? 1 : Math.min(1, (performance.now() - start.current) / dur);
    alongPolyline(route, travel === 'out' ? t : 1 - t, dot.current.position);
  });
  return (
    <group position={position}>
      <group rotation={[rx, 0, 0]}>
        <group rotation={[0, ry, 0]}>
          <mesh {...tipProps('globe')}>
            <sphereGeometry args={[GLOBE_R, 64, 64]} />
            <meshStandardMaterial color="#071229" roughness={0.9} metalness={0.1} emissive="#020617" />
          </mesh>
          <mesh>
            <sphereGeometry args={[GLOBE_R * 1.08, 48, 48]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} side={THREE.BackSide} />
          </mesh>
          <Coastlines />
          {cables.map((c) => (
            <Line key={c.id} points={c.pts} color={c.color} lineWidth={path === 'long' && c.id === 'aae1' ? 3 : 1.4} transparent opacity={path === 'long' && c.id !== 'aae1' ? 0.4 : 0.95} />
          ))}
          <Line points={route} color="#ffffff" lineWidth={2} dashed dashSize={0.06} gapSize={0.04} transparent opacity={travel ? 0.9 : 0.4} />
          {SITES.map((s) => (
            <group key={s.id} position={toXYZ(s.at, GLOBE_R * 1.01)}>
              <mesh>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshBasicMaterial color={s.kind === 'dc' ? '#34d399' : s.kind === 'ixp' ? '#fbbf24' : '#22d3ee'} toneMapped={false} />
              </mesh>
              <group visible={showLabels}>
                <Label3D position={[0, s.id === 'fra' ? -0.16 : 0.16, 0]} title={s.name} size={0.1} />
              </group>
            </group>
          ))}
          <group position={toXYZ(home, GLOBE_R * 1.01)}>
            <mesh>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshBasicMaterial color="#fb7185" toneMapped={false} />
            </mesh>
            <group visible={showLabels}>
              <Label3D position={[0, -0.17, 0]} title="YOU" size={0.11} color="#fb7185" on />
            </group>
          </group>
          <mesh ref={dot} visible={false}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
            <pointLight color="#22d3ee" intensity={3} distance={1.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
