import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { HUBS, LINKS, hubById } from '../content/network';
import { toXYZ, type LatLon } from '../lib/geo';
import { tipProps } from './common';

export const R = 5;
const BASE = import.meta.env.BASE_URL;

/** Surface point (with altitude h in world units) as a Vector3 */
export const surf = (ll: LatLon, h = 0) => new THREE.Vector3(...toXYZ(ll, R + h));

/** Great-circle interpolation so lines hug the sphere */
export function arc(points: LatLon[], h: number, steps = 12): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = surf(points[i]!).normalize();
    const b = surf(points[i + 1]!).normalize();
    const ang = a.angleTo(b);
    const n = Math.max(2, Math.ceil((ang / Math.PI) * 180 / 3)) || steps;
    for (let k = 0; k < n; k++) {
      const v = new THREE.Vector3().copy(a).lerp(b, k / n);
      if (v.lengthSq() < 1e-6) v.set(0, 1, 0); // antipodal guard
      out.push(v.normalize().multiplyScalar(R + h));
    }
  }
  out.push(surf(points.at(-1)!, h));
  return out;
}

const ATMOS_VERT = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const ATMOS_FRAG = /* glsl */ `
varying vec3 vNormal;
void main() {
  float i = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
  gl_FragColor = vec4(0.3, 0.75, 1.0, 1.0) * i;
}`;

function segmentsGeometry(lines: THREE.Vector3[][]) {
  const pos: number[] = [];
  for (const l of lines) for (let i = 0; i < l.length - 1; i++) pos.push(l[i]!.x, l[i]!.y, l[i]!.z, l[i + 1]!.x, l[i + 1]!.y, l[i + 1]!.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** NASA Blue Marble day map + Black Marble city lights + ocean specular, with an atmosphere rim. */
export function Earth() {
  const [day, night, water] = useLoader(THREE.TextureLoader, [`${BASE}textures/earth-day.jpg`, `${BASE}textures/earth-night.jpg`, `${BASE}textures/earth-water.png`]) as [THREE.Texture, THREE.Texture, THREE.Texture];
  useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = night.anisotropy = 8;
  }, [day, night]);
  return (
    <group>
      <mesh {...tipProps('globe')}>
        <sphereGeometry args={[R, 128, 96]} />
        <meshPhongMaterial map={day} color="#b9c8e0" emissiveMap={night} emissive="#ffcf8a" emissiveIntensity={0.55} specularMap={water} specular="#5b8fc7" shininess={22} />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[R, 64, 48]} />
        <shaderMaterial vertexShader={ATMOS_VERT} fragmentShader={ATMOS_FRAG} side={THREE.BackSide} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

/** All backbone links: subsea cables (blue) and terrestrial fiber (grey), merged into two draw calls. */
export function Backbone({ dim }: { dim: boolean }) {
  const [subsea, land] = useMemo(() => {
    const pts = (kind: 'subsea' | 'land') => LINKS.filter((l) => l.kind === kind).map((l) => arc([hubById(l.a).at, ...(l.via ?? []), hubById(l.b).at], 0.012));
    return [segmentsGeometry(pts('subsea')), segmentsGeometry(pts('land'))];
  }, []);
  useEffect(() => () => {
    subsea.dispose();
    land.dispose();
  }, [subsea, land]);
  return (
    <group {...tipProps('cable')}>
      <lineSegments geometry={subsea}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={dim ? 0.35 : 0.75} />
      </lineSegments>
      <lineSegments geometry={land}>
        <lineBasicMaterial color="#cbd5e1" transparent opacity={dim ? 0.15 : 0.35} />
      </lineSegments>
      {HUBS.map((h) => (
        <mesh key={h.id} position={surf(h.at, 0.015)}>
          <sphereGeometry args={[0.014, 8, 8]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
