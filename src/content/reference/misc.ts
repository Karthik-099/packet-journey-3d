export const OSI_TABLE = [
  { n: 7, name: 'Application', pdu: 'Data', job: 'Network services for apps: requests, responses, names.', protocols: 'HTTP, DNS, SMTP, SSH, FTP, DHCP, SNMP', devices: 'Hosts, L7 load balancers, API gateways, WAFs', address: 'URLs, hostnames' },
  { n: 6, name: 'Presentation', pdu: 'Data', job: 'Formats: encoding, compression, encryption.', protocols: 'UTF-8, JSON, Protobuf, gzip/br, TLS (partly)', devices: 'Hosts', address: '—' },
  { n: 5, name: 'Session', pdu: 'Data', job: 'Open, keep and close dialogues; checkpoints, resumption.', protocols: 'TLS sessions, RPC, NetBIOS, SIP', devices: 'Hosts', address: '—' },
  { n: 4, name: 'Transport', pdu: 'Segment (TCP) / Datagram (UDP)', job: 'End-to-end delivery between processes; reliability, ordering, flow & congestion control.', protocols: 'TCP, UDP, QUIC, SCTP', devices: 'Hosts, firewalls, L4 load balancers, NAT', address: 'Ports' },
  { n: 3, name: 'Network', pdu: 'Packet', job: 'Logical addressing and routing across networks.', protocols: 'IPv4, IPv6, ICMP, IPsec, OSPF, BGP (routes)', devices: 'Routers, L3 switches', address: 'IP addresses' },
  { n: 2, name: 'Data Link', pdu: 'Frame', job: 'Delivery on one link: framing, MAC addressing, error detection.', protocols: 'Ethernet, Wi-Fi, ARP, VLAN, PPP, STP', devices: 'Switches, bridges, access points, NICs', address: 'MAC addresses' },
  { n: 1, name: 'Physical', pdu: 'Bits / symbols', job: 'Bits as signals: voltages, light, radio; connectors, timing.', protocols: '1000BASE-T, 10GBASE-LR, 802.11 PHY, GPON, DWDM', devices: 'Cables, fiber, transceivers, repeaters, hubs, modems', address: '—' },
];

export const DNS_RECORDS = [
  ['A', 'IPv4 address of a name'],
  ['AAAA', 'IPv6 address of a name'],
  ['CNAME', 'Alias: this name is really that other name (cannot coexist with other records at the same name)'],
  ['NS', 'Which servers are authoritative for a zone (delegation)'],
  ['SOA', 'Start of authority: primary NS, admin, serial, refresh/retry/expire, negative-cache TTL'],
  ['MX', 'Mail servers for the domain, with priorities'],
  ['TXT', 'Free text: SPF, DKIM, DMARC, domain verification'],
  ['PTR', 'Reverse DNS: IP → name (in in-addr.arpa / ip6.arpa)'],
  ['SRV', 'Service location: host + port for _service._proto names (SIP, LDAP, Kubernetes)'],
  ['CAA', 'Which certificate authorities may issue certificates for the domain'],
  ['HTTPS / SVCB', 'Service binding: ALPN (h3), ECH keys, alternative endpoints, learned before connecting'],
  ['DS / DNSKEY / RRSIG / NSEC', 'DNSSEC: chain of trust, public keys, signatures, authenticated denial'],
];

export const DNS_RCODES = [
  ['0', 'NOERROR', 'Success (an empty answer = NODATA)'],
  ['1', 'FORMERR', 'Server could not parse the query'],
  ['2', 'SERVFAIL', 'Server failed (often DNSSEC validation failure or unreachable authoritative servers)'],
  ['3', 'NXDOMAIN', 'The name does not exist'],
  ['4', 'NOTIMP', 'Query type not implemented'],
  ['5', 'REFUSED', 'Policy refusal (e.g. recursion not allowed for you)'],
];

export const ICMP_TYPES = [
  ['0', 'Echo Reply', 'ping answer'],
  ['3', 'Destination Unreachable', 'code 0 net, 1 host, 3 port (UDP closed), 4 fragmentation needed + DF set (PMTUD), 13 administratively prohibited'],
  ['5', 'Redirect', 'use a better gateway on this link'],
  ['8', 'Echo Request', 'ping'],
  ['11', 'Time Exceeded', 'code 0 TTL hit zero in transit (traceroute), 1 fragment reassembly timeout'],
  ['12', 'Parameter Problem', 'bad IP header'],
];

