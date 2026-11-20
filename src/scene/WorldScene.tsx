import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { useCtx, useStep, useStore } from '../store';
import type { Ctx } from '../content';
import { HUBS } from '../content/network';
import { NET, oneWay, rtt, serverIp, wanIp } from '../content/journey-google';
import { haversineKm, type LatLon } from '../lib/geo';
import { Label3D, alongPolyline } from './common';
import { Earth, Backbone, R, arc, surf } from './Earth';
import { DataCenter, Dish, Isp, Laptop, Rings, Router, SatelliteModel, ScreenText, ServerPair } from './models';

type V = THREE.Vector3;
const DIO = 0.12; // diorama model units → world units ("not to scale": a laptop is ~300 km wide here)
const TIME_SCALE = 40; // real propagation ms × 40 = animation ms

/* ---------------- local frames on the sphere ---------------- */
interface Frame {
  o: V; // origin on the surface
  up: V;
  east: V;
  south: V;
}
function frameAt(p: V): Frame {
  const up = p.clone().normalize();
  const east = new THREE.Vector3(0, 1, 0).cross(up);
  if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
  east.normalize();
  const south = east.clone().cross(up).normalize();
  return { o: up.clone().multiplyScalar(R), up, east, south };
}
/** Move `km`-ish offsets (in world units) east/north from a frame and drop back onto the sphere. */
const offset = (f: Frame, e: number, n: number) => frameAt(f.o.clone().addScaledVector(f.east, e).addScaledVector(f.south, -n));
/** Local diorama coordinates → world */
const local = (f: Frame, x: number, y: number, z: number) => f.o.clone().addScaledVector(f.east, x * DIO).addScaledVector(f.up, y * DIO).addScaledVector(f.south, z * DIO);

function OnGlobe({ f, children, scale = DIO }: { f: Frame; children: ReactNode; scale?: number }) {
  const q = useMemo(() => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.east, f.up, f.south)), [f]);
  return (
    <group position={f.o} quaternion={q} scale={scale}>
      {children}
    </group>
  );
}

/** Path between two world points: straight if close, otherwise an arc over the globe (never through it). */
function hop(a: V, b: V): V[] {
  if (a.distanceTo(b) < 0.8) return [a, b];
  const n = 24;
  const la = a.length();
  const lb = b.length();
  const ua = a.clone().normalize();
  const ub = b.clone().normalize();
  const lift = Math.min(1.2, a.distanceTo(b) * 0.12);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const v = ua.clone().lerp(ub, t).normalize();
    return v.multiplyScalar(la + (lb - la) * t + Math.sin(t * Math.PI) * lift);
  });
}
const chain = (pts: V[]) => pts.slice(1).reduce<V[]>((acc, p, i) => [...acc, ...hop(pts[i]!, p).slice(1)], [pts[0]!]);

