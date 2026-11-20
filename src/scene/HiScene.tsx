import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, RoundedBox, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { OSI, type Step } from '../content';
import { useCtx, useStep, useStore } from '../store';
import { CameraRig, LAYER_COLORS, Label3D, tipProps, type V3 } from './common';
import fontBold from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url';

const SX = -4.5;
const RX = 4.5;
const ly = (n: number) => 0.9 + (n - 1) * 0.85;
const DEPTH: Record<string, number> = { Data: 0, Segment: 1, Packet: 2, Frame: 3, Bits: 4 };

function Stack({ x, side, active, tcpip }: { x: number; side: 'sender' | 'receiver'; active?: number; tcpip: boolean }) {
  return (
    <group position={[x, 0, 0]}>
      {OSI.map((l) => {
        const on = active === l.n;
        return (
          <RoundedBox key={l.n} args={[3, 0.62, 1.7]} radius={0.08} position={[0, ly(l.n), 0]} {...tipProps(`${side}-${l.n}`)}>
            <meshStandardMaterial color={LAYER_COLORS[l.n]} emissive={LAYER_COLORS[l.n]} emissiveIntensity={on ? 1.6 : 0.12} transparent opacity={on ? 0.95 : 0.55} roughness={0.35} metalness={0.2} />
            <Text font={fontBold} position={[0, 0, 0.86]} fontSize={0.22} color={on ? '#ffffff' : '#e2e8f0'} fillOpacity={on ? 1 : 0.75} anchorX="center" anchorY="middle">
              {`L${l.n}  ${l.name}`}
            </Text>
          </RoundedBox>
        );
      })}
      {tcpip &&
        (
          [
            ['Application', 5, 7],
            ['Transport', 4, 4],
            ['Internet', 3, 3],
            ['Link', 1, 2],
          ] as const
        ).map(([name, a, b]) => {
          const y = (ly(a) + ly(b)) / 2;
          const h = ly(b) - ly(a) + 0.7;
          const dx = side === 'sender' ? -1.8 : 1.8;
          return (
            <group key={name} position={[dx, y, 0]}>
              <mesh>
                <boxGeometry args={[0.12, h, 0.12]} />
                <meshBasicMaterial color="#e2e8f0" transparent opacity={0.6} />
              </mesh>
              <Label3D position={[side === 'sender' ? -1.05 : 1.05, 0, 0]} title={name} size={0.18} color="#e2e8f0" />
            </group>
          );
        })}
      <Label3D position={[0, ly(7) + 0.8, 0]} title={side === 'sender' ? 'SENDER' : 'RECEIVER'} sub={side === 'sender' ? '192.168.1.10 · 02:1a:2b:3c:4d:5e' : '192.168.1.20 · 02:aa:bb:cc:dd:ee'} on size={0.24} />
    </group>
  );
}

const cablePts = [new THREE.Vector3(SX, ly(1) - 0.4, 0.3), new THREE.Vector3(SX + 1.5, 0.05, 0.9), new THREE.Vector3(0, 0.05, 1.3), new THREE.Vector3(RX - 1.5, 0.05, 0.9), new THREE.Vector3(RX, ly(1) - 0.4, 0.3)];
const curve = new THREE.CatmullRomCurve3(cablePts);

