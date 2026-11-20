import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Suspense } from 'react';
import { Earth, Backbone, R, surf } from '../scene/Earth';
import { HUBS, hubById } from '../content/network';
import { Label3D } from '../scene/common';

/** Real hub pairs, so the arcs show plausible long-haul flows. */
const PAIRS: [string, string][] = [
  ['mumbai', 'marseille'], ['chennai', 'singapore'], ['singapore', 'tokyo'], ['tokyo', 'losangeles'], ['london', 'newyork'],
  ['frankfurt', 'mumbai'], ['saopaulo', 'lisbon'], ['sydney', 'singapore'], ['ashburn', 'amsterdam'], ['hongkong', 'sanjose'], ['capetown', 'london'], ['delhi', 'fujairah'],
];
const COLORS = ['#22d3ee', '#34d399', '#60a5fa', '#a7f3d0', '#7dd3fc'];

function Arc({ a, b, color, offset }: { a: string; b: string; color: string; offset: number }) {
  const curve = useMemo(() => {
    const p0 = surf(hubById(a).at, 0.02);
    const p2 = surf(hubById(b).at, 0.02);
    const mid = p0.clone().add(p2).multiplyScalar(0.5);
    const lift = 1 + p0.distanceTo(p2) / (R * 2.2);
    return new THREE.QuadraticBezierCurve3(p0, mid.normalize().multiplyScalar(R * lift), p2);
  }, [a, b]);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.012, 6, false), [curve]);
  const dot = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => dot.current?.position.copy(curve.getPoint((clock.elapsedTime * 0.18 + offset) % 1)));
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#ecfeff" toneMapped={false} />
      </mesh>
    </group>
  );
}

function World({ labels }: { labels: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => g.current && (g.current.rotation.y += dt * 0.06));
  return (
    <group ref={g} rotation={[0.35, -1.9, 0]}>
      <Earth />
      <Backbone dim={false} />
      {PAIRS.map(([a, b], i) => <Arc key={a + b} a={a} b={b} color={COLORS[i % COLORS.length]!} offset={i / PAIRS.length} />)}
      {labels && HUBS.map((h) => <Label3D key={h.id} position={surf(h.at, 0.25).toArray()} title={h.name} size={0.13} panel={false} />)}
    </group>
  );
}

/** Decorative, interactive 3D Earth for the landing hero (lazy-loaded). */
export default function HeroGlobe({ labels = false }: { labels?: boolean }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.5, 14.5], fov: 42 }} gl={{ antialias: true, alpha: true }} frameloop={reduced ? 'demand' : 'always'} role="img" aria-label="Rotating 3D Earth with internet backbone links">
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 6, 10]} intensity={2.4} color="#e0f2fe" />
      <Stars radius={60} depth={30} count={1500} factor={2.5} saturation={0} fade />
      <Suspense fallback={null}>
        <World labels={labels} />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.5} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.9} luminanceThreshold={0.6} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