/* ---------------- layout: where everything stands ---------------- */
function useLayout(c: Ctx) {
  return useMemo(() => {
    const home = frameAt(surf(c.home));
    const isp = offset(home, 0.55, -0.1);
    const resolver = offset(home, -0.15, 0.6);
    const root = offset(home, -0.65, 1.05);
    const tld = offset(home, -0.05, 1.15);
    const ng = c.target.nsGeo;
    const authFar = !c.target.nsAnycast && !!ng && Number.isFinite(ng.lat) && haversineKm(c.home, [ng.lat, ng.lon]) > 800;
    const auth = authFar ? frameAt(surf([ng!.lat, ng!.lon])) : offset(home, 0.55, 1.05);
    const near = haversineKm(c.home, c.destPoint) < 450;
    const server = near ? offset(home, 0.75, -0.65) : frameAt(surf(c.destPoint));
    // satellite geometry
    const spaceLegs = c.route.legs.filter((l) => l.kind === 'space');
    const gatewayLL: LatLon | null = spaceLegs.length ? spaceLegs[1]!.points.at(-1)! : null;
    const mid = gatewayLL ? surf([(c.home[0] + gatewayLL[0]) / 2, (c.home[1] + gatewayLL[1]) / 2]).normalize() : null;
    const sat = mid ? (c.access === 'geo' ? surf([0, c.home[1]]).normalize().multiplyScalar(R + 3) : mid.multiplyScalar(R + 0.45)) : null;
    const gateway = gatewayLL ? frameAt(surf(gatewayLL)) : null;

    const wp = {
      keyboard: local(home, 1.2, 0.3, 0),
      laptop: local(home, 0, 1.4, -0.4),
      router: local(home, 3, 1.2, -0.3),
      isp: local(isp, 0, 2.6, 0),
      resolver: local(resolver, 0, 2.4, 0),
      root: local(root, 0, 2.4, 0),
      tld: local(tld, 0, 2.4, 0),
      auth: local(auth, 0, 2.4, 0),
      server: local(server, 0, 2.2, 1),
      backend: local(server, -1.5, 2.2, -2.5),
    };
    // full forward path for the web connection
    const core: V[] = [];
    for (const l of c.route.legs.slice(c.access === 'fiber' ? 1 : 2)) core.push(...arc(l.points, 0.035));
    const access = c.access === 'fiber' ? [wp.router, wp.isp] : [wp.router, local(home, -2.4, 2, -0.5), sat!, local(gateway!, 0, 1, 0)];
    const forward = chain([...access]).concat(core.length ? hop(access.at(-1)!, core[0]!).slice(1).concat(core.slice(1)) : []);
    forward.push(...hop(forward.at(-1)!, wp.server).slice(1));
    return { home, isp, resolver, root, tld, auth, authFar, server, near, sat, gateway, wp, forward };
  }, [c.home, c.destPoint, c.route, c.access, c.target]);
}
type Layout = ReturnType<typeof useLayout>;

/* ---------------- packet choreography ---------------- */
interface Motion {
  pts: V[];
  loop?: boolean;
  /** animation duration (ms); default: constant speed */
  dur?: number;
}
function motionFor(id: string, L: Layout, c: Ctx): Motion {
  const w = L.wp;
  switch (id) {
    case 'g-key':
      return { pts: [w.keyboard] };
    case 'g-os':
      return { pts: [w.keyboard, w.laptop] };
    case 'g-url':
    case 'g-cache':
    case 'g-render-parse':
    case 'g-render-paint':
      return { pts: [w.laptop] };
    case 'g-dns-stub':
      return { pts: chain([w.laptop, w.router, w.isp, w.resolver]) };
    case 'g-dns-recursive':
      return { pts: [w.resolver] };
    case 'g-dns-root':
      return { pts: chain([w.resolver, w.root]), loop: true };
    case 'g-dns-tld':
      return { pts: chain([w.resolver, w.tld]), loop: true };
    case 'g-dns-auth':
      return { pts: chain([w.resolver, w.auth]), loop: true, dur: L.authFar ? 3000 : undefined };
    case 'g-dns-answer':
      return { pts: chain([w.resolver, w.isp, w.router, w.laptop]) };
    case 'g-arp':
      return { pts: [w.laptop, w.router], loop: true };
    case 'g-wifi':
      return { pts: [w.laptop, w.router] };
    case 'g-nat':
      return { pts: [w.router] };
    case 'g-isp': {
      const i = L.forward.findIndex((p) => p === w.isp || (L.gateway && p.distanceTo(local(L.gateway, 0, 1, 0)) < 1e-6));
      return { pts: L.forward.slice(0, Math.max(2, i + 1)) };
    }
    case 'g-bgp':
      return { pts: [c.access === 'fiber' ? w.isp : L.forward[Math.min(L.forward.length - 1, 4)]!] };
    case 'g-core':
      return { pts: L.forward, dur: Math.max(2500, oneWay(c) * TIME_SCALE) };
    case 'g-gfe':
      return { pts: [w.server] };
    case 'g-tcp':
    case 'g-tls':
      return { pts: L.forward, loop: true, dur: Math.max(1500, (rtt(c) * TIME_SCALE) / 2) };
    case 'g-http':
      return { pts: [w.server, w.backend], loop: true };
    case 'g-back':
      return { pts: [...L.forward].reverse().concat(hop(w.router, w.laptop).slice(1)), dur: Math.max(2500, oneWay(c) * TIME_SCALE) };
    default:
      return { pts: [w.laptop] };
  }
}