function Cable({ medium, live, bits }: { medium: string; live: boolean; bits: number[] }) {
  const color = medium === 'copper' ? '#fbbf24' : medium === 'fiber' ? '#22d3ee' : '#a78bfa';
  const N = 40;
  const pulses = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.Group>(null);
  const m = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (pulses.current) {
      for (let i = 0; i < N; i++) {
        const u = (i / N + t * 0.12) % 1;
        m.position.copy(curve.getPointAt(u));
        const bit = bits[i % bits.length] ?? 0;
        m.scale.setScalar(live ? (bit ? 1 : 0.45) : 0.001);
        m.updateMatrix();
        pulses.current.setMatrixAt(i, m.matrix);
        pulses.current.setColorAt(i, col.set(bit ? color : '#334155'));
      }
      pulses.current.instanceMatrix.needsUpdate = true;
      if (pulses.current.instanceColor) pulses.current.instanceColor.needsUpdate = true;
    }
    if (rings.current)
      rings.current.children.forEach((r, i) => {
        const s = ((t * 0.5 + i / 3) % 1) * 5;
        r.scale.setScalar(0.2 + s);
        ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = live ? 0.5 * (1 - s / 5) : 0;
      });
  });
  return (
    <group>
      <mesh {...tipProps('cable')}>
        <tubeGeometry args={[curve, 80, medium === 'wifi' ? 0.03 : 0.09, 10, false]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={live ? 0.8 : 0.2} transparent opacity={medium === 'wifi' ? 0.25 : 0.9} />
      </mesh>
      <instancedMesh ref={pulses} args={[undefined, undefined, N]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {medium === 'wifi' && (
        <group ref={rings} position={[SX + 1.5, 0.6, 0.6]} rotation={[0, Math.PI / 2, 0]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <torusGeometry args={[1, 0.02, 8, 48, Math.PI / 1.5]} />
              <meshBasicMaterial color={color} transparent toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

const SHELLS = [
  { name: 'TCP', color: '#22d3ee', pad: 0.22 },
  { name: 'IP', color: '#34d399', pad: 0.44 },
  { name: 'Ethernet', color: '#fbbf24', pad: 0.66 },
];

function Packet({ step, msgLen, cipher, wireBytes }: { step: Step; msgLen: number; cipher: boolean; wireBytes: number }) {
  const g = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const shells = useRef<(THREE.Group | null)[]>([]);
  const depth = DEPTH[step.pdu ?? 'Data'] ?? 0;
  const handshake = step.id === 'hi-l4-handshake';
  const side = step.side ?? 'sender';
  const core = 0.35 + Math.min(0.5, msgLen * 0.03);
  const target = useMemo<V3>(() => {
    const x = side === 'receiver' ? RX : SX;
    if (side === 'wire') return [0, 0.6, 1.3];
    return [x + (side === 'receiver' ? -2.6 : 2.6), ly(step.layer ?? 7), 0.4];
  }, [side, step.layer]);
  const tv = useMemo(() => new THREE.Vector3(...target), [target]);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.position.lerp(tv, 1 - Math.exp(-dt * 4));
    if (spin.current) spin.current.rotation.y += dt * 0.4;
    const vis = handshake ? 0 : depth >= 4 ? 0.0001 : 1;
    if (spin.current) spin.current.scale.lerp(new THREE.Vector3(vis, vis, vis).addScalar(0.0001), 1 - Math.exp(-dt * 6));
    shells.current.forEach((s, i) => {
      if (!s) return;
      const want = i < depth ? 1 : 0.0001;
      s.scale.lerp(new THREE.Vector3(want, want, want), 1 - Math.exp(-dt * 5));
    });
  });
  const coreColor = cipher ? '#a78bfa' : '#fde68a';
  return (
    <group ref={g} position={target} {...tipProps('packet')}>
      <group ref={spin}>
      <mesh>
        <boxGeometry args={[core, core, core]} />
        <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={1.2} />
      </mesh>
      {SHELLS.map((s, i) => {
        const size = core + s.pad * 2;
        return (
          <group key={s.name} ref={(el) => void (shells.current[i] = el)} scale={0.0001}>
            <mesh>
              <boxGeometry args={[size, size, size]} />
              <meshStandardMaterial color={s.color} transparent opacity={0.12} depthWrite={false} />
              <Edges color={s.color} />
            </mesh>
          </group>
        );
      })}
      </group>
      <group visible={!handshake}>
        <Label3D position={[0, core / 2 + 1.05, 0]} title={depth >= 4 ? `${wireBytes * 8} bits` : `${step.pdu}${cipher ? ' · encrypted' : ''}`} color="#34d399" on size={0.2} />
      </group>
    </group>
  );
}

/** SYN → SYN-ACK → ACK envelopes over an arc at L4 height */
function Handshake({ on }: { on: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const arc = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(SX + 1.6, ly(4), 0.5), new THREE.Vector3(0, ly(4) + 1.5, 1), new THREE.Vector3(RX - 1.6, ly(4), 0.5)), []);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.45) % 3;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const local = t - i;
      const vis = on && local >= 0 && local < 1;
      m.visible = vis;
      if (vis) m.position.copy(arc.getPoint(i === 1 ? 1 - local : local));
    });
  });
  const labels = ['SYN', 'SYN-ACK', 'ACK'];
  return (
    <>
      {labels.map((l, i) => (
        <mesh key={l} ref={(el) => void (refs.current[i] = el)} visible={false}>
          <boxGeometry args={[0.5, 0.32, 0.06]} />
          <meshStandardMaterial color={i === 1 ? '#34d399' : '#22d3ee'} emissive={i === 1 ? '#34d399' : '#22d3ee'} emissiveIntensity={1.4} />
          <Label3D position={[0, 0.45, 0]} title={l} size={0.18} panel={false} />
        </mesh>
      ))}
    </>
  );
}