export const TCP_FLAGS = [
  ['SYN', 'Synchronise sequence numbers: opens a connection'],
  ['ACK', 'The acknowledgment number is valid (set on almost every segment after the SYN)'],
  ['PSH', 'Push buffered data to the application now'],
  ['FIN', 'Sender has finished sending (graceful close, one direction)'],
  ['RST', 'Abort the connection immediately (port closed, firewall reject, app crash)'],
  ['URG', 'Urgent pointer is valid (rarely used)'],
  ['ECE / CWR', 'Explicit Congestion Notification signalling'],
];

export const TCP_STATES = [
  ['LISTEN', 'Server socket waiting for SYNs'],
  ['SYN-SENT', 'Client sent SYN, waiting for SYN-ACK'],
  ['SYN-RECEIVED', 'Server got SYN, sent SYN-ACK, waiting for ACK'],
  ['ESTABLISHED', 'Open; data flows both ways'],
  ['FIN-WAIT-1 / FIN-WAIT-2', 'We sent FIN; waiting for its ACK / the peer\'s FIN'],
  ['CLOSE-WAIT', 'Peer closed; our app hasn\'t closed yet (many of these = an app bug leaking sockets)'],
  ['LAST-ACK', 'We sent our FIN after the peer\'s; waiting for the final ACK'],
  ['TIME-WAIT', 'Closer waits 2×MSL (Linux: 60 s) so stray segments die out'],
  ['CLOSED', 'No connection'],
];

export const SUBNETS = [
  ['/8', '255.0.0.0', '16,777,214'],
  ['/16', '255.255.0.0', '65,534'],
  ['/20', '255.255.240.0', '4,094'],
  ['/22', '255.255.252.0', '1,022'],
  ['/24', '255.255.255.0', '254'],
  ['/25', '255.255.255.128', '126'],
  ['/26', '255.255.255.192', '62'],
  ['/27', '255.255.255.224', '30'],
  ['/28', '255.255.255.240', '14'],
  ['/29', '255.255.255.248', '6'],
  ['/30', '255.255.255.252', '2'],
  ['/31', '255.255.255.254', '2 (point-to-point, RFC 3021)'],
  ['/32', '255.255.255.255', '1 (single host route)'],
];

export const SATELLITES = [
  { orbit: 'LEO', alt: '340–1,200 km', period: '~95–110 min', rtt: '25–60 ms', examples: 'Starlink (~550 km), OneWeb (~1,200 km), Amazon Kuiper (~600 km)', notes: 'Thousands of satellites; phased-array dishes track them; laser inter-satellite links.' },
  { orbit: 'MEO', alt: '~8,000–20,000 km', period: '~5–12 h', rtt: '~120–150 ms', examples: 'SES O3b mPOWER (8,062 km); GPS (20,200 km, navigation)', notes: 'Few satellites, wide coverage, used for ships, islands, cellular backhaul.' },
  { orbit: 'GEO', alt: '35,786 km', period: '24 h (appears fixed)', rtt: '550–700 ms', examples: 'Viasat, HughesNet, Inmarsat', notes: 'One satellite covers a third of Earth; fixed dish; physics-limited latency.' },
];

export const TOOLS = [
  ['ping 8.8.8.8', 'Is it reachable? Shows RTT and loss (ICMP echo).'],
  ['traceroute -n example.com / tracert / mtr', 'Every router hop and its latency (TTL trick). mtr combines ping + traceroute continuously.'],
  ['dig example.com A +trace', 'Full DNS resolution from the root, like this site\'s 6 DNS steps. nslookup on Windows.'],
  ['dig @1.1.1.1 example.com +short', 'Ask a specific resolver.'],
  ['curl -v https://example.com', 'Shows DNS → connect → TLS → request/response headers. Add -w for timing.'],
  ["curl -o /dev/null -s -w '%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}\\n' URL", 'Latency budget of a real request: DNS, TCP, TLS, first byte.'],
  ['openssl s_client -connect example.com:443 -servername example.com', 'Inspect the TLS handshake and certificate chain.'],
  ['ip addr / ip route / ip neigh', 'Interfaces, routing table (default gateway), ARP/NDP cache on Linux.'],
  ['ss -tunap', 'Open sockets and their states (ESTABLISHED, TIME-WAIT…).'],
  ['tcpdump -ni eth0 port 53', 'Capture packets; open the .pcap in Wireshark.'],
  ['nc -vz host 443', 'Is a TCP port open?'],
  ['whois 142.250.0.0 / whois AS15169', 'Who owns an IP block or AS number.'],
];