function Packet({ m, reduced, follow }: { m: Motion; reduced: boolean; follow: React.MutableRefObject<V> }) {
  const ref = useRef<THREE.Group>(null);
  const len = useMemo(() => m.pts.slice(1).reduce((n, p, i) => n + p.distanceTo(m.pts[i]!), 0), [m.pts]);
  const t0 = useRef(performance.now());
  useEffect(() => {
    t0.current = performance.now();
  }, [m]);
  useFrame(() => {
    if (!ref.current) return;
    const dur = m.dur ?? Math.max(700, (len / 1.6) * 1000);
    const e = (performance.now() - t0.current) / dur;
    const t = reduced ? 1 : m.loop ? 1 - Math.abs((e % 2) - 1) : Math.min(1, e);
    alongPolyline(m.pts, t, ref.current.position);
    follow.current.copy(ref.current.position);
  });
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[0.02, 1]} />
        <meshStandardMaterial color="#fdba74" emissive="#fb923c" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <pointLight color="#fde68a" intensity={0.6} distance={0.8} />
    </group>
  );
}

/* ---------------- camera ---------------- */
interface Shot {
  pos: V;
  target: V;
}
function shotFor(focus: string, L: Layout, c: Ctx): Shot {
  const near = (f: Frame, up: number, back: number, side = 0, look = 0.12): Shot => ({
    pos: f.o.clone().addScaledVector(f.up, up).addScaledVector(f.south, back).addScaledVector(f.east, side),
    target: f.o.clone().addScaledVector(f.up, look),
  });
  switch (focus) {
    case 'keyboard':
    case 'laptop':
    case 'browser':
    case 'screen':
      return near(L.home, 0.55, 0.85, 0.15, 0.08);
    case 'router':
    case 'wifi':
      return near(offset(L.home, 0.18, 0), 0.7, 1.0, 0, 0.1);
    case 'isp':
      return c.access === 'fiber' || !L.sat ? near(offset(L.home, 0.35, 0), 1.1, 1.4) : { pos: L.sat.clone().multiplyScalar(1.25).add(L.home.south.clone().multiplyScalar(1.2)), target: L.sat.clone().lerp(L.home.o, 0.5) };
    case 'dns-resolver':
    case 'dns-root':
    case 'dns-tld':
      return near(offset(L.home, -0.2, 0.75), 1.7, 2.1, 0, 0.1);
    case 'dns-auth':
      if (L.authFar) {
        const mid = L.resolver.o.clone().add(L.auth.o).normalize();
        return { pos: mid.clone().multiplyScalar(R * 2.3), target: mid.multiplyScalar(R * 0.6) };
      }
      return near(offset(L.home, 0.1, 0.8), 1.7, 2.1, 0, 0.1);
    case 'google':
      return near(L.server, 0.8, 1.1, 0.15, 0.1);
    case 'globe':
    default: {
      const pts = L.forward;
      const avg = pts.reduce((a, p) => a.add(p.clone().normalize()), new THREE.Vector3());
      const spread = 1 - Math.min(1, avg.length() / pts.length);
      const dir = avg.lengthSq() > 1e-6 ? avg.normalize() : L.home.up.clone();
      return { pos: dir.clone().multiplyScalar(R * (2.1 + spread * 2.2)).addScaledVector(new THREE.Vector3(0, 1, 0), 1.2), target: new THREE.Vector3(0, 0, 0) };
    }
  }
}