function Broadcast({ on, y }: { on: boolean; y: number }) {
  const r = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!r.current) return;
    const s = (clock.elapsedTime * 0.8) % 1;
    r.current.scale.setScalar(0.5 + s * 9);
    (r.current.material as THREE.MeshBasicMaterial).opacity = on ? 0.6 * (1 - s) : 0;
  });
  return (
    <mesh ref={r} position={[SX, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1, 0.025, 8, 64]} />
      <meshBasicMaterial color="#fbbf24" transparent toneMapped={false} />
    </mesh>
  );
}

const CAMS: Record<string, { pos: V3; target: V3 }> = {
  default: { pos: [0, 5.5, 15], target: [0, 3.3, 0] },
  cable: { pos: [0, 3.5, 10], target: [0, 1.5, 0.5] },
};

export function HiScene({ reduced }: { reduced: boolean }) {
  const step = useStep();
  const c = useCtx();
  const tcpip = useStore((s) => s.tcpip);
  const medium = useStore((s) => s.medium);
  const side = step.side;
  const live = step.layer === 1;
  const cipher = c.tls && !(side === 'sender' && (step.layer ?? 7) === 7) && !(side === 'receiver' && (step.layer ?? 0) >= 6);
  const bits = useMemo(() => Array.from(c.hi.wire.slice(0, 5)).flatMap((b) => Array.from({ length: 8 }, (_, i) => (b >> i) & 1)), [c.hi.wire]);
  const cam = step.focus === 'cable' ? CAMS.cable! : step.layer ? { pos: [side === 'receiver' ? 2.5 : -2.5, ly(step.layer) + 2.2, 15.5] as V3, target: [side === 'receiver' ? 1.2 : -1.2, (ly(step.layer) + ly(4)) / 2, 0] as V3 } : CAMS.default!;
  return (
    <>
      <CameraRig pos={cam.pos} target={cam.target} instant={reduced} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 9, 6]} intensity={60} color="#a5f3fc" />
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#0f1b33" sectionColor="#16325c" fadeDistance={35} infiniteGrid />
      <Stack x={SX} side="sender" active={side === 'sender' ? step.layer : undefined} tcpip={tcpip} />
      <Stack x={RX} side="receiver" active={side === 'receiver' ? step.layer : undefined} tcpip={tcpip} />
      <Cable medium={medium} live={live} bits={bits} />
      <Packet step={step} msgLen={c.hi.message.length} cipher={cipher} wireBytes={c.hi.wire.length} />
      <Handshake on={step.id === 'hi-l4-handshake'} />
      <Broadcast on={step.id === 'hi-l2-arp'} y={ly(2)} />
    </>
  );
}
