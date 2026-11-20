# Architecture & code walkthrough

This document explains **every part of the code**: what it does, how the pieces talk to each other, and why each design choice was made. Read it top to bottom once and you can change any part of the project with confidence.

---

## 1. The big idea

Three rules shape the whole codebase:

1. **Content is data.** Every step of every journey is a typed object in `src/content/`. Text, packet inspectors, latency numbers and "who & where" tables live there. Adding or fixing a step never touches 3D code.
2. **Packets are real.** Headers, checksums, CRC-32, DNS messages and TCP options are built byte-by-byte in `src/lib/` and verified by unit tests. The inspector, the header diagrams and the receiver "checks" all read those real bytes.
3. **Rendering only reads state.** React components and the Three.js scenes read from one Zustand store plus a derived context (`Ctx`). Nothing in the UI computes networking facts itself.

```
            ┌────────────────────── src/lib (pure functions, unit-tested) ──────────────────────┐
            │ bytes.ts  packets.ts  inspect.ts  hi.ts  cidr.ts  geo.ts  routing.ts  lookup.ts    │
            └───────────────▲───────────────────────────────▲───────────────────────────────────┘
                            │                               │
   src/content (typed data: steps, network graph, glossary, reference tables)
                            │  buildCtx(): toggles + live data → Ctx
                            ▼
                  src/store.ts (Zustand: step, toggles, live lookups)
                 ┌──────────┴───────────┬──────────────────────────┐
                 ▼                      ▼                          ▼
        src/components (panel,   src/scene (R3F 3D world,   src/landing, src/learn
        inspector, widgets)      lazy-loaded) / Scene2D     (marketing + reference pages)
```

---

## 2. Pages (Vite multi-page build)

| File | Entry | What it is |
|---|---|---|
| `index.html` | `src/landing/main.tsx` | Landing page: hero, domain box, feature cards, comparison table. |
| `app.html` | `src/main.tsx` → `src/App.tsx` | The interactive 3D journey. |
| `learn.html` | `src/learn/main.tsx` | The learning reference (OSI, routing, DNS, TLS, HTTP, ports, protocols, cables, cloud…). |

`vite.config.ts` lists the three inputs and reads `BASE_PATH` so the same build works on GitHub Pages (`/packet-journey-3d/`) and in the nginx container (`/`). The landing page hands a domain to the app as `app.html?d=example.com#g-key`.

---

## 3. `src/lib`: the networking engine (no React, no Three.js)

