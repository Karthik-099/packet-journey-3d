import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, Line, RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useCtx, useStep, useStore } from '../store';
import { CameraRig, Label3D, alongPolyline, tipProps, type V3 } from './common';
import fontRegular from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff?url';
import { Globe, GLOBE_R } from './Globe';
import { coreOneWay, edgePop, homeLL, NET, wanIp } from '../content/journey-google';

/* ---------- station layout ---------- */
const S: Record<string, V3> = {
  keyboard: [-15, 0.3, 3.2],
  laptop: [-15, 0.4, 2],
  router: [-9, 0.4, 2],
  isp: [-3, 0.4, 2],
  'dns-resolver': [-6, 4.2, -5],
  'dns-root': [-2, 6.5, -8],
  'dns-tld': [2.5, 6.5, -8],
  'dns-auth': [6.5, 4.8, -6],
  globe: [6, 2.6, 2],
  google: [16, 0.4, 2],
  'google-backend': [18.5, 0.4, -1],
};
S.wifi = [-12, 1.2, 2];
S.browser = S.laptop!;
S.screen = S.laptop!;

/** Packet choreography per step: stations to visit; `loop` bounces back and forth. */
const MOTION: Record<string, { via: string[]; loop?: boolean }> = {
  'g-key': { via: ['keyboard'] },
  'g-os': { via: ['keyboard', 'laptop'] },
  'g-dns-stub': { via: ['laptop', 'router', 'isp', 'dns-resolver'] },
  'g-dns-recursive': { via: ['dns-resolver'] },
  'g-dns-root': { via: ['dns-resolver', 'dns-root'], loop: true },
  'g-dns-tld': { via: ['dns-resolver', 'dns-tld'], loop: true },
  'g-dns-auth': { via: ['dns-resolver', 'dns-auth'], loop: true },
  'g-dns-answer': { via: ['dns-resolver', 'isp', 'router', 'laptop'] },
  'g-arp': { via: ['laptop', 'router'], loop: true },
  'g-wifi': { via: ['laptop', 'router'] },
  'g-nat': { via: ['router'] },
  'g-isp': { via: ['router', 'isp'] },
  'g-bgp': { via: ['isp'] },
  'g-core': { via: ['isp'] },
  'g-gfe': { via: ['globe', 'google'] },
  'g-tcp': { via: ['laptop', 'router', 'isp', 'globe', 'google'], loop: true },
  'g-tls': { via: ['laptop', 'router', 'isp', 'globe', 'google'], loop: true },
  'g-http': { via: ['google', 'google-backend'], loop: true },
  'g-back': { via: ['google', 'globe', 'isp', 'router', 'laptop'] },
};

const CAM: Record<string, { off: V3; look?: V3 }> = {
  keyboard: { off: [1.5, 3, 5] },
  laptop: { off: [2, 3.2, 7] },
  browser: { off: [0, 2.2, 5] },
  screen: { off: [0, 1.8, 4.5] },
  router: { off: [0, 3.5, 8] },
  wifi: { off: [0, 3.5, 9] },
  isp: { off: [0, 4, 9] },
  'dns-resolver': { off: [6, 3.5, 17], look: [0.2, 4.6, -6.5] },
  'dns-root': { off: [2.2, 2.5, 19], look: [0.2, 4.6, -6.5] },
  'dns-tld': { off: [-2.3, 2.5, 19], look: [0.2, 4.6, -6.5] },
  'dns-auth': { off: [-6.3, 4, 18], look: [0.2, 4.6, -6.5] },
  laptopDns: { off: [4, 4, 12] },
  globe: { off: [0, 1.6, 8.8] },
  google: { off: [-1, 5, 14], look: [18, 0.6, 0] },
};

function Label({ title, sub, on }: { title: string; sub?: string; on: boolean }) {
  return <Label3D title={title} sub={sub} on={on} size={0.26} />;
}

const glow = (c: string, i = 1) => <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} toneMapped={false} />;
const body = (c = '#1e293b') => <meshStandardMaterial color={c} roughness={0.45} metalness={0.5} />;

