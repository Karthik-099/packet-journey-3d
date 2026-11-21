/**
 * Curated learning resources. Every video was verified to exist via YouTube's oEmbed endpoint
 * (Nov 2026); every link was checked to resolve. Links open on the original sites (no embeds, no tracking).
 */
export type Topic = 'Foundations' | 'OSI & layers' | 'Physical & Ethernet' | 'Addressing' | 'DNS' | 'Transport' | 'TLS & security' | 'Routing & BGP' | 'Infrastructure' | 'Wireshark';

export interface Video {
  id: string; // YouTube video id
  title: string;
  channel: string;
  length: string;
  topic: Topic;
  why: string;
}

export const VIDEOS: Video[] = [
  { id: '74sEFYBBRAY', title: 'What is the Internet?', channel: 'Jim Kurose', length: '13:36', topic: 'Foundations', why: 'From the author of the standard networking textbook (Kurose & Ross).' },
  { id: 'ZhEf7e4kopM', title: 'The Internet: Wires, Cables & Wifi', channel: 'Code.org', length: '6:42', topic: 'Foundations', why: 'How bits physically travel. Beginner-friendly.' },
  { id: '5o8CwafCxnU', title: 'The Internet: IP Addresses & DNS', channel: 'Code.org', length: '6:45', topic: 'Foundations', why: 'Addresses and names in one short clip.' },
  { id: 'AYdF7b3nMto', title: 'The Internet: Packets, Routing & Reliability', channel: 'Code.org', length: '6:26', topic: 'Foundations', why: 'Why data is split into packets and how routers forward them.' },
  { id: 'kBXQZMmiA4s', title: 'The Internet: HTTP & HTML', channel: 'Code.org', length: '7:07', topic: 'Foundations', why: 'What a browser actually asks a server for.' },
  { id: 'YJGGYKAV4pA', title: 'How Data moves through the Internet', channel: 'Practical Networking', length: '26:47', topic: 'Foundations', why: 'The best single deep explanation of a packet\'s path.' },
  { id: 'rYodcvhh7b8', title: 'Packet Traveling: How Packets Move Through a Network', channel: 'Practical Networking', length: '14:39', topic: 'Foundations', why: 'ARP, switches and routers hop by hop: exactly what this site animates.' },
  { id: 'AlkDbnbv7dk', title: 'What happens when you type a URL into your browser?', channel: 'ByteByteGo', length: '5:20', topic: 'Foundations', why: 'The classic interview question in five minutes.' },
  { id: '4YrYV2io3as', title: 'The Life of a Packet (Free CCNA, Day 12)', channel: 'Jeremy\'s IT Lab', length: '20:13', topic: 'Foundations', why: 'Part of a complete, free CCNA course.' },
  { id: 'IZ_PnVXtMeY', title: 'Layering, encapsulation', channel: 'Jim Kurose', length: '10:50', topic: 'OSI & layers', why: 'Why networks are built in layers, from the textbook author.' },
  { id: 'eelvWAURfdI', title: 'Network Layers Model (Networking Basics)', channel: 'Computerphile', length: '12:54', topic: 'OSI & layers', why: 'An intuitive take on the layer model.' },
  { id: '0y6FtKsg6J4', title: 'What is OSI Model: Real World Examples', channel: 'ByteByteGo', length: '4:45', topic: 'OSI & layers', why: 'Quick visual recap of all seven layers.' },
  { id: 'XaGXPObx2Gs', title: 'Sending digital information over a wire (1 of 13)', channel: 'Ben Eater', length: '4:14', topic: 'Physical & Ethernet', why: 'Start of a legendary series that builds networking from voltages up.' },
  { id: '8BhjXqw9MqI', title: 'Clock synchronization and Manchester coding (3 of 13)', channel: 'Ben Eater', length: '11:47', topic: 'Physical & Ethernet', why: 'The line code shown on this site\'s L1 waveform.' },
  { id: '1XrRT0CmzYw', title: 'Frame formats (6 of 13)', channel: 'Ben Eater', length: '9:05', topic: 'Physical & Ethernet', why: 'Ethernet frames decoded on an oscilloscope.' },
  { id: 'rPoalUa4m8E', title: 'The Internet Protocol (8 of 13)', channel: 'Ben Eater', length: '9:33', topic: 'Physical & Ethernet', why: 'The IPv4 header field by field.' },
  { id: 'F27PLin3TV0', title: 'TCP connection walkthrough (13 of 13)', channel: 'Ben Eater', length: '9:31', topic: 'Physical & Ethernet', why: 'A real TCP connection, packet by packet.' },
  { id: 'BWZ-MHIhqjM', title: 'What is Subnetting? (Subnetting Mastery 1 of 7)', channel: 'Practical Networking', length: '8:37', topic: 'Addressing', why: 'Start of the clearest subnetting course on YouTube.' },
  { id: '5WfiTHiU4x8', title: 'What is an IP Address? (You SUCK at Subnetting, EP 1)', channel: 'NetworkChuck', length: '18:45', topic: 'Addressing', why: 'Fun, energetic intro to IPs and subnets.' },
  { id: 'FTUV0t6JaDA', title: 'NAT Explained: Network Address Translation', channel: 'PowerCert Animated Videos', length: '4:26', topic: 'Addressing', why: 'How your router shares one public IP.' },
  { id: 'oItwDXraK1M', title: 'IPv6 from scratch: the very basics', channel: 'OneMarcFifty', length: '14:34', topic: 'Addressing', why: 'Calm, thorough IPv6 introduction.' },
  { id: 'mpQZVYPuDGU', title: 'How a DNS Server (Domain Name System) works', channel: 'PowerCert Animated Videos', length: '6:05', topic: 'DNS', why: 'The resolver → root → TLD → authoritative chain, animated.' },
  { id: 'HnUDtycXSNE', title: 'DNS Records Explained', channel: 'PowerCert Animated Videos', length: '14:14', topic: 'DNS', why: 'A, AAAA, CNAME, MX, TXT, NS and more.' },
  { id: 'uwoD5YsGACg', title: 'TCP vs UDP Comparison', channel: 'PowerCert Animated Videos', length: '4:37', topic: 'Transport', why: 'When to use which transport.' },
  { id: 'HCHFX5O1IaQ', title: 'How TCP Works: The Handshake', channel: 'Chris Greer', length: '13:53', topic: 'Transport', why: 'The 3-way handshake in Wireshark, from a packet-analysis expert.' },
  { id: 'nKVML4YaBqs', title: 'TCP: Additive Increase Multiplicative Decrease & Slow Start', channel: 'Computerphile', length: '26:08', topic: 'Transport', why: 'The congestion control behind this site\'s cwnd chart.' },
  { id: 'ZkL10eoG1PY', title: 'TLS Handshake: everything that happens when you visit an HTTPS website', channel: 'Practical Networking', length: '27:59', topic: 'TLS & security', why: 'The most complete TLS walkthrough available.' },
  { id: '86cQJ0MMses', title: 'TLS Handshake Explained', channel: 'Computerphile', length: '16:59', topic: 'TLS & security', why: 'The cryptography behind HTTPS, made intuitive.' },
  { id: 'ZghMPWGXexs', title: 'The Internet: Encryption & Public Keys', channel: 'Code.org', length: '6:40', topic: 'TLS & security', why: 'Beginner view of public-key cryptography.' },
  { id: 'O6tCoD5c_U0', title: 'BGP: Border Gateway Protocol', channel: 'Computerphile', length: '16:18', topic: 'Routing & BGP', why: 'How networks tell each other what they can reach.' },
  { id: 'Bie32IZlMtY', title: 'Why Did Facebook Go Down?', channel: 'Computerphile', length: '15:26', topic: 'Routing & BGP', why: 'The 2021 outage: BGP withdrawals took DNS offline.' },
  { id: '2rV4tJkP-CQ', title: 'BGP: the Border Gateway Protocol', channel: 'Jim Kurose', length: '18:07', topic: 'Routing & BGP', why: 'Textbook-depth BGP lecture.' },
  { id: 'yd1JhZzoS6A', title: 'How The Internet Travels Across Oceans', channel: 'VISION', length: '6:26', topic: 'Infrastructure', why: 'Submarine cables, beautifully explained.' },
  { id: 'Pz5XRyo5fiw', title: 'How A Million Miles Of Undersea Cables Power The Internet', channel: 'CNBC', length: '22:12', topic: 'Infrastructure', why: 'The business, ships and geopolitics of subsea cables.' },
  { id: 'qs2QcycggWU', title: 'How does Starlink Satellite Internet Work?', channel: 'Branch Education', length: '28:09', topic: 'Infrastructure', why: 'Phased-array dishes, lasers and orbits in stunning detail.' },
  { id: 'RI9np1LWzqw', title: 'What Is A CDN? How Does It Work?', channel: 'ByteByteGo', length: '4:24', topic: 'Infrastructure', why: 'Why content is served from near you.' },
  { id: 'Amow8BJm5Go', title: 'What is a Data Center?', channel: 'Google Cloud Tech', length: '2:45', topic: 'Infrastructure', why: 'Short tour from a hyperscaler.' },
  { id: 'xdQ9sgpkrX8', title: 'TCP Fundamentals Part 1: TCP/IP Explained with Wireshark', channel: 'Chris Greer', length: '1:17:24', topic: 'Wireshark', why: 'Hands-on packet analysis: pairs perfectly with the Packet Lab.' },
];

