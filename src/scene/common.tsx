import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { useStore } from '../store';

export type V3 = [number, number, number];

/** Flies camera + orbit target to a goal when it changes; user can orbit freely afterwards. */
export function CameraRig({ pos, target, instant }: { pos: V3; target: V3; instant: boolean }) {
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  const goal = useRef({ pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), active: true });
  const key = pos.join() + target.join();
  useEffect(() => {
    goal.current = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), active: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g.active || !c) return;
    const k = instant ? 1 : 1 - Math.exp(-dt * 2.8);
    camera.position.lerp(g.pos, k);
    c.target.lerp(g.target, k);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.02 && c.target.distanceTo(g.target) < 0.02) g.active = false;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      minDistance={3}
      maxDistance={45}
      maxPolarAngle={Math.PI * 0.52}
      onStart={() => (goal.current.active = false)}
    />
  );
}

/** Click handler props that open the 3D object tooltip. */
export function tipProps(id: string) {
  return {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      useStore.getState().set({ tip: id });
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = '';
    },
  };
}

/** Point along a polyline at t ∈ [0,1] (by length). */
export function alongPolyline(pts: THREE.Vector3[], t: number, out = new THREE.Vector3()) {
  const lens = pts.slice(1).map((p, i) => p.distanceTo(pts[i]!));
  let d = lens.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, t));
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]!) return out.lerpVectors(pts[i]!, pts[i + 1]!, lens[i] ? d / lens[i]! : 0);
    d -= lens[i]!;
  }
  return out.copy(pts.at(-1)!);
}

export { LAYER_COLORS } from './colors';

// troika needs woff/ttf (not woff2); bundled locally so no CDN font fetch
import fontRegular from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff?url';
import fontBold from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url';
import { Billboard, Text } from '@react-three/drei';

/**
 * Keep 3D text inside the bundled font's Latin + punctuation subset. Any other glyph makes troika
 * download fallback fonts from a CDN (a hidden third-party request that our CSP also blocks).
 */
export const glyphSafe = (s: string) => s.replace(/→/g, '›').replace(/←/g, '‹').replace(/[^\n\u0020-\u024F\u2000-\u206F]/g, '?');

/** Real 3D label (no DOM): optional subtitle, panel background, highlight state. */
export function Label3D({
  title,
  sub,
  on = false,
  size = 0.22,
  color,
  panel = true,
  position,
}: {
  title: string;
  sub?: string;
  on?: boolean;
  size?: number;
  color?: string;
  panel?: boolean;
  position?: V3;
}) {
  const w = Math.max(title.length, (sub?.length ?? 0) * 0.75) * size * 0.62 + size * 1.2;
  const h = size * (sub ? 2.6 : 1.6);
  const accent = color ?? (on ? '#22d3ee' : '#64748b');
  return (
    <Billboard position={position}>
      {panel && (
        <>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial color={on ? '#062a33' : '#05070d'} transparent opacity={0.82} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.015]}>
            <planeGeometry args={[w + 0.04, h + 0.04]} />
            <meshBasicMaterial color={accent} transparent opacity={on ? 0.9 : 0.35} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
      <Text font={fontBold} fontSize={size} color={on ? '#ffffff' : '#cbd5e1'} anchorX="center" anchorY="middle" position={[0, sub ? size * 0.55 : 0, 0]}>
        {glyphSafe(title)}
      </Text>
      {sub && (
        <Text font={fontRegular} fontSize={size * 0.7} color={on ? '#a5f3fc' : '#94a3b8'} anchorX="center" anchorY="middle" position={[0, -size * 0.65, 0]}>
          {glyphSafe(sub)}
        </Text>
      )}
    </Billboard>
  );
}