function Laptop({ focus, stepId }: { focus: string; stepId: string }) {
  const enter = useRef<THREE.Mesh>(null);
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (enter.current) enter.current.position.y = stepId === 'g-key' ? 0.08 - Math.max(0, Math.sin(clock.elapsedTime * 4)) * 0.05 : 0.08;
    if (screen.current) {
      const rendering = stepId.startsWith('g-render');
      screen.current.emissiveIntensity = rendering ? 1.1 : 0.35;
      screen.current.emissive.set(stepId === 'g-render-paint' ? '#e2e8f0' : rendering ? '#64748b' : '#0ea5e9');
    }
  });
  const keys = useMemo(() => {
    const k: V3[] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) k.push([-1.05 + c * 0.19, 0.07, -0.3 + r * 0.2]);
    return k;
  }, []);
  return (
    <group position={S.laptop} {...tipProps('laptop')}>
      <RoundedBox args={[2.6, 0.1, 1.7]} radius={0.04}>{body('#273449')}</RoundedBox>
      {keys.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.15, 0.04, 0.15]} />
          {body('#0f172a')}
        </mesh>
      ))}
      <mesh ref={enter} position={[1.2, 0.08, -0.1]} {...tipProps('keyboard')}>
        <boxGeometry args={[0.2, 0.05, 0.35]} />
        {glow(stepId === 'g-key' ? '#fbbf24' : '#334155', stepId === 'g-key' ? 1.5 : 0.2)}
      </mesh>
      <group position={[0, 0.85, -0.85]} rotation={[-0.2, 0, 0]} {...tipProps(focus === 'screen' ? 'screen' : 'browser')}>
        <RoundedBox args={[2.6, 1.6, 0.06]} radius={0.03}>{body('#273449')}</RoundedBox>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[2.4, 1.4]} />
          <meshStandardMaterial ref={screen} color="#020617" emissive="#0ea5e9" emissiveIntensity={0.35} />
        </mesh>
        <Text font={fontRegular} position={[0, 0, 0.05]} fontSize={0.13} maxWidth={2.2} textAlign="center" anchorX="center" anchorY="middle" color={stepId === 'g-render-paint' ? '#0f172a' : '#e0f2fe'}>
          {stepId === 'g-render-paint' ? '[ search box ]  rendered to pixels' : stepId.startsWith('g-render') ? 'bytes → DOM + CSSOM → render tree' : 'https://google.com/'}
        </Text>
      </group>
      <group position={[0, -0.2, 1.6]}>
        <Label title="Your computer" sub={`${NET.laptop} · /24`} on={['laptop', 'keyboard', 'browser', 'screen'].includes(focus)} />
      </group>
    </group>
  );
}

function Router({ on, wan }: { on: boolean; wan: string }) {
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => led.current && (led.current.emissiveIntensity = 0.5 + Math.abs(Math.sin(clock.elapsedTime * 7)) * 2));
  return (
    <group position={S.router} {...tipProps('router')}>
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
      <group position={[0, -0.4, 1.4]}>
        <Label title="Home router · NAT" sub={`LAN ${NET.router} · WAN ${wan}`} on={on} />
      </group>
    </group>
  );
}

function Isp({ on, name }: { on: boolean; name: string }) {
  return (
    <group position={S.isp} {...tipProps('isp')}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.8, 2.2, 1.4]} />
        {body('#17223b')}
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.3 + i * 0.45, 0.71]}>
          <planeGeometry args={[1.5, 0.08]} />
          {glow(on ? '#22d3ee' : '#0e7490', on ? 1.2 : 0.4)}
        </mesh>
      ))}
      <mesh position={[1.4, 1.8, -0.2]}>
        <cylinderGeometry args={[0.05, 0.12, 4, 6]} />
        {body('#334155')}
      </mesh>
      <group position={[0, -0.4, 1.4]}>
        <Label title={name} sub="OLT · BNG · core · BGP" on={on} />
      </group>
    </group>
  );
}

