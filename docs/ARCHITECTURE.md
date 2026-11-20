# Architecture & code walkthrough

This document explains every part of the code: what it does, how the pieces connect, and why each design choice was made.

---

## 1. Design rules

1. **Content is data.** Every step is a typed object in `src/content/`: text, packet inspectors, latency, "who & where" tables and RFC sources. Fixing or adding a step never touches 3D code.
2. **Packets are real.** Headers, checksums, CRC-32, DNS messages, TCP options and pcap files are built and parsed byte by byte in `src/lib/`, with unit tests against known vectors.
3. **Rendering only reads state.** React components and three.js scenes read one Zustand store plus a derived context (`Ctx`). The UI never computes networking facts itself.
4. **Outside calls are optional and visible.** Every request to a third party lives in `lib/lookup.ts` or `lib/measure.ts`, is validated at that trust boundary, and can be switched off with **Live data**.

```
 browser APIs (Geolocation)        public APIs (DoH, geo-IP, Globalping, RIPEstat, PeeringDB)
            │                                   │
            ▼                                   ▼
   src/store.ts  ◀── src/lib (pure, tested) ──▶ src/content (typed steps, graph, reference)
            │  buildCtx(): toggles + live data → Ctx
   ┌────────┼──────────────────────┬──────────────────────┐
   ▼        ▼                      ▼                      ▼
 components   scene (R3F, lazy)    learn/ + landing/      lab/ (pcap)
```

---

## 2. Pages

| Page | Entry | Purpose |
|---|---|---|
| `index.html` | `src/landing/main.tsx` | Landing: 3D hero globe (`HeroGlobe`, lazy), domain box, how-it-works, features, comparison. |
| `app.html` | `src/main.tsx` → `App.tsx` | The 3D journey (website visit, message through the layers). |
| `learn.html` | `src/learn/main.tsx` | Reference with interactive labs. |
| `lab.html` | `src/lab/main.tsx` | Packet Lab (pcap/pcapng). |

`vite.config.ts` builds all four and reads `BASE_PATH` (GitHub Pages sub-path vs `/` in the container). `VITE_SITE_URL` makes social preview URLs absolute. The landing page passes a domain as `app.html?d=example.com`.

---

## 3. `src/lib`: the engine (no React)

| File | What it does |
|---|---|
| `bytes.ts` | UTF-8, hex/binary, integer and address helpers. |
| `packets.ts` | `inetChecksum` (RFC 1071), `crc32` (802.3), `buildTcp` (pseudo-header checksum, options), `buildIpv4`, `withTtl` (what a router does), `buildEthernet` (64-byte minimum + FCS), `buildUdp`, `buildDnsQuery/AResponse`, `fakeTlsRecord` (exact layout, stand-in cipher). |
| `inspect.ts` | Bytes → Wireshark-style trees; each field carries a byte range for hex highlighting. |
| `hi.ts` | Journey 1 packet set and receiver checks recomputed from the bytes. |
| `cidr.ts` | Subnet maths, address classification, the "same subnet?" decision. |
| `geo.ts` | Great-circle distance, fiber latency (~204,000 km/s), lat/lon → sphere (matches texture UVs). |
| `routing.ts` | Hub graph shortest path (Dijkstra by fiber-km), optional **cut links**, satellite legs (slant range), full `Route` with legs, polyline and one-way time; `unreachable` when cuts leave no path. |
| `lookup.ts` | `normalizeDomain` (URL/IDN → punycode, validated), DoH queries, zone NS discovery, TLD NS, geo-IP with fallback, CDN detection by operator or CNAME. |
| `measure.ts` | Globalping MTR (create + polite polling, rate-limit message), hop geolocation, RIPEstat prefix/origin/RPKI, PeeringDB presence. |
| `pcap.ts` | pcap (µs/ns, both endiannesses) and pcapng readers; dissector (Ethernet, VLAN, SLL/SLL2, raw IP, ARP, IPv4/6, ICMP/v6, TCP, UDP, DNS, HTTP, TLS records); statistics (protocols, conversations, DNS names, handshake RTT, retransmissions); pcap writer. |
| `sample-capture.ts` | A realistic ARP → DNS → ping → TCP → HTTP → close capture built with `packets.ts`. |
| `sim.ts` | Seeded PRNG, head-of-line blocking (TCP vs QUIC), congestion-window trace. |

Tests (`*.test.ts`) cover known vectors (CRC-32 of "123456789", textbook IP checksum), padding rules, DNS round trips, routing realism (Bengaluru → New York ≈ 90–130 ms one way, GEO > 240 ms), cable cuts, pcap/pcapng round trips, measurement parsing with mocked APIs, and simulation invariants (QUIC never later than TCP).

---

## 4. `src/content`

| File | Contents |
|---|---|
| `types.ts` | `Step`, `Journey`, `Ctx`, `Host`, `Widget`, `Concept`. `Dyn<T>` = value or function of `Ctx`. |
| `ctx.ts` | `buildCtx`: packets for the typed message; home = GPS ▸ IP geo ▸ example; destination = CDN edge or geo-IP; route (+ baseline when cables are cut). |
| `journey-google.ts` | 23 steps; latency model; traceroute; NAT table; who-&-where builders. |
| `journey-hi.ts` | 16 steps down and up the OSI stack. |
| `network.ts` | Hubs (landing cities, IXPs) and links (named submarine cables with waypoints, terrestrial fiber). |
| `refs.ts` | RFC / spec links per step (tested: ids exist, https only). |
| `concepts.ts` | Glossary and 3D tooltips. |
| `reference/*` | Ports, HTTP status codes, protocols, protocol deep dives, OSI/DNS/ICMP/TCP tables, satellites, tools. |