/** Flies around the globe on a spherical path (never through it); can follow the packet. */
function WorldRig({ shot, instant, follow, following }: { shot: Shot; instant: boolean; follow: React.MutableRefObject<V>; following: boolean }) {
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  const goal = useRef({ ...shot, active: true });
  const key = shot.pos.toArray().join() + shot.target.toArray().join();
  useEffect(() => {
    goal.current = { pos: shot.pos.clone(), target: shot.target.clone(), active: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const g = goal.current;
    if (following && g.active) {
      const p = follow.current;
      g.pos = p.clone().normalize().multiplyScalar(R * 1.75).addScaledVector(new THREE.Vector3(0, 1, 0), 0.6);
      g.target = p.clone().multiplyScalar(0.7);
    }
    if (!g.active) return;
    const k = instant ? 1 : 1 - Math.exp(-dt * (following ? 3.5 : 2.4));
    // spherical interpolation of the camera position around the globe centre
    const r0 = camera.position.length();
    const r1 = g.pos.length();
    const d0 = camera.position.clone().normalize();
    const d1 = g.pos.clone().normalize();
    const dir = new THREE.Vector3().copy(d0).lerp(d1, k).normalize();
    camera.position.copy(dir.multiplyScalar(r0 + (r1 - r0) * k));
    c.target.lerp(g.target, k);
    c.update();
    if (!following && camera.position.distanceTo(g.pos) < 0.005 && c.target.distanceTo(g.target) < 0.005) g.active = false;
  });
  return (
    <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping minDistance={0.25} maxDistance={40} rotateSpeed={0.6} zoomSpeed={0.8} onStart={() => (goal.current.active = false)} />
  );
}

/** Keeps the sun behind the camera so the side you look at is lit; city lights glow on the rest. */
function Sun() {
  const l = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  useFrame(() => l.current?.position.copy(camera.position).add(new THREE.Vector3(4, 6, 2)));
  return <directionalLight ref={l} intensity={2.2} color="#fff7e6" />;
}

function Constellation({ geo, on }: { geo: boolean; on: boolean }) {
  const g = useRef<THREE.Group>(null);
  const inst = useRef<THREE.InstancedMesh>(null);
  const N = 96;
  useEffect(() => {
    const m = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const plane = i % 8;
      const k = Math.floor(i / 8);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (plane / 8) * Math.PI * 2, (53 * Math.PI) / 180));
      m.position.set(Math.cos((k / 12) * Math.PI * 2), 0, Math.sin((k / 12) * Math.PI * 2)).multiplyScalar(R + 0.45).applyQuaternion(q);
      m.updateMatrix();
      inst.current?.setMatrixAt(i, m.matrix);
    }
    if (inst.current) inst.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame((_, dt) => g.current && (g.current.rotation.y += dt * 0.03));
  if (geo) return null;
  return (
    <group ref={g} visible={on}>
      <instancedMesh ref={inst} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.03, 0.012, 0.012]} />
        <meshBasicMaterial color="#cbd5e1" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------------- scene ---------------- */