function Server({ id, title, sub, on }: { id: string; title: string; sub: string; on: boolean }) {
  return (
    <group position={S[id]} {...tipProps(id)}>
      {[-0.5, 0.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <RoundedBox args={[0.8, 1.8, 0.8]} radius={0.05}>{body('#18233d')}</RoundedBox>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, -0.6 + i * 0.3, 0.41]}>
              <planeGeometry args={[0.6, 0.05]} />
              {glow(on ? '#a78bfa' : '#4c1d95', on ? 1.4 : 0.4)}
            </mesh>
          ))}
        </group>
      ))}
      <group position={[0, 1.5, 0]}>
        <Label title={title} sub={sub} on={on} />
      </group>
    </group>
  );
}

function DataCenter({ on, ip, where }: { on: boolean; ip: string; where: string }) {
  const racks = useRef<THREE.InstancedMesh>(null);
  const N = 18;
  useEffect(() => {
    const m = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      m.position.set(1 + (i % 6) * 0.75, 0.9, -1 - Math.floor(i / 6) * 1.6);
      m.updateMatrix();
      racks.current?.setMatrixAt(i, m.matrix);
    }
    if (racks.current) racks.current.instanceMatrix.needsUpdate = true;
  }, []);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => ring.current && (ring.current.rotation.z += dt * (on ? 1.5 : 0.3)));
  return (
    <group position={S.google} {...tipProps('google')}>
      <mesh position={[3, -0.38, -2.5]}>
        <boxGeometry args={[8, 0.05, 6.5]} />
        {body('#0b1222')}
      </mesh>
      <instancedMesh ref={racks} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.6, 1.9, 1]} />
        <meshStandardMaterial color="#0f172a" emissive="#10b981" emissiveIntensity={on ? 0.07 : 0.03} metalness={0.7} roughness={0.35} />
      </instancedMesh>
      <group position={[-0.6, 0.6, 0.6]}>
        <RoundedBox args={[1.3, 1.6, 0.9]} radius={0.06}>{body('#1e293b')}</RoundedBox>
        <mesh ref={ring} position={[0, 0, 0.5]}>
          <torusGeometry args={[0.45, 0.04, 8, 48, Math.PI * 1.6]} />
          {glow('#34d399', on ? 2 : 0.6)}
        </mesh>
      </group>
      <group position={[1.5, 2.6, 0.5]}>
        <Label title="Google Front End · Maglev LB → backends" sub={`${ip} · ${where}`} on={on} />
      </group>
    </group>
  );
}

const LINKS: [string, string, string][] = [
  ['laptop', 'router', '#a78bfa'],
  ['router', 'isp', '#22d3ee'],
  ['isp', 'globe', '#22d3ee'],
  ['globe', 'google', '#34d399'],
  ['isp', 'dns-resolver', '#a78bfa'],
  ['dns-resolver', 'dns-root', '#a78bfa'],
  ['dns-resolver', 'dns-tld', '#a78bfa'],
  ['dns-resolver', 'dns-auth', '#a78bfa'],
];

function Links({ active }: { active: Set<string> }) {
  return (
    <>
      {LINKS.map(([a, b, c]) => {
        const on = active.has(a) && active.has(b);
        const pa = new THREE.Vector3(...S[a]!);
        const pb = new THREE.Vector3(...S[b]!);
        if (a === 'globe') pa.x += GLOBE_R;
        if (b === 'globe') pb.x -= GLOBE_R;
        const mid = pa.clone().lerp(pb, 0.5).add(new THREE.Vector3(0, 0.6, 0));
        const pts = new THREE.QuadraticBezierCurve3(pa, mid, pb).getPoints(24);
        return <Line key={a + b} points={pts} color={c} lineWidth={on ? 2.5 : 1} transparent opacity={on ? 1 : 0.25} dashed={!on} dashSize={0.3} gapSize={0.2} />;
      })}
    </>
  );
}

