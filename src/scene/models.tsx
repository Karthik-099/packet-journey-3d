import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import fontRegular from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff?url';
import { glyphSafe, tipProps } from './common';

/** Small low-poly models, built around their own origin with Y up (placed on the globe by <OnGlobe>). */

export const glow = (c: string, i = 1) => <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} toneMapped={false} />;
export const body = (c = '#1e293b') => <meshStandardMaterial color={c} roughness={0.45} metalness={0.5} />;

export function Laptop({ stepId }: { stepId: string }) {
  const enter = useRef<THREE.Mesh>(null);
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (enter.current) enter.current.position.y = stepId === 'g-key' ? 0.08 - Math.max(0, Math.sin(clock.elapsedTime * 4)) * 0.05 : 0.08;
    if (screen.current) {
      const rendering = stepId.startsWith('g-render');
      screen.current.emissiveIntensity = rendering ? 1.1 : 0.45;
      screen.current.emissive.set(stepId === 'g-render-paint' ? '#e2e8f0' : rendering ? '#64748b' : '#0ea5e9');
    }
  });
  return (
    <group {...tipProps('laptop')}>
      <RoundedBox args={[2.6, 0.1, 1.7]} radius={0.04}>{body('#334155')}</RoundedBox>
      {/* keyboard deck and trackpad as clean inset plates */}
      <RoundedBox args={[2.25, 0.03, 0.85]} radius={0.02} position={[0, 0.06, -0.12]}>{body('#0f172a')}</RoundedBox>
      <RoundedBox args={[0.8, 0.02, 0.45]} radius={0.02} position={[0, 0.06, 0.55]}>{body('#1e293b')}</RoundedBox>
      <mesh ref={enter} position={[1.2, 0.08, -0.1]} {...tipProps('keyboard')}>
        <boxGeometry args={[0.2, 0.05, 0.35]} />
        {glow(stepId === 'g-key' ? '#fbbf24' : '#334155', stepId === 'g-key' ? 1.5 : 0.2)}
      </mesh>
      <group position={[0, 0.85, -0.85]} rotation={[-0.2, 0, 0]} {...tipProps('browser')}>
        <RoundedBox args={[2.6, 1.6, 0.06]} radius={0.03}>{body('#334155')}</RoundedBox>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[2.4, 1.4]} />
          <meshStandardMaterial ref={screen} color="#020617" emissive="#0ea5e9" emissiveIntensity={0.45} />
        </mesh>
      </group>
    </group>
  );
}

export function ScreenText({ text, dark }: { text: string; dark: boolean }) {
  return (
    <group position={[0, 0.85, -0.85]} rotation={[-0.2, 0, 0]}>
      <Text font={fontRegular} position={[0, 0, 0.05]} fontSize={0.14} maxWidth={2.2} textAlign="center" anchorX="center" anchorY="middle" color={dark ? '#0f172a' : '#e0f2fe'}>
        {glyphSafe(text)}
      </Text>
    </group>
  );
}

export function Router() {
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => led.current && (led.current.emissiveIntensity = 0.5 + Math.abs(Math.sin(clock.elapsedTime * 7)) * 2));
  return (
    <group {...tipProps('router')}>
      <RoundedBox args={[1.6, 0.35, 1]} radius={0.06}>{body('#1f2a44')}</RoundedBox>
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.65, -0.4]} rotation={[0, 0, x * 0.3]}>
          <cylinderGeometry args={[0.03, 0.04, 1, 8]} />
          {body('#0f172a')}
        </mesh>
      ))}
      <mesh position={[0.5, 0.05, 0.51]}>
        <boxGeometry args={[0.35, 0.05, 0.02]} />
        <meshStandardMaterial ref={led} color="#34d399" emissive="#34d399" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Expanding radio rings (Wi-Fi or satellite uplink) */
export function Rings({ color, on, scale = 1 }: { color: string; on: boolean; scale?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((r, i) => {
      const s = ((clock.elapsedTime * 0.6 + i / 3) % 1) * 2.5 * scale;
      r.scale.setScalar(0.2 + s);
      ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = on ? 0.7 * (1 - s / (2.5 * scale)) : 0;
    });
  });
  return (
    <group ref={g} rotation={[Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <torusGeometry args={[1, 0.03, 6, 48]} />
          <meshBasicMaterial color={color} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function Dish() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.8, 8]} />
        {body('#475569')}
      </mesh>
      <mesh position={[0, 0.9, 0]} rotation={[-0.6, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.06, 32]} />
        {body('#e2e8f0')}
      </mesh>
    </group>
  );
}

export function Isp({ on }: { on: boolean }) {
  return (
    <group {...tipProps('isp')}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.8, 2.2, 1.4]} />
        {body('#17223b')}
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.5 + i * 0.45, 0.71]}>
          <planeGeometry args={[1.5, 0.08]} />
          {glow(on ? '#22d3ee' : '#0e7490', on ? 1.3 : 0.5)}
        </mesh>
      ))}
      <mesh position={[1.3, 2, -0.2]}>
        <cylinderGeometry args={[0.05, 0.12, 4, 6]} />
        {body('#475569')}
      </mesh>
    </group>
  );
}