export interface Reading {
  title: string;
  by: string;
  url: string;
  what: string;
}

export const READING: Reading[] = [
  { title: 'Computer Networking: A Top-Down Approach', by: 'Kurose & Ross', url: 'https://gaia.cs.umass.edu/kurose_ross/', what: 'The standard university textbook, with free lectures and interactive exercises.' },
  { title: 'Computer Networks: A Systems Approach', by: 'Peterson & Davie', url: 'https://book.systemsapproach.org/', what: 'A complete networking textbook, free online.' },
  { title: 'High Performance Browser Networking', by: 'Ilya Grigorik', url: 'https://hpbn.co/', what: 'Latency, TCP, TLS, HTTP/2, Wi-Fi and mobile, from a web-performance angle. Free.' },
  { title: 'Cloudflare Learning Center', by: 'Cloudflare', url: 'https://www.cloudflare.com/learning/', what: 'Clear articles on DNS, CDNs, DDoS, BGP, TLS and security.' },
  { title: 'The Illustrated TLS 1.3 Connection', by: 'Michael Driscoll', url: 'https://tls13.xargs.org/', what: 'Every byte of a real TLS 1.3 handshake, annotated.' },
  { title: 'The Illustrated QUIC Connection', by: 'Michael Driscoll', url: 'https://quic.xargs.org/', what: 'Every byte of a QUIC (HTTP/3) connection, annotated.' },
  { title: 'Beej\'s Guide to Network Programming', by: 'Brian "Beej" Hall', url: 'https://beej.us/guide/bgnet/', what: 'Sockets explained for programmers. A classic.' },
  { title: 'What happens when…', by: 'alex/what-happens-when on GitHub', url: 'https://github.com/alex/what-happens-when', what: 'The famous text answer to the google.com interview question.' },
  { title: 'Networking! ACK! (zine)', by: 'Julia Evans', url: 'https://wizardzines.com/zines/networking/', what: 'A friendly illustrated introduction to networking.' },
  { title: 'MDN: HTTP', by: 'Mozilla', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', what: 'The best reference for HTTP headers, methods, status codes and caching.' },
  { title: 'Practical Networking', by: 'Ed Harmoush', url: 'https://www.practicalnetworking.net/', what: 'Articles and courses behind the Practical Networking videos.' },
  { title: 'RIPE NCC Academy', by: 'RIPE NCC', url: 'https://academy.ripe.net/', what: 'Free courses on IPv6, BGP, RPKI and DNS from a Regional Internet Registry.' },
  { title: 'APNIC Academy', by: 'APNIC', url: 'https://academy.apnic.net/', what: 'Free networking courses from the registry serving Asia-Pacific, including India.' },
  { title: 'APNIC Blog', by: 'APNIC', url: 'https://blog.apnic.net/', what: 'Research on routing, DNS and IPv6, including the yearly "BGP in…" reports.' },
  { title: 'Cloudflare Blog', by: 'Cloudflare', url: 'https://blog.cloudflare.com/', what: 'Deep technical posts on outages, protocols and internet trends.' },
  { title: 'MANRS', by: 'Internet Society', url: 'https://www.manrs.org/', what: 'Routing security best practices (RPKI, filtering, anti-spoofing).' },
  { title: 'RFC Editor', by: 'IETF', url: 'https://www.rfc-editor.org/', what: 'The official home of every internet standard (RFC).' },
  { title: 'Wireshark documentation', by: 'Wireshark Foundation', url: 'https://www.wireshark.org/docs/', what: 'User guide and display-filter reference.' },
];

export interface Tool {
  title: string;
  url: string;
  what: string;
}

export const TOOLS_ONLINE: Tool[] = [
  { title: 'Submarine Cable Map', url: 'https://www.submarinecablemap.com/', what: 'Every subsea cable and landing station (the data behind this site\'s globe).' },
  { title: 'Cloudflare Radar', url: 'https://radar.cloudflare.com/', what: 'Live internet traffic, outages, attacks and adoption trends.' },
  { title: 'Hurricane Electric BGP Toolkit', url: 'https://bgp.he.net/', what: 'Look up any ASN, prefix or IP: peers, routes, IXPs.' },
  { title: 'bgp.tools', url: 'https://bgp.tools/', what: 'Modern BGP explorer with upstreams and route history.' },
  { title: 'PeeringDB', url: 'https://www.peeringdb.com/', what: 'Where every network peers: IXPs, facilities, policies.' },
  { title: 'Internet Society Pulse', url: 'https://pulse.internetsociety.org/', what: 'Shutdowns, resilience, IPv6/HTTPS adoption by country.' },
  { title: 'Potaroo (Geoff Huston)', url: 'https://www.potaroo.net/', what: 'Long-running statistics on BGP and address exhaustion.' },
];
