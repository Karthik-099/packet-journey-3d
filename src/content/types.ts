import type { HiPackets } from '../lib/hi';
import type { Inspection } from '../lib/inspect';
import type { Geo, Target } from '../lib/lookup';
import type { Access, Route } from '../lib/routing';
import type { LatLon } from '../lib/geo';

export type JourneyId = 'hi' | 'google';
export type Pdu = 'Data' | 'Segment' | 'Packet' | 'Frame' | 'Bits';
export type Medium = 'copper' | 'fiber' | 'wifi';
/** For CDN/anycast targets: the nearby edge (realistic) or the geo-IP registered location */
export type Dest = 'edge' | 'origin';
export type { Access };
export type OsiLayer = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Everything a step's text/inspector may depend on (user toggles + live packets). */
export interface Ctx {
  message: string;
  tls: boolean;
  medium: Medium;
  access: Access;
  dest: Dest;
  quic: boolean;
  hi: HiPackets;
  /** Visitor's detected public IP/location/ISP, or null (examples used) */
  me: Geo | null;
  gps?: { lat: number; lon: number; acc: number } | null;
  /** The domain being visited, with live DNS + geo data */
  target: Target;
  home: LatLon;
  homeName: string;
  destPoint: LatLon;
  destName: string;
  route: Route;
}

export type Dyn<T> = T | ((c: Ctx) => T);
export const resolve = <T,>(v: Dyn<T>, c: Ctx): T => (typeof v === 'function' ? (v as (c: Ctx) => T)(c) : v);

/** Optional rich widget rendered in the side panel for a step. */
export type Widget =
  | 'utf8'
  | 'subnet'
  | 'session'
  | 'handshake'
  | 'arp'
  | 'waveform'
  | 'checks'
  | 'result'
  | 'keyboard'
  | 'url'
  | 'dns'
  | 'nat'
  | 'traceroute'
  | 'route'
  | 'bgp'
  | 'fields'
  | 'summary'
  | 'tls'
  | 'http'
  | 'render';

export interface Check {
  label: string;
  ok: boolean;
  detail?: string;
}

/** A machine involved in a step: who it is and where it physically is. */
export interface Host {
  name: string;
  ip: string;
  role: string;
  location: string;
  /** e.g. anycast, private address, example address */
  note?: string;
}

export interface Step {
  /** Deep-link id: #hi-l4 */
  id: string;
  /** Step list / timeline label */
  short: string;
  title: string;
  layer?: OsiLayer;
  side?: 'sender' | 'receiver' | 'wire';
  pdu?: Pdu;
  /** Key of the 3D object the camera/highlight targets */
  focus: string;
  /** Plain-English explanation (Beginner) */
  what: Dyn<string>;
  /** Expert detail, one paragraph per entry */
  under: Dyn<string[]>;
  /** If set, a "simplified" tag is shown with this note */
  simplified?: string;
  widget?: Widget;
  checks?: (c: Ctx) => Check[];
  inspect?: (c: Ctx) => Inspection;
  /** "Who & where" table: which servers take part and where they are */
  hosts?: Dyn<Host[]>;
  /** Contribution to the running latency budget, in ms */
  latencyMs?: (c: Ctx) => number;
  /** Minimum time on screen while playing (e.g. to let an animation finish) */
  minPlayMs?: (c: Ctx) => number;
}

export interface Journey {
  id: JourneyId;
  title: Dyn<string>;
  subtitle: Dyn<string>;
  steps: Step[];
}

/** Concept explainer shown in the Concepts drawer (and linked from steps). */
export interface Concept {
  id: string;
  term: string;
  aka?: string;
  short: string;
  body: string[];
  example?: string;
}

/** Static tooltips for clickable 3D objects, keyed by object id. */
export type Glossary = Record<string, { title: string; body: string }>;