| File | Responsibility | Key functions |
|---|---|---|
| `bytes.ts` | Byte helpers | `utf8`, `toHex`, `toBin`, `concat`, `u16/u32`, `ipBytes`, `macStr`, `charBreakdown` |
| `packets.ts` | Real packet builders | `inetChecksum` (RFC 1071), `crc32` (IEEE 802.3), `buildTcp` (with pseudo-header checksum), `buildIpv4`, `withTtl` (what a router does), `buildEthernet` (padding to 64 B + FCS), `buildUdp`, `buildDnsQuery`, `buildDnsAResponse`, `fakeTlsRecord` |
| `inspect.ts` | Turns bytes into a Wireshark-style tree | `ethFields`, `ipFields`, `tcpFields`, `udpFields`, `dnsFields`, `payloadField`. Every field carries a `[start, end)` byte range so the hex view can highlight it. |
| `hi.ts` | Journey 1 packet set | `buildHi(message, tls)` builds message → TLS record → TCP segment → IPv4 packet → Ethernet frame → bits, plus the SYN/SYN-ACK/ACK handshake. `receiverChecks` re-verifies FCS, IP checksum and TCP checksum on the real bytes. |
| `cidr.ts` | Subnet math | `cidrInfo` (network, mask, broadcast, host range, /31 and /32 rules), `classify` (RFC 1918, CGNAT, documentation…), `sameSubnet` (the host's "local or via gateway?" decision). |
| `geo.ts` | Earth geometry | `haversineKm`, `pathKm`, `fiberMs` (light in glass ≈ 204,000 km/s), `toXYZ` (lat/lon → sphere, matches the texture UVs). |
| `routing.ts` | Shortest path over the backbone graph | `nearestHub`, `hubPath` (Dijkstra by fiber-km), `buildRoute(home, dest, access)`, which returns legs (access / land / subsea / space), the polyline and the one-way latency. `slantKm` computes satellite slant range. |
| `lookup.ts` | Live data from the internet | `normalizeDomain` (URL → punycode hostname, validated), `doh` (dns.google JSON API), `resolveTarget` (A, AAAA, CNAME chain, zone NS found by walking up labels, TLD NS, NS/TLD IPs, geo-IP), `geoIp` (ipwho.is → ipapi.co fallback), `cdnOf` (edge detection by operator or CDN CNAME). All responses are validated at this trust boundary. |

**Why so careful?** If the teaching is wrong, the project is worthless. Each file has tests (`*.test.ts`) with known vectors: CRC-32 of `"123456789"` = `0xCBF43926`, the textbook IPv4 checksum example, `"hi"` → 64-byte frame with 4 bytes of padding, Bengaluru → New York ≈ 90–130 ms one way, GEO satellite > 240 ms, and more.

---

## 4. `src/content`: what the user reads

| File | What's in it |
|---|---|
| `types.ts` | The schema: `Step`, `Journey`, `Ctx`, `Host`, `Widget`, `Concept`. `Dyn<T>` = a value or a function of `Ctx`, so text can depend on toggles and live data. |
| `ctx.ts` | `buildCtx(input)` derives everything content needs: packets for the typed message, your home location, the destination (edge vs geo-IP), and the full route. |
| `journey-hi.ts` | 16 steps of a message going down the sender's stack and up the receiver's. |
| `journey-google.ts` | 23 steps of visiting any website. Contains the latency model (`accessOneWay`, `coreOneWay`, `rtt`), `traceroute()`, `natTable()`, and "who & where" builders. |
| `network.ts` | 29 hubs (landing cities and IXPs) and ~40 links (named submarine cables with waypoints, terrestrial fiber). |
| `concepts.ts` | Glossary entries plus tooltips for clickable 3D objects. |
| `reference/*.ts` | Ports, HTTP status codes (all IANA codes plus nginx/Cloudflare ones), protocol directory, OSI table, DNS records/RCODEs, ICMP types, TCP flags/states, subnet cheat sheet, satellite orbits, troubleshooting commands. |

`content.test.ts` renders **every step under every toggle combination** (TLS, fiber/LEO/GEO, HTTP/2/3, nearby/far target, with/without detected location) and fails on `undefined`, `NaN` or a failing receiver check.

---

## 5. State: `src/store.ts` and `src/hooks.ts`

- **Zustand store**: current journey and step, playback (playing, speed, narration), detail mode, toggles (message, TLS, medium, access, destination, QUIC), 3D/2.5D view, live data (`me`, `target`) with status/error, and the actions `lookup(domain)` and `detectMe()`. Lookups are abortable: typing a new domain cancels the previous request.
- **`useCtx()`** memoises `buildCtx` from the store, so 3D, panels and widgets all agree.
- **Hooks**: `usePlayback` (video mode: waits for reading time, animation time `minPlayMs` and, with narration on, for `speechSynthesis` to finish), `useDeepLink` (`#g-dns-root` ⇄ store), `useShortcuts` (← → Space Home End E J ? Esc), `useReducedMotion`.

---

## 6. UI components (`src/components`)

| Component | Role |
|---|---|
| `TargetBar` | "Type any domain" box, live/built-in status, your IP/ISP line. Reads `?d=` on load. |
| `LatencyBar` | Stacked bar of every step's milliseconds; fiber / LEO / GEO switch, edge vs geo-IP switch, HTTP/3 switch. |
| `MessageInput` | Journey 1 message box, TLS and TCP/IP-model switches, live hex. |
| `StepList`, `Controls`, `Help` | Navigation, timeline, speed, narration, share link, shortcut help. |
| `SidePanel` | "What's happening", widget, "Who & where", "Under the hood", packet inspector. Beginner/Expert decides what's expanded. |
| `PacketInspector` | Header tree + hex/binary dump; clicking a field highlights its byte range. |
| `HeaderDiagram` | RFC-style 32-bit-row diagrams of TCP/IPv4/Ethernet headers, values read bit-by-bit from the real bytes. |
| `widgets.tsx` | One widget per step type: UTF-8 table, handshake ladder, subnet AND, ARP, waveform (Manchester / on-off / BPSK), receiver checks, DNS ladder (live), NAT table, traceroute + world map (timed by real propagation), route legs, BGP longest-prefix match, TLS flight, HTTP, render pipeline, trip summary. |
| `WorldMap` | Flat SVG map with the backbone graph and your route (used in the panel and the 2.5D view). |
| `TripSummary` | "Your request travelled X km there and X km back", RTT, routers, cables, total load time; plus a compact HUD over the 3D view. |
| `Concepts` | Slide-over glossary with a CIDR calculator. |

---

## 7. The 3D world (`src/scene`, lazy-loaded)

Built with **React Three Fiber** (React renderer for Three.js) and **drei** helpers. The whole folder is loaded only when 3D is shown, so phones and the 2.5D view never download Three.js.

| File | What it draws |
|---|---|
| `Scene.tsx` | The `<Canvas>`: picks `HiScene` or `WorldScene` inside the R3F tree, adds bloom/vignette (dropped automatically by `PerformanceMonitor` on slow GPUs), and pauses rendering (`frameloop="never"`) while hidden. |
| `Earth.tsx` | Textured Earth: NASA Blue Marble (day), Black Marble (city lights as an emissive map), ocean specular mask, and a Fresnel-shader atmosphere. The backbone is merged into two `lineSegments` draw calls. `arc()` interpolates along great circles so lines hug the sphere. |
| `WorldScene.tsx` | Places everything **where it physically is**: your home (laptop, router, Wi-Fi rings, dish), your ISP, the DNS cluster (anycast near you; a non-anycast authoritative server goes to its real geo-IP location), the destination data center, satellites and ground stations. `OnGlobe` stands each model upright on the surface using a local east/up/south frame. `motionFor()` choreographs the packet per step; travel steps run at **real propagation time × 40**. `WorldRig` flies the camera along a spherical path (never through the planet) and follows the packet in video mode. |
| `models.tsx` | Low-poly models: laptop, router, ISP building, server pair, data center (instanced racks), dish, satellite, radio rings. |
| `HiScene.tsx` | Journey 1: two 7-layer stacks, a cable with bit pulses, a packet whose header shells grow and shrink, handshake envelopes and ARP broadcast rings. |
| `Scene2D.tsx` | The 2.5D fallback in CSS/SVG. |
| `common.tsx` | Camera rig for Journey 1, `Label3D` (troika SDF text with a locally bundled font, so there are no DOM labels and no CDN fetch), clickable-object helpers, polyline sampling. |

**Performance notes:** instanced meshes for keys, racks and satellites; merged line geometry; adaptive DPR; bloom off when frames drop; nothing renders while the 3D view is hidden.

---

## 8. Landing and Learn pages (`src/landing`, `src/learn`, `src/site`)

Plain React + Tailwind, no 3D. `site/Nav.tsx` holds the shared nav and footer; `site/Like.tsx` is the thumbs-up button. `learn/` is split into four section files. Interactive parts (live encapsulation table, CIDR calculator, searchable port/status/protocol tables, quiz) reuse the same `src/lib` code as the 3D journey, so the reference and the visualisation can never disagree. Reading progress is kept in `localStorage`.

---

## 9. Like counter (`likes-worker/`)

A Cloudflare Worker with one **Durable Object**, so increments are atomic and strongly consistent (everyone sees the same number immediately). `GET /likes` returns `{count, liked}`; `POST /likes/up` adds one like per visitor. Visitors are de-duplicated by a salted SHA-256 of their IP; raw IPs are never stored. The site reads the URL from `VITE_LIKES_API` at build time.

---

## 10. Delivery: CI/CD and runtime

- **`.github/workflows/ci.yml`**: lint → typecheck → Vitest → build → Docker build & push to GHCR (tag = git SHA) → Trivy scan (SARIF to the Security tab; fails on fixable CRITICAL) → commits the new tag to `deploy/helm/.../values.yaml` for Argo CD.
- **`.github/workflows/pages.yml`**: builds with the right base path and deploys to GitHub Pages.
- **`Dockerfile`**: multi-stage `node:22-alpine` → `nginx:1.27-alpine` running as non-root on :8080; `nginx/` adds gzip, cache headers and security headers (CSP allowing only the APIs listed above).
- **Helm** (`deploy/helm/packet-journey`): Deployment (read-only root FS, dropped capabilities, seccomp, probes on `/healthz`), Service, Ingress, HPA. **Argo CD** (`deploy/argocd/application.yaml`) syncs it to AKS.

---

## 11. How to…

- **Fix a sentence or add a step**: edit `src/content/journey-*.ts`. If the step needs a new panel widget, add a case in `components/widgets.tsx`; for packet movement in 3D, add a case in `motionFor()`.
- **Add a cable**: append a `Link` with waypoints in `src/content/network.ts`. Routing, the globe and the flat map pick it up automatically.
- **Add a port / status code / protocol**: edit `src/content/reference/*.ts`.
- **Change the latency model**: `journey-google.ts` (`WIFI`, `ACCESS_FIXED`, `SERVER_MS`) and `lib/routing.ts` (`LAND_FACTOR`, satellite overheads).