---

## 5. State and hooks

- **`store.ts`** (Zustand): journey/step, playback, mode, toggles (message, TLS, medium, access, destination, QUIC), view, live data (`me`, `gps`, `target`, `measured`, `bgp`), incident `cut` list, and actions: `trace` (asks about location once, then looks up), `chooseLocation` (browser Geolocation API → `gps`), `lookup`, `detectMe`, `measure`, `fetchBgp`, `setOffline`.
- **`hooks.ts`**: video-mode playback (waits for reading time, animation and narration), deep links, keyboard shortcuts, reduced motion.

---

## 6. UI (`src/components`)

`TargetBar` (domain box, Live data, your location) · `LocationPrompt` (explains GPS before the browser asks) · `Onboarding` · `LatencyBar` · `MessageInput` · `StepList` · `Controls` (play, speed, narration, share, help) · `SidePanel` (what's happening, widget, who & where, under the hood, inspector, sources) · `PacketInspector` · `HeaderDiagram` (RFC-style rows read bit by bit) · `widgets.tsx` (UTF-8, handshake, subnet, ARP, waveform, checks, DNS ladder, NAT, traceroute, route legs, BGP, TLS, HTTP, render, summary) · `Measured` (real MTR + live BGP) · `Incident` (cable cuts) · `TripSummary` · `WorldMap` · `Concepts` · `Help`.

---

## 7. 3D (`src/scene`, lazy-loaded)

| File | What it draws |
|---|---|
| `Scene.tsx` | Canvas; picks `HiScene` or `WorldScene` inside the R3F tree; bloom dropped by `PerformanceMonitor`; paused while hidden. |
| `Earth.tsx` | NASA day map, city-lights emissive map, ocean specular, Fresnel atmosphere; backbone in merged line geometry, cut cables in red; `arc()` great-circle interpolation. |
| `WorldScene.tsx` | Everything placed where it physically is (`OnGlobe` stands models on a local east/up/south frame); `motionFor()` packet choreography at real propagation time × 40; measured MTR path in green; `WorldRig` spherical camera (never through the planet) that follows the packet in video mode; labels only on the focused object. |
| `models.tsx` | Laptop, router, ISP, server pair, data center (instanced racks), dish, satellite, radio rings. |
| `HiScene.tsx` | Two 7-layer stacks, cable with bit pulses, packet with growing/shrinking header shells, handshake and ARP animations. |
| `common.tsx` | Camera rig, `Label3D` (SDF text, bundled font), `glyphSafe` (keeps text inside the bundled font so troika never fetches CDN fallback fonts). |
| `Scene2D.tsx` | CSS/SVG fallback for phones and browsers without WebGL. |

---

## 8. Learn, Landing and Lab

Plain React + Tailwind, light theme. Interactive parts reuse `src/lib`: live encapsulation, CIDR calculator, searchable port/status/protocol tables, protocol deep dives, the loss lab, the congestion-window chart and the BGP hijack demo (`learn/labs.tsx`), the quiz, and reading progress in `localStorage`. The Lab page uses `pcap.ts` and the same `PacketInspector` as the journey.

---

## 9. Testing

- **Unit (Vitest)**: `npm test`, 51 tests in `src/**/*.test.ts`.
- **End-to-end (Playwright)**: `npm run e2e`. Walks every step of both journeys, the incident simulator, the Packet Lab sample and Learn filtering. **axe-core** checks the landing, Learn and Lab pages for serious accessibility violations. External APIs are blocked in tests so they're deterministic.

---

## 10. Delivery

- **CI** (`.github/workflows/ci.yml`): verify (lint, typecheck, unit, build) → e2e + accessibility → infra (helm lint, terraform fmt/validate, policy syntax) → image (build, provenance, SPDX SBOM, cosign keyless sign + SBOM attestation) → Trivy → bump `values.yaml` for Argo CD.
- **Pages** (`pages.yml`): static build to GitHub Pages.
- **Container**: non-root nginx, strict CSP (only the APIs listed above), `Permissions-Policy: geolocation=(self)`, `/healthz`, internal `stub_status`.
- **Kubernetes** (for hosting the site): Helm chart with exporter sidecar, HPA, PDB, optional ServiceMonitor; Kyverno policies; Terraform for AKS + Argo CD; Grafana dashboard.

---

## 11. How to…

- **Fix text or add a step**: `src/content/journey-*.ts` (+ `refs.ts` for sources). New panel widget → `components/widgets.tsx`; packet movement → `motionFor()` in `WorldScene.tsx`.
- **Add a cable**: append a `Link` with waypoints in `content/network.ts`; routing, globe, map and incident simulator pick it up.
- **Add a port / status code / protocol / guide**: `content/reference/*.ts`.
- **Tune latency**: `journey-google.ts` (`WIFI`, `ACCESS_FIXED`, `SERVER_MS`) and `lib/routing.ts` (`LAND_FACTOR`, satellite overheads).
