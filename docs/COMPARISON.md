# How Packet Journey compares

Research done before building (November 2026). The goal: find anything that already shows a real request's path through the OSI layers *and* across the real internet, live, in a browser.

## What exists

| Tool / project | What it is | What it doesn't do |
|---|---|---|
| **Cisco Packet Tracer** | Network simulator for CCNA labs: you build a topology and watch PDUs move between simulated devices. | Simulated topologies only; no real internet, real DNS, geography or live measurements. Desktop install. |
| **Wireshark** | The standard packet analyser. | Shows bytes of a capture, not where they travelled or why; steep learning curve. |
| **Cloudflare Learning Center** | Clear articles on DNS, TLS, DDoS, BGP. | Static text and diagrams; no interaction or live data. |
| **TeleGeography Submarine Cable Map** | Authoritative map of submarine cables. | Shows cables, not how a particular request uses them. |
| **"What happens when…"** (GitHub, alex/what-happens-when) | The well-known text answer to the interview question. | One fixed example (google.com), text only. |
| **OSI Unpacked**, **OSI Model Visualization**, **Roboticela OSI simulator**, **Protocols Visualizer** | 2D, step-by-step OSI/encapsulation visualisers. | No real network data; 2D; one layer model at a time. |
| **dabao** (stevekerrison) | Packet-tracing visualisation with levels of detail. | Simulated network, not the live internet. |
| **Galaxy Tracer** (arXiv 2603.16018, 2026) | 3D topology-first interface for exploring PCAP files. | Capture analysis only; no OSI teaching or live routing. |
| **Open Visual Traceroute**, **SoftPerfect World Route**, **tracemap** | Visual traceroute on a globe or map, ASN/GeoIP lookups. | Desktop/terminal tools; no teaching layer, no packets, no DNS story. |
| **RIPE Atlas Khipu**, **PATHly** | Research visualisations of traceroute data. | Specialist tools for measurement data, not learning. |
| **Globalping** | Community network with a free measurement API (ping, traceroute, MTR, DNS, HTTP). | An API and CLI, not an explainer. Packet Journey uses it for its "measured, not modelled" view. |

## What Packet Journey adds

No single tool found combines:

1. **Any domain, live**: DNS-over-HTTPS resolution, nameservers, TLD servers, geo-IP of server and nameserver.
2. **Your real starting point**: browser GPS (with permission) or IP-based location.
3. **Every OSI layer with real bytes**: checksums, CRC-32, RFC header diagrams, a Wireshark-style inspector.
4. **The physical internet**: a 3D Earth with real submarine-cable corridors, IXPs, satellites (LEO/GEO), routed with Dijkstra and timed at the speed of light in glass.
5. **Model vs reality**: a real MTR from a probe in your country, plus RIPEstat (prefix, origin AS, RPKI) and PeeringDB data, shown next to the model.
6. **What-if incidents**: cut a submarine cable, add packet loss (HTTP/2 vs HTTP/3), stage a BGP hijack with and without RPKI.
7. **Bring your own capture**: a pcap/pcapng lab that runs entirely in the browser.
8. **A full reference**: OSI, routing, DNS, TCP/QUIC, TLS, HTTP status codes, 110 ports, 60+ protocols, 25 in-depth guides, cables and satellites, how large networks operate.

## Sources

- Galaxy Tracer: https://arxiv.org/abs/2603.16018
- OSI Unpacked: https://awesome.ecosyste.ms/projects/github.com%2Flem0n4id%2Fosi-unpacked
- OSI Model Visualization: https://awesome.ecosyste.ms/projects/github.com%2Fakurtz87%2Fosi-model-visualization
- Protocols Visualizer: https://dev.to/r9n/protocols-visualizer-an-interactive-way-to-learn-network-protocols-4nep
- Roboticela OSI simulator: https://dev.to/roboticela/osi-model-simulator-the-interactive-tool-youve-been-waiting-for-3h1a
- dabao: https://github.com/stevekerrison/dabao
- Open Visual Traceroute: https://betanews.com/2016/07/02/track-your-web-traffic-around-the-world-with-open-visual-traceroute
- SoftPerfect World Route: https://betanews.com/2016/10/11/softperfects-world-route-is-a-simple-visual-traceroute
- tracemap: https://pypi.org/project/tracemap/
- RIPE Atlas Khipu: https://atlas.ripe.net/docs/tools-and-code/khipu/
- Globalping API: https://blog.globalping.io/run-traceroute-with-http-using-globalping-api/ and https://api.globalping.io/v1/spec.yaml
