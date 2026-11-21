import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Earth, R } from './Earth';
import { toXYZ } from '../lib/geo';

/** public/data/cables.json, built by scripts/build-cable-data.py from TeleGeography's map (CC BY-NC-SA 3.0). */
export interface CableData {
  source: string;
  cables: { n: string; c: string; s: [number, number][][] }[];
  landings: [number, number, string][];
}

let cache: Promise<CableData> | null = null;
export const loadCables = () => (cache ??= fetch(`${import.meta.env.BASE_URL}data/cables.json`).then((r) => r.json() as Promise<CableData>));

const VERT = /* glsl */ `
attribute float aT;
attribute vec3 aColor;
varying float vT;
varying vec3 vColor;
void main() {
  vT = aT;
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
/** A bright pulse travels along every cable at constant speed (aT is distance along the cable). */
const FRAG = /* glsl */ `
uniform float uTime;
varying float vT;
varying vec3 vColor;
void main() {
  float p = fract(vT - uTime * 0.12);
  float pulse = smoothstep(0.0, 0.04, p) * (1.0 - smoothstep(0.04, 0.16, p));
  gl_FragColor = vec4(vColor * (0.55 + 2.2 * pulse), 0.55 + 0.45 * pulse);
}`;

function Cables({ data }: { data: CableData }) {
  const { geo, landings } = useMemo(() => {
    const pos: number[] = [];
    const t: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    const tint = new THREE.Color('#22d3ee');
    for (const cable of data.cables) {
      c.set(cable.c).lerp(tint, 0.45); // keep each cable's identity, unified toward the site palette
      const offset = Math.random();
      for (const seg of cable.s) {
        let dist = 0;
        for (let i = 0; i < seg.length - 1; i++) {
          const [lo1, la1] = seg[i]!;
          const [lo2, la2] = seg[i + 1]!;
          if (Math.abs(lo2 - lo1) > 180) continue; // antimeridian jump
          const a = toXYZ([la1, lo1], R * 1.004);
          const b = toXYZ([la2, lo2], R * 1.004);
          const step = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          pos.push(...a, ...b);
          t.push(offset + dist / 9, offset + (dist + step) / 9);
          dist += step;
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
    const lp = new THREE.BufferGeometry();
    lp.setAttribute('position', new THREE.Float32BufferAttribute(data.landings.flatMap(([lon, lat]) => toXYZ([lat, lon], R * 1.006)), 3));
    return { geo: g, landings: lp };
  }, [data]);
  useEffect(() => () => {
    geo.dispose();
    landings.dispose();
  }, [geo, landings]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => mat.current && (mat.current.uniforms.uTime!.value = clock.elapsedTime));
  return (
    <group>
      <lineSegments geometry={geo}>
        <shaderMaterial ref={mat} vertexShader={VERT} fragmentShader={FRAG} uniforms={{ uTime: { value: 0 } }} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <points geometry={landings}>
        <pointsMaterial color="#a7f3d0" size={0.035} sizeAttenuation transparent opacity={0.9} toneMapped={false} />
      </points>
    </group>
  );
}

function World({ data, spin }: { data: CableData | null; spin: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => spin && g.current && (g.current.rotation.y += dt * 0.05));
  return (
    <group ref={g} rotation={[0.35, -1.9, 0]}>
      <Earth night />
      {data && <Cables data={data} />}
    </group>
  );
}

/** 3D globe showing only the real submarine cable network (lazy-loaded). */
export default function CableGlobe({ zoom = false, onData }: { zoom?: boolean; onData?: (d: CableData) => void }) {
  const [data, setData] = useState<CableData | null>(null);
  useEffect(() => {
    void loadCables().then((d) => {
      setData(d);
      onData?.(d);
    });
    // load once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.5, 14.5], fov: 42 }} gl={{ antialias: true, alpha: true }} role="img" aria-label="3D globe of the world's submarine internet cables">
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 6, 10]} intensity={1.6} color="#dbeafe" />
      <Stars radius={60} depth={30} count={1500} factor={2.5} saturation={0} fade />
      <Suspense fallback={null}>
        <World data={data} spin={!reduced} />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={zoom} minDistance={7} maxDistance={22} rotateSpeed={0.5} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.1} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
