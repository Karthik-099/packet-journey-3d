import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, Line, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { JOURNEYS, type GraphNode } from '../content';
import { useStep, useStore } from '../store';
import { CameraRig, Label3D, alongPolyline, tipProps, type V3 } from './common';

const KIND: Record<GraphNode['kind'], { color: string; size: V3 }> = {
  user: { color: '#f472b6', size: [1.6, 1, 1.2] },
  dns: { color: '#a78bfa', size: [1.4, 1.6, 1.4] },
  lb: { color: '#fb923c', size: [2, 0.9, 1.4] },
  node: { color: '#60a5fa', size: [2.4, 0.6, 2] },
  pod: { color: '#34d399', size: [1.3, 1.3, 1.3] },
  service: { color: '#22d3ee', size: [1.6, 0.5, 1.6] },
  policy: { color: '#f43f5e', size: [1.6, 1.2, 0.25] },
  server: { color: '#c4b5fd', size: [1.4, 2, 1.2] },
};
const P = (n: GraphNode, y = 0): V3 => [n.pos[0], y, n.pos[1]];

function Packet({ pts, reduced }: { pts: THREE.Vector3[]; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const t0 = useRef(performance.now());
  const len = useMemo(() => pts.slice(1).reduce((n, p, i) => n + p.distanceTo(pts[i]!), 0), [pts]);
  useEffect(() => {
    t0.current = performance.now();
  }, [pts]);
  useFrame(() => {
    if (!ref.current) return;
    const dur = Math.max(800, (len / 7) * 1000);
    const e = (performance.now() - t0.current) / dur;
    alongPolyline(pts, reduced ? 1 : pts.length > 2 && pts[0]!.equals(pts.at(-1)!) ? e % 1 : Math.min(1, e % 1.6), ref.current.position);
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.28, 1]} />
      <meshStandardMaterial color="#fdba74" emissive="#fb923c" emissiveIntensity={2} toneMapped={false} />
      <pointLight color="#fb923c" intensity={6} distance={5} />
    </mesh>
  );
}

/** Generic 3D scene for graph journeys: platforms for groups, boxes for nodes, a packet along the step's path. */
export function GraphScene({ reduced }: { reduced: boolean }) {
  const journey = useStore((s) => s.journey);
  const step = useStep();
  const g = JOURNEYS[journey].graph!;
  const byId = useMemo(() => new Map(g.nodes.map((n) => [n.id, n])), [g]);
  const focus = byId.get(step.focus) ?? g.nodes[0]!;
  const pts = useMemo(() => (step.path ?? [step.focus]).map((id) => byId.get(id)).filter(Boolean).map((n) => new THREE.Vector3(...P(n!, 1.4))), [step, byId]);
  const active = new Set(step.path ?? [step.focus]);
  const cam: V3 = [focus.pos[0] - 3, 12, focus.pos[1] + 17];
  return (
    <>
      <CameraRig pos={cam} target={[focus.pos[0], 0.5, focus.pos[1]]} instant={reduced} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 14, 8]} intensity={1.6} color="#fff1e6" />
      <Grid position={[0, -0.01, 0]} args={[80, 80]} cellColor="#231a4a" sectionColor="#3b2d78" fadeDistance={60} infiniteGrid />
      {g.groups?.map((gr) => {
        const w = gr.to[0] - gr.from[0];
        const d = gr.to[1] - gr.from[1];
        return (
          <group key={gr.id} position={[gr.from[0] + w / 2, 0, gr.from[1] + d / 2]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#7c3aed" transparent opacity={0.08} />
            </mesh>
            <Line points={[[-w / 2, 0.02, -d / 2], [w / 2, 0.02, -d / 2], [w / 2, 0.02, d / 2], [-w / 2, 0.02, d / 2], [-w / 2, 0.02, -d / 2]]} color="#a78bfa" lineWidth={1.5} dashed dashSize={0.5} gapSize={0.3} />
            <Label3D position={[-w / 2 + 0.2 + gr.label.length * 0.07, 0.5, -d / 2 - 0.4]} title={gr.label} size={0.24} color="#a78bfa" />
          </group>
        );
      })}
      {g.edges.map(([a, b]) => {
        const na = byId.get(a)!;
        const nb = byId.get(b)!;
        const on = active.has(a) && active.has(b);
        return <Line key={a + b} points={[P(na, 0.6), P(nb, 0.6)]} color={on ? '#fb923c' : '#4c3f8f'} lineWidth={on ? 3 : 1.2} transparent opacity={on ? 1 : 0.7} />;
      })}
      {g.nodes.map((n) => {
        const k = KIND[n.kind];
        const on = n.id === step.focus;
        const inPath = active.has(n.id);
        return (
          <group key={n.id} position={P(n, k.size[1] / 2)} {...tipProps(n.id)}>
            <RoundedBox args={k.size} radius={0.12}>
              <meshStandardMaterial color={k.color} emissive={k.color} emissiveIntensity={on ? 0.9 : inPath ? 0.35 : 0.08} roughness={0.35} metalness={0.25} transparent opacity={inPath || on ? 1 : 0.55} />
            </RoundedBox>
            <Label3D position={[0, k.size[1] / 2 + 0.9, 0]} title={n.label} sub={on || inPath ? n.sub : undefined} on={on} size={on ? 0.36 : 0.28} />
          </group>
        );
      })}
      {pts.length > 0 && <Packet pts={pts} reduced={reduced} />}
    </>
  );
}