export function WorldScene({ reduced }: { reduced: boolean }) {
  const step = useStep();
  const c = useCtx();
  const playing = useStore((s) => s.playing);
  const L = useLayout(c);
  const motion = useMemo(() => motionFor(step.id, L, c), [step.id, L, c]);
  const follow = useRef(new THREE.Vector3());
  const shot = useMemo(() => shotFor(step.focus, L, c), [step.focus, L, c]);
  const travelling = step.id === 'g-core' || step.id === 'g-back';
  const f = step.focus;
  const sat = c.access !== 'fiber';
  const routeHubs = useMemo(() => new Set(c.route.legs.flatMap((l) => [l.from, l.to])), [c.route]);
  // decluttered: only the object in focus carries a label (plus the destination on the globe overview)
  const label = (t: string, sub: string | undefined, on: boolean, pos: [number, number, number] = [0, 4.2, 0]) => (on ? <Label3D position={pos} title={t} sub={sub} on size={0.3} /> : null);
  return (
    <>
      <WorldRig shot={shot} instant={reduced} follow={follow} following={playing && travelling && !reduced} />
      <ambientLight intensity={0.35} />
      <Sun />
      <Stars radius={90} depth={40} count={3500} factor={3} saturation={0} fade speed={0.3} />
      <Earth />
      <Backbone dim={f !== 'globe'} />
      <Line points={L.forward} color="#fbbf24" lineWidth={2.2} transparent opacity={f === 'globe' || f === 'isp' || f === 'google' ? 0.95 : 0.35} />

      {/* your home: laptop + router (+ dish) */}
      <OnGlobe f={L.home}>
        <Laptop stepId={step.id} />
        <ScreenText text={step.id === 'g-render-paint' ? `${c.target.domain}\nrendered` : step.id.startsWith('g-render') ? 'DOM + CSSOM\n→ render tree' : `https://${c.target.domain}/`} dark={step.id === 'g-render-paint'} />
        <group position={[3, 0.2, -0.3]}>
          <Router />
        </group>
        <group position={[1.5, 0.8, -0.3]}>
          <Rings color="#a78bfa" on={['g-arp', 'g-wifi', 'g-dns-stub'].includes(step.id)} scale={0.6} />
        </group>
        {sat && (
          <group position={[-2.4, 0, -0.5]}>
            <Dish />
          </group>
        )}
        {!['keyboard', 'laptop', 'browser', 'screen'].includes(f) && label('YOU', `${c.homeName} · ${NET.laptop} → WAN ${wanIp(c)}`, ['router', 'wifi'].includes(f), [1.2, 3.2, 0])}
      </OnGlobe>

      <OnGlobe f={L.isp}>
        <Isp on={f === 'isp'} />
        {label(c.me?.org ? c.me.org.slice(0, 26) : 'Your ISP', `${c.me?.asn ?? 'AS?'} · OLT/BNG · BGP`, f === 'isp', [0, 5, 0])}
      </OnGlobe>

      <OnGlobe f={L.resolver}>
        <ServerPair id="dns-resolver" on={f === 'dns-resolver'} />
        {label('Resolver 8.8.8.8', 'anycast · nearest site', f === 'dns-resolver')}
      </OnGlobe>
      <OnGlobe f={L.root}>
        <ServerPair id="dns-root" on={f === 'dns-root'} />
        {label('Root a.root-servers.net', '198.41.0.4 · anycast', f === 'dns-root')}
      </OnGlobe>
      <OnGlobe f={L.tld}>
        <ServerPair id="dns-tld" on={f === 'dns-tld'} />
        {label(`.${c.target.tld} ${c.target.tldNs[0] ?? 'TLD'}`.slice(0, 34), c.target.tldNsIp ?? '', f === 'dns-tld')}
      </OnGlobe>
      <OnGlobe f={L.auth}>
        <ServerPair id="dns-auth" on={f === 'dns-auth'} />
        {label((c.target.ns[0] ?? 'nameserver').slice(0, 30), `${c.target.nsIp ?? ''} · ${L.authFar ? [c.target.nsGeo?.city, c.target.nsGeo?.country].filter(Boolean).join(', ') : 'anycast/near'}`, f === 'dns-auth')}
      </OnGlobe>

      <OnGlobe f={L.server}>
        <DataCenter on={f === 'google'} />
        {label(c.target.domain, `${serverIp(c)} · ${c.destName}`, f === 'google' || f === 'globe', [0, 3.6, 0.5])}
      </OnGlobe>

      {sat && L.sat && L.gateway && (
        <>
          <group position={L.sat} scale={0.06}>
            <SatelliteModel on={f === 'isp'} />
            <Label3D position={[0, 1.4, 0]} title={c.access === 'leo' ? 'LEO satellite · 550 km' : 'GEO satellite · 35,786 km (not to scale)'} size={0.5} on={f === 'isp'} />
          </group>
          <OnGlobe f={L.gateway}>
            <Dish />
            {label('Ground station', 'gateway → internet', f === 'isp', [0, 2.4, 0])}
          </OnGlobe>
          <Constellation geo={c.access === 'geo'} on />
        </>
      )}

      {/* hub labels along the route when looking at the whole globe */}
      {f === 'globe' &&
        HUBS.filter((h) => routeHubs.has(h.name)).map((h) => <Label3D key={h.id} position={surf(h.at, 0.12).toArray()} title={h.name} sub={h.ixp.split(',')[0]} size={0.05} />)}
      {f === 'globe' && c.route.legs.filter((l) => l.kind === 'subsea').map((l, i) => {
        const p = l.points[Math.floor(l.points.length / 2)]!;
        return <Label3D key={i} position={surf(p, 0.1).toArray()} title={l.name} size={0.045} color="#38bdf8" on />;
      })}
      <Packet m={motion} reduced={reduced} follow={follow} />
    </>
  );
}
