export interface Protocol {
  name: string;
  full: string;
  layer: string; // OSI layer(s)
  transport: string; // carried over / port
  what: string;
  rfc?: string;
}

/** A directory of protocols you meet in networking and DevOps work, grouped by OSI layer. */
export const PROTOCOLS: Protocol[] = [
  // L7
  { name: 'HTTP/1.1', full: 'Hypertext Transfer Protocol', layer: 'L7', transport: 'TCP 80 / 443 (TLS)', what: 'Text request/response protocol of the web; one request at a time per connection (keep-alive reuses it).', rfc: 'RFC 9110, 9112' },
  { name: 'HTTP/2', full: 'HTTP version 2', layer: 'L7', transport: 'TCP 443 (TLS, ALPN h2)', what: 'Binary framing, many parallel streams on one connection, HPACK header compression.', rfc: 'RFC 9113' },
  { name: 'HTTP/3', full: 'HTTP over QUIC', layer: 'L7', transport: 'QUIC / UDP 443', what: 'HTTP on QUIC streams: no TCP head-of-line blocking, QPACK compression, connection migration.', rfc: 'RFC 9114' },
  { name: 'HTTPS', full: 'HTTP over TLS', layer: 'L7 + L6', transport: 'TCP 443 or QUIC', what: 'HTTP inside a TLS session: confidentiality, integrity and server authentication via certificates.', rfc: 'RFC 2818, 9110' },
  { name: 'WebSocket', full: 'WebSocket', layer: 'L7', transport: 'TCP 80/443 (HTTP Upgrade)', what: 'Full-duplex message channel that starts as an HTTP request (101 Switching Protocols).', rfc: 'RFC 6455' },
  { name: 'gRPC', full: 'gRPC Remote Procedure Calls', layer: 'L7', transport: 'HTTP/2', what: 'Protobuf-encoded RPC with streaming; common between microservices.' },
  { name: 'DNS', full: 'Domain Name System', layer: 'L7', transport: 'UDP/TCP 53, DoT 853, DoH 443', what: 'Hierarchical, cached name → record lookups (A, AAAA, CNAME, MX, TXT…).', rfc: 'RFC 1034, 1035' },
  { name: 'DHCP', full: 'Dynamic Host Configuration Protocol', layer: 'L7', transport: 'UDP 67/68', what: 'DORA (Discover, Offer, Request, Ack) leases an IP, mask, gateway and DNS to a device.', rfc: 'RFC 2131' },
  { name: 'SMTP', full: 'Simple Mail Transfer Protocol', layer: 'L7', transport: 'TCP 25, 587, 465', what: 'Sends and relays email; SPF, DKIM and DMARC (DNS TXT records) fight spoofing.', rfc: 'RFC 5321' },
  { name: 'IMAP / POP3', full: 'Internet Message Access / Post Office Protocol', layer: 'L7', transport: 'TCP 143/993, 110/995', what: 'Read mail from a mailbox (IMAP keeps it on the server, POP3 downloads).', rfc: 'RFC 9051, 1939' },
  { name: 'SSH', full: 'Secure Shell', layer: 'L7', transport: 'TCP 22', what: 'Encrypted remote login, command execution, tunnels; SCP/SFTP for files. Key-based auth.', rfc: 'RFC 4251–4254' },
  { name: 'FTP / SFTP / FTPS', full: 'File Transfer Protocol variants', layer: 'L7', transport: 'TCP 21 / 22 / 990', what: 'FTP is plaintext with separate data connections; SFTP runs over SSH; FTPS is FTP + TLS.' },
  { name: 'NTP', full: 'Network Time Protocol', layer: 'L7', transport: 'UDP 123', what: 'Synchronises clocks to millisecond accuracy through a hierarchy of strata.', rfc: 'RFC 5905' },
  { name: 'SNMP', full: 'Simple Network Management Protocol', layer: 'L7', transport: 'UDP 161/162', what: 'Polls device counters (interfaces, CPU) via MIBs/OIDs; traps for events.', rfc: 'RFC 3411' },
  { name: 'LDAP', full: 'Lightweight Directory Access Protocol', layer: 'L7', transport: 'TCP 389 / 636', what: 'Queries user/group directories (Active Directory).', rfc: 'RFC 4511' },
  { name: 'Kerberos', full: 'Kerberos', layer: 'L7', transport: 'TCP/UDP 88', what: 'Ticket-based single sign-on authentication.', rfc: 'RFC 4120' },
  { name: 'RADIUS / TACACS+', full: 'AAA protocols', layer: 'L7', transport: 'UDP 1812 / TCP 49', what: 'Authentication, authorisation and accounting for Wi-Fi, VPN and device admin logins.' },
  { name: 'SIP / RTP', full: 'Session Initiation / Real-time Transport', layer: 'L7 (+L5)', transport: 'UDP/TCP 5060, RTP over UDP', what: 'VoIP: SIP sets up calls, RTP carries the audio/video.', rfc: 'RFC 3261, 3550' },
  { name: 'WebRTC', full: 'Web Real-Time Communication', layer: 'L7', transport: 'UDP (SRTP, SCTP over DTLS)', what: 'Browser peer-to-peer media/data; ICE + STUN/TURN to traverse NAT.' },
  { name: 'MQTT', full: 'Message Queuing Telemetry Transport', layer: 'L7', transport: 'TCP 1883 / 8883', what: 'Lightweight pub/sub for IoT devices via a broker.' },
  { name: 'SMB / NFS', full: 'File sharing protocols', layer: 'L7', transport: 'TCP 445 / 2049', what: 'Network file systems for Windows (SMB) and Unix (NFS).' },
  { name: 'RDP / VNC', full: 'Remote desktop', layer: 'L7', transport: 'TCP 3389 / 5900', what: 'Remote graphical desktops.' },
  { name: 'Syslog', full: 'Syslog', layer: 'L7', transport: 'UDP 514 / TCP 6514', what: 'Standard log message format and transport.', rfc: 'RFC 5424' },
  // L6
  { name: 'TLS 1.3', full: 'Transport Layer Security', layer: 'L6 (between L4 and L7)', transport: 'over TCP', what: '1-RTT handshake with (EC)DHE key exchange, certificates for identity, AEAD encryption (AES-GCM, ChaCha20-Poly1305).', rfc: 'RFC 8446' },
  { name: 'DTLS', full: 'Datagram TLS', layer: 'L6', transport: 'over UDP', what: 'TLS adapted to datagrams (WebRTC, VPNs, IoT).', rfc: 'RFC 9147' },
  // L5 / tunnels
  { name: 'NetBIOS', full: 'Network Basic I/O System', layer: 'L5', transport: 'UDP/TCP 137–139', what: 'Legacy Windows naming and session service.' },
  { name: 'RPC', full: 'Remote Procedure Call', layer: 'L5', transport: 'various', what: 'Classic session-layer example: call a function on another machine (ONC RPC, MS-RPC).' },
  // L4
  { name: 'TCP', full: 'Transmission Control Protocol', layer: 'L4', transport: 'IP protocol 6', what: 'Reliable, ordered byte stream: 3-way handshake, sequence numbers, ACKs, retransmission, flow control (window) and congestion control (CUBIC, BBR).', rfc: 'RFC 9293' },
  { name: 'UDP', full: 'User Datagram Protocol', layer: 'L4', transport: 'IP protocol 17', what: 'Connectionless datagrams with ports and a checksum. No delivery guarantee; used by DNS, VoIP, games, QUIC.', rfc: 'RFC 768' },
  { name: 'QUIC', full: 'QUIC', layer: 'L4 (+L6 TLS built in)', transport: 'over UDP', what: 'Encrypted multiplexed transport: combined transport + TLS 1.3 handshake in 1 RTT (0-RTT on resume), per-stream loss recovery.', rfc: 'RFC 9000' },
  { name: 'SCTP', full: 'Stream Control Transmission Protocol', layer: 'L4', transport: 'IP protocol 132', what: 'Message-oriented, multi-stream, multi-homed transport (telecom signalling, WebRTC data channels).', rfc: 'RFC 9260' },
  // L3
  { name: 'IPv4', full: 'Internet Protocol v4', layer: 'L3', transport: 'EtherType 0x0800', what: '32-bit addresses, best-effort packet delivery, TTL, fragmentation.', rfc: 'RFC 791' },
  { name: 'IPv6', full: 'Internet Protocol v6', layer: 'L3', transport: 'EtherType 0x86DD', what: '128-bit addresses, fixed 40-byte header with extension headers, no router fragmentation, SLAAC.', rfc: 'RFC 8200' },
  { name: 'ICMP / ICMPv6', full: 'Internet Control Message Protocol', layer: 'L3', transport: 'IP protocol 1 / 58', what: 'Errors and diagnostics: echo (ping), destination unreachable, time exceeded (traceroute), packet too big (PMTUD).', rfc: 'RFC 792, 4443' },
  { name: 'ARP', full: 'Address Resolution Protocol', layer: 'L2/L3', transport: 'EtherType 0x0806', what: 'Maps an IPv4 address to a MAC address on the local link.', rfc: 'RFC 826' },
  { name: 'NDP', full: 'Neighbor Discovery Protocol', layer: 'L3', transport: 'ICMPv6', what: 'IPv6 replacement for ARP plus router discovery and SLAAC.', rfc: 'RFC 4861' },
  { name: 'IGMP / MLD', full: 'Group management', layer: 'L3', transport: 'IP protocol 2 / ICMPv6', what: 'Hosts join multicast groups (IPTV, market data).' },
  { name: 'IPsec', full: 'IP Security', layer: 'L3', transport: 'ESP (proto 50), AH (51), IKE UDP 500/4500', what: 'Encrypts/authenticates IP packets: site-to-site VPNs, cloud VPN gateways.', rfc: 'RFC 4301' },
  { name: 'GRE', full: 'Generic Routing Encapsulation', layer: 'L3 tunnel', transport: 'IP protocol 47', what: 'Wraps any packet inside IP (simple tunnels).', rfc: 'RFC 2784' },
  { name: 'VXLAN', full: 'Virtual Extensible LAN', layer: 'L2 over L3', transport: 'UDP 4789', what: 'Carries Ethernet frames across an IP network with a 24-bit VNI (16 M segments). Used in DC fabrics and Kubernetes CNIs.', rfc: 'RFC 7348' },
  { name: 'WireGuard', full: 'WireGuard', layer: 'L3 tunnel', transport: 'UDP 51820', what: 'Minimal modern VPN using Curve25519 + ChaCha20-Poly1305.' },
  { name: 'OpenVPN', full: 'OpenVPN', layer: 'L3/L2 tunnel', transport: 'UDP 1194 / TCP', what: 'TLS-based VPN.' },
  // routing
  { name: 'BGP', full: 'Border Gateway Protocol', layer: 'L7 app carrying L3 routes', transport: 'TCP 179', what: 'Path-vector routing between autonomous systems; policy via attributes (local-pref, AS-path, MED, communities).', rfc: 'RFC 4271' },
  { name: 'OSPF', full: 'Open Shortest Path First', layer: 'L3', transport: 'IP protocol 89', what: 'Link-state IGP: every router builds the topology map and runs Dijkstra. Areas for scale.', rfc: 'RFC 2328' },
  { name: 'IS-IS', full: 'Intermediate System to Intermediate System', layer: 'L2 (runs directly on the link)', transport: 'not over IP', what: 'Link-state IGP favoured by large ISPs and backbones.', rfc: 'ISO 10589, RFC 1195' },
  { name: 'RIP', full: 'Routing Information Protocol', layer: 'L3 (app over UDP)', transport: 'UDP 520', what: 'Distance-vector, hop count ≤ 15. Legacy/teaching.', rfc: 'RFC 2453' },
  { name: 'EIGRP', full: 'Enhanced Interior Gateway Routing Protocol', layer: 'L3', transport: 'IP protocol 88', what: 'Cisco advanced distance-vector (DUAL algorithm).', rfc: 'RFC 7868' },
  { name: 'MPLS', full: 'Multiprotocol Label Switching', layer: '"L2.5"', transport: 'EtherType 0x8847', what: 'Forwards on short labels instead of IP lookups; traffic engineering, L3VPNs in ISP cores.', rfc: 'RFC 3031' },
  { name: 'VRRP / HSRP', full: 'First-hop redundancy', layer: 'L3', transport: 'IP protocol 112 / UDP 1985', what: 'Two routers share one virtual gateway IP; one takes over if the other fails.' },
  { name: 'BFD', full: 'Bidirectional Forwarding Detection', layer: 'L3', transport: 'UDP 3784', what: 'Millisecond link-failure detection for routing protocols.', rfc: 'RFC 5880' },
  // L2
  { name: 'Ethernet (802.3)', full: 'IEEE 802.3', layer: 'L2 + L1', transport: '—', what: 'Frames with MAC addresses, EtherType and CRC-32 FCS; switched full-duplex today.' },
  { name: 'Wi-Fi (802.11)', full: 'IEEE 802.11 a/b/g/n/ac/ax/be', layer: 'L2 + L1', transport: '—', what: 'Wireless LAN with CSMA/CA, ACKs, WPA2/WPA3 encryption; Wi-Fi 6/7 use OFDMA.' },
  { name: '802.1Q VLAN', full: 'Virtual LAN tagging', layer: 'L2', transport: 'EtherType 0x8100', what: '4-byte tag with a 12-bit VLAN ID splits one switch into many isolated LANs.' },
  { name: 'STP / RSTP', full: 'Spanning Tree Protocol', layer: 'L2', transport: 'BPDUs', what: 'Blocks redundant switch links to prevent broadcast loops.', rfc: 'IEEE 802.1D/w' },
  { name: 'LACP', full: 'Link Aggregation Control Protocol', layer: 'L2', transport: 'IEEE 802.3ad/802.1AX', what: 'Bundles several physical links into one logical link (more bandwidth, redundancy).' },
  { name: 'LLDP / CDP', full: 'Link Layer Discovery', layer: 'L2', transport: 'EtherType 0x88CC', what: 'Devices announce who they are to their neighbours.' },
  { name: '802.1X', full: 'Port-based network access control', layer: 'L2', transport: 'EAPoL 0x888E', what: 'Authenticates devices before a switch port or Wi-Fi lets them in (with RADIUS).' },
  { name: 'PPPoE', full: 'PPP over Ethernet', layer: 'L2', transport: 'EtherType 0x8863/0x8864', what: 'ISP subscriber sessions over DSL/fiber; adds 8 bytes, so MTU 1492.', rfc: 'RFC 2516' },
  // L1
  { name: 'GPON / XGS-PON', full: 'Passive Optical Networks', layer: 'L1/L2', transport: '—', what: 'Fiber-to-the-home: one OLT port shared by up to 64–128 homes via passive splitters.' },
  { name: 'DOCSIS', full: 'Data Over Cable Service Interface Spec', layer: 'L1/L2', transport: '—', what: 'Internet over cable-TV coax (CMTS ↔ cable modem).' },
  { name: '4G LTE / 5G NR', full: 'Cellular radio', layer: 'L1/L2 (+core)', transport: '—', what: 'Mobile access; the packet core (EPC/5GC) tunnels your IP traffic with GTP-U (UDP 2152).' },
  { name: 'DWDM', full: 'Dense Wavelength Division Multiplexing', layer: 'L1', transport: '—', what: 'Many laser colours on one fiber, each 100–800 Gbps: how backbones and subsea cables reach Tbps.' },
];