/** A rack cabinet of 1U servers: drive bays, status strip and blinking activity LEDs. Brightens on hover. */
export function ServerPair({ id, on }: { id: string; on: boolean }) {
  const UNITS = 6;
  const leds = useRef<THREE.InstancedMesh>(null);
  const [hover, setHover] = useState(false);
  const col = useMemo(() => new THREE.Color(), []);
  const last = useRef(0);
  useEffect(() => {
    const m = new THREE.Object3D();
    for (let i = 0; i < UNITS * 2; i++) {
      m.position.set(0.46 + (i % 2) * 0.09, 0.32 + Math.floor(i / 2) * 0.34, 0.47);
      m.updateMatrix();
      leds.current?.setMatrixAt(i, m.matrix);
    }
    if (leds.current) leds.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    if (!leds.current || clock.elapsedTime - last.current < 0.12) return;
    last.current = clock.elapsedTime;
    // activity LEDs flicker like real disk/network lights; busier when this server is in focus
    for (let i = 0; i < UNITS * 2; i++) leds.current.setColorAt(i, col.set(i % 2 ? (Math.random() < (on ? 0.6 : 0.25) ? '#fbbf24' : '#3f2d0a') : '#34d399'));
    if (leds.current.instanceColor) leds.current.instanceColor.needsUpdate = true;
  });
  const lit = on || hover;
  return (
    <group
      {...tipProps(id)}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerLeave={() => setHover(false)}
    >
      {/* cabinet frame */}
      <mesh position={[0, 1.1, -0.05]}>
        <boxGeometry args={[1.45, 2.25, 1.0]} />
        <meshStandardMaterial color="#0b1622" metalness={0.7} roughness={0.35} emissive={lit ? '#0e7490' : '#000000'} emissiveIntensity={lit ? 0.25 : 0} />
      </mesh>
      {Array.from({ length: UNITS }, (_, u) => (
        <group key={u} position={[0, 0.32 + u * 0.34, 0]}>
          <RoundedBox args={[1.25, 0.28, 0.9]} radius={0.02}>{body('#1f2a3a')}</RoundedBox>
          {/* front bezel: four drive bays + a status strip */}
          {[-0.45, -0.3, -0.15, 0].map((x) => (
            <mesh key={x} position={[x, 0, 0.455]}>
              <planeGeometry args={[0.12, 0.18]} />
              <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0.22, 0, 0.456]}>
            <planeGeometry args={[0.26, 0.05]} />
            {glow(lit ? '#22d3ee' : '#155e75', lit ? 1.6 : 0.5)}
          </mesh>
        </group>
      ))}
      <instancedMesh ref={leds} args={[undefined, undefined, UNITS * 2]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function DataCenter({ on }: { on: boolean }) {
  const racks = useRef<THREE.InstancedMesh>(null);
  const leds = useRef<THREE.InstancedMesh>(null);
  const N = 18;
  useEffect(() => {
    const m = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const x = -1.9 + (i % 6) * 0.75;
      const z = -0.6 - Math.floor(i / 6) * 1.5;
      m.position.set(x, 0.95, z);
      m.updateMatrix();
      racks.current?.setMatrixAt(i, m.matrix);
      m.position.set(x, 0.95, z + 0.51);
      m.updateMatrix();
      leds.current?.setMatrixAt(i, m.matrix);
    }
    if (racks.current) racks.current.instanceMatrix.needsUpdate = true;
    if (leds.current) leds.current.instanceMatrix.needsUpdate = true;
  }, []);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => ring.current && (ring.current.rotation.z += dt * (on ? 1.5 : 0.3)));
  return (
    <group {...tipProps('google')}>
      <mesh position={[0, 0.02, -1.6]}>
        <boxGeometry args={[5.2, 0.04, 4.4]} />
        {body('#0b1222')}
      </mesh>
      <instancedMesh ref={racks} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.6, 1.9, 1]} />
        <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={leds} args={[undefined, undefined, N]}>
        <planeGeometry args={[0.4, 1.5]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={on ? 0.9 : 0.3} transparent opacity={0.35} toneMapped={false} />
      </instancedMesh>
      <group position={[0, 0.8, 1.1]}>
        <RoundedBox args={[1.3, 1.6, 0.9]} radius={0.06}>{body('#1e293b')}</RoundedBox>
        <mesh ref={ring} position={[0, 0, 0.5]}>
          <torusGeometry args={[0.45, 0.05, 8, 48, Math.PI * 1.6]} />
          {glow('#34d399', on ? 2 : 0.7)}
        </mesh>
      </group>
    </group>
  );
}

export function SatelliteModel({ on }: { on: boolean }) {
  return (
    <group {...tipProps('satellite')}>
      <mesh>
        <boxGeometry args={[0.5, 0.35, 0.35]} />
        {body('#cbd5e1')}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.9, 0, 0]}>
          <boxGeometry args={[1.1, 0.03, 0.45]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#1e3a8a" emissiveIntensity={on ? 0.8 : 0.3} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