function Packet({ via, loop, hidden, reduced }: { via: string[]; loop?: boolean; hidden: boolean; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const pts = useMemo(() => via.map((v) => new THREE.Vector3(...S[v]!).add(new THREE.Vector3(0, 1.1, 0))), [via]);
  const len = useMemo(() => pts.slice(1).reduce((n, p, i) => n + p.distanceTo(pts[i]!), 0), [pts]);
  const t0 = useRef(performance.now());
  useEffect(() => {
    t0.current = performance.now();
  }, [pts]);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = !hidden;
    const dur = Math.max(600, (len / 9) * 1000);
    const e = (performance.now() - t0.current) / dur;
    const t = reduced ? 1 : loop ? 1 - Math.abs((e % 2) - 1) : Math.min(1, e);
    alongPolyline(pts, t, ref.current.position);
  });
  return (
    <group ref={ref} {...tipProps('packet')}>
      <mesh>
        <icosahedronGeometry args={[0.22, 1]} />
        {glow('#fde68a', 2.2)}
      </mesh>
      <pointLight color="#fde68a" intensity={4} distance={4} />
    </group>
  );
}

export function GoogleScene({ reduced }: { reduced: boolean }) {
  const step = useStep();
  const c = useCtx();
  const path = useStore((s) => s.path);
  const motion = MOTION[step.id] ?? { via: [step.focus in S ? step.focus : 'laptop'] };
  const focus = step.id.startsWith('g-dns') && step.focus === 'laptop' ? 'laptopDns' : step.focus;
  const base = S[focus === 'laptopDns' ? 'laptop' : focus] ?? S.laptop!;
  const cam = CAM[focus] ?? CAM.laptop!;
  const camPos: V3 = [base[0] + cam.off[0], base[1] + cam.off[1], base[2] + cam.off[2]];
  const look: V3 = cam.look ?? [base[0], base[1] + 0.6, base[2]];
  const active = new Set(motion.via);
  const home = homeLL(c);
  const pop = edgePop(c);
  const travel = step.id === 'g-core' ? 'out' : step.id === 'g-back' ? 'back' : undefined;
  const where = c.path === 'edge' ? `Google edge, ${pop.name}` : 'St. Ghislain, Belgium';
  return (
    <>
      <CameraRig pos={camPos} target={look} instant={reduced} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 12, 8]} intensity={1.2} color="#bae6fd" />
      <Grid position={[0, 0, 0]} args={[80, 80]} cellColor="#0f1b33" sectionColor="#16325c" fadeDistance={60} infiniteGrid />
      <Links active={active} />
      <Laptop focus={step.focus} stepId={step.id} />
      <Router on={['router', 'wifi'].includes(step.focus)} wan={wanIp(c)} />
      <Isp on={step.focus === 'isp'} name={c.me?.org ? `ISP · ${c.me.org.slice(0, 22)}` : 'Your ISP'} />
      <Server id="dns-resolver" title="Recursive resolver" sub="8.8.8.8 · anycast, nearest site" on={step.focus === 'dns-resolver'} />
      <Server id="dns-root" title="Root a.root-servers.net" sub="198.41.0.4 · anycast" on={step.focus === 'dns-root'} />
      <Server id="dns-tld" title=".com TLD a.gtld-servers.net" sub="192.5.6.30 · Verisign" on={step.focus === 'dns-tld'} />
      <Server id="dns-auth" title="ns1.google.com" sub="216.239.32.10 · authoritative" on={step.focus === 'dns-auth'} />
      <Globe position={S.globe!} path={path} travel={travel} oneWayMs={coreOneWay(c)} showLabels={step.focus === 'globe'} home={home} pop={pop.at} reduced={reduced} />
      <DataCenter on={step.focus === 'google'} ip={c.path === 'edge' ? NET.google : NET.googleEu} where={where} />
      <Packet via={motion.via} loop={motion.loop} hidden={step.id === 'g-core'} reduced={reduced} />
    </>
  );
}
