import type { Ctx, Journey } from './types';
import { HI, dstPort, receiverChecks } from '../lib/hi';
import { ethFields, ipFields, payloadField, tcpFields, type Field, type Inspection } from '../lib/inspect';
import { toHex, toBin } from '../lib/bytes';

const data = (c: Ctx): Inspection => ({
  title: 'Application data',
  bytes: c.hi.message,
  tree: [payloadField(c.hi.message, 0, c.hi.message.length, false)],
});
const l6 = (c: Ctx): Inspection => ({
  title: c.tls ? 'TLS record (encrypted)' : 'Encoded bytes (UTF-8)',
  bytes: c.hi.l6,
  tree: [payloadField(c.hi.l6, 0, c.hi.l6.length, c.tls)],
});
const segment = (c: Ctx): Inspection => ({
  title: 'TCP segment',
  bytes: c.hi.segment,
  tree: [tcpFields(c.hi.segment, 0, c.hi.segment.length), payloadField(c.hi.segment, 20, c.hi.l6.length, c.tls)],
});
const packet = (c: Ctx): Inspection => ({
  title: 'IPv4 packet',
  bytes: c.hi.packet,
  tree: [ipFields(c.hi.packet, 0), tcpFields(c.hi.packet, 20, c.hi.segment.length), payloadField(c.hi.packet, 40, c.hi.l6.length, c.tls)],
});
const frame = (c: Ctx): Inspection => ({
  title: 'Ethernet frame',
  bytes: c.hi.frame,
  tree: [
    { name: `Frame: ${c.hi.frame.length} bytes on wire (+8 preamble/SFD)`, range: [0, c.hi.frame.length] },
    ethFields(c.hi.frame, 0, c.hi.packet.length, c.hi.padding),
    ipFields(c.hi.frame, 14),
    tcpFields(c.hi.frame, 34, c.hi.segment.length),
    payloadField(c.hi.frame, 54, c.hi.l6.length, c.tls),
  ],
});
const bits = (c: Ctx): Inspection => {
  const f = frame(c);
  const shift = (x: Field): Field => ({
    ...x,
    range: x.range && [x.range[0] + 8, x.range[1] + 8],
    children: x.children?.map(shift),
  });
  return {
    title: 'Bits on the wire',
    bytes: c.hi.wire,
    tree: [
      { name: 'Preamble', value: '7 × 0x55 (10101010…) for clock sync', range: [0, 7] },
      { name: 'Start Frame Delimiter', value: '0xD5 (10101011)', range: [7, 8] },
      ...f.tree.map(shift),
    ],
  };
};

const proto = (c: Ctx) => (c.tls ? 'HTTPS (TLS on port 443)' : 'HTTP (port 80)');

export const journeyHi: Journey = {
  id: 'hi',
  title: 'Send "hi" through the 7 OSI layers',
  subtitle: 'Two computers on the same LAN, one cable. Watch headers wrap and unwrap.',
  steps: [
    {
      id: 'hi-l7',
      short: 'L7 Application',
      title: 'Application layer: you type the message',
      layer: 7,
      side: 'sender',
      pdu: 'Data',
      focus: 'sender-7',
      what: (c) =>
        `You type "${c.message}" into a chat app and press Send. The app turns your text into a message it can hand to the network: just the characters, nothing about where they go yet.`,
      under: (c) => [
        `The app calls the OS socket API (send()/write() on a TCP socket it opened to ${HI.dstIp}:${dstPort(c.tls)}). Everything below this call is done by the operating system and the network card, not by the app.`,
        `Here the application protocol is ${proto(c)}. A real chat app would put the text inside a JSON body of an HTTP request or a WebSocket frame; we send only the raw text so every byte stays readable.`,
      ],
      simplified: 'Real chat apps wrap the text in JSON + HTTP/WebSocket framing. We send the bare text.',
      inspect: data,
    },
    {
      id: 'hi-l6',
      short: 'L6 Presentation',
      title: 'Presentation layer: characters become bytes',
      layer: 6,
      side: 'sender',
      pdu: 'Data',
      focus: 'sender-6',
      widget: 'utf8',
      what: (c) =>
        `Computers send numbers, not letters. UTF-8 turns each character into bytes: ${Array.from(c.hi.message.slice(0, 4), (b) => '0x' + b.toString(16)).join(', ')}${c.hi.message.length > 4 ? '…' : ''}.${c.tls ? ' With TLS on, those bytes are then encrypted, so anyone watching the cable sees only noise.' : ''}`,
      under: (c) => [
        `UTF-8 encodes ASCII characters (U+0000 to U+007F) as one byte with the same value, so "h" = 0x68 = 01101000 and "i" = 0x69 = 01101001. Other characters take 2 to 4 bytes, such as "é" = C3 A9.`,
        c.tls
          ? `TLS 1.3 wraps the bytes in a record: 5-byte header (type 23 application_data, legacy version 0x0303, length), then ciphertext of the data plus a 1-byte inner content type, then a 16-byte AEAD authentication tag (AES-GCM or ChaCha20-Poly1305). ${c.hi.message.length} bytes of text become ${c.hi.l6.length} bytes.`
          : 'Turn on TLS to see the bytes encrypted. Without it, anyone on the path can read the message.',
        'In the TCP/IP model there is no separate presentation layer. Encoding and encryption are done by the application and its libraries (TLS lives in user space, e.g. OpenSSL/BoringSSL).',
      ],
      simplified: 'The ciphertext is a deterministic stand-in, not real AES-GCM. The record layout and sizes are exact.',
      inspect: l6,
    },
    {
      id: 'hi-l5',
      short: 'L5 Session',
      title: 'Session layer: keeping the conversation together',
      layer: 5,
      side: 'sender',
      pdu: 'Data',
      focus: 'sender-5',
      widget: 'session',
      what: 'The session layer tracks the conversation: which messages belong together, who is logged in, and how to resume after a drop. Today this job is spread across TLS and the app itself.',
      under: (c) => [
        `The OSI session layer has no single protocol in the modern stack. Its duties are split up: the TCP connection (4-tuple ${HI.srcIp}:${HI.srcPort} ↔ ${HI.dstIp}:${dstPort(c.tls)}) carries the dialogue; the TLS session keys and session tickets (resumption, 0-RTT) keep it secure and resumable; the app's login cookie or token identifies who you are across many connections.`,
        'Things often placed at L5: TLS session resumption, RPC session handling, NetBIOS/SMB sessions, and the WebSocket upgrade that turns one HTTP request into a long-lived channel.',
      ],
      simplified: 'Mapping TLS and app sessions to OSI L5 is a teaching convention. TLS does not fit neatly into one OSI layer.',
      inspect: l6,
    },
    {
      id: 'hi-l4-handshake',
      short: 'L4 TCP handshake',
      title: 'Transport layer: TCP 3-way handshake',
      layer: 4,
      side: 'sender',
      pdu: 'Segment',
      focus: 'cable',
      widget: 'handshake',
      what: 'Before any data is sent, TCP sets up a reliable connection with three small messages: SYN ("let\'s talk, my count starts at X"), SYN-ACK ("ok, mine starts at Y, I got X"), ACK ("got Y"). Now both sides agree on sequence numbers.',
      under: [
        `The client picks a random Initial Sequence Number (here ${HI.clientIsn}) and sends SYN from ephemeral port ${HI.srcPort} (Linux picks from 32768 to 60999). SYN uses up one sequence number, so the server ACKs ISN+1.`,
        'SYN and SYN-ACK carry options: MSS 1460 (1500 MTU minus 20 IP and 20 TCP), SACK permitted, timestamps, and window scale 7 (the advertised window is multiplied by 128).',
        'The handshake costs one round trip (RTT) before the first data byte can be sent. Since the SYN must leave the NIC too, it already needs the ARP lookup from L2. We show ARP later to follow the layer order.',
      ],
      simplified: 'In reality the handshake runs before you press Send, when the app first connects.',
      inspect: (c) => {
        const s = c.hi.handshake[0]!.seg;
        return { title: 'TCP SYN', bytes: s, tree: [tcpFields(s, 0, s.length)] };
      },
    },
    {
      id: 'hi-l4',
      short: 'L4 Segment',
      title: 'Transport layer: TCP header → Segment',
      layer: 4,
      side: 'sender',
      pdu: 'Segment',
      focus: 'sender-4',
      what: (c) =>
        `TCP puts a 20-byte header in front of the data: which app it is for (port ${dstPort(c.tls)}), which app sent it (port ${HI.srcPort}), and a sequence number so the receiver can put pieces back in order and confirm it got them. Data + TCP header = a segment.`,
      under: (c) => [
        `Seq = ISN+1 = ${HI.clientIsn + 1} (the first data byte); Ack = ${HI.serverIsn + 1} (the next byte we expect from the server). Flags PSH+ACK: deliver now, and the Ack field is valid.`,
        `Window ${HI.window} × 128 (scale from the handshake) = ${HI.window * 128} bytes the sender can still receive. The checksum covers a pseudo-header (src/dst IP, protocol 6, length) plus the whole segment; the network card often computes it in hardware (checksum offload).`,
        `Segment size: 20 header + ${c.hi.l6.length} payload = ${c.hi.segment.length} bytes.`,
      ],
      simplified: 'Linux would also add a 12-byte TCP timestamp option to every segment. We leave it out so the header stays the basic 20 bytes.',
      inspect: segment,
    },
    {
      id: 'hi-l3',
      short: 'L3 Packet',
      title: 'Network layer: IP header → Packet',
      layer: 3,
      side: 'sender',
      pdu: 'Packet',
      focus: 'sender-3',
      widget: 'subnet',
      what: `IP adds the addresses of the two computers (${HI.srcIp} → ${HI.dstIp}), like writing an address on an envelope. It also adds a "time to live" counter so a lost packet cannot loop forever. Segment + IP header = a packet.`,
      under: (c) => [
        `Version 4, IHL 5 (20 bytes), total length ${c.hi.packet.length}, ID 0x${HI.ipId.toString(16)}, DF set (path MTU discovery: routers must not fragment), TTL ${HI.ttl} (Linux/macOS default; Windows uses 128), protocol 6 = TCP.`,
        'The header checksum covers only the 20-byte header. Every router decrements TTL and must recompute it. IPv6 dropped the header checksum for this reason.',
        `The routing table decides the next hop. ${HI.dstIp} is inside 192.168.1.0/24, which is directly connected, so the next hop is the destination itself and no router is needed.`,
      ],
      inspect: packet,
    },
    {
      id: 'hi-l2-arp',
      short: 'L2 ARP',
      title: 'Data link layer: ARP finds the MAC address',
      layer: 2,
      side: 'sender',
      pdu: 'Packet',
      focus: 'cable',
      widget: 'arp',
      what: `IP addresses are for the whole internet, but on a local cable cards talk using MAC addresses. The sender shouts "Who has ${HI.dstIp}?" to everyone (broadcast); the receiver answers "That's me, my MAC is ${HI.dstMac}".`,
      under: [
        `ARP request: Ethernet dst ff:ff:ff:ff:ff:ff, EtherType 0x0806, opcode 1, sender ${HI.srcMac}/${HI.srcIp}, target 00:00:00:00:00:00/${HI.dstIp}. The reply (opcode 2) is unicast back.`,
        'The result goes into the ARP cache (ip neigh / arp -a), usually for a few minutes, so most packets skip this step. If the destination were off-LAN, the sender would ARP for the default gateway\'s MAC instead; the IP dst stays the far host.',
        'IPv6 does the same job with Neighbor Discovery (ICMPv6 Neighbor Solicitation/Advertisement) using multicast.',
      ],
    },
    {
      id: 'hi-l2',
      short: 'L2 Frame',
      title: 'Data link layer: Ethernet header + FCS → Frame',
      layer: 2,
      side: 'sender',
      pdu: 'Frame',
      focus: 'sender-2',
      what: (c) =>
        `The network card wraps the packet in an Ethernet frame: the receiver's MAC, its own MAC, a type field (0x0800 = "IPv4 inside"), and a 4-byte error check (FCS) at the end.${c.hi.padding ? ` The packet is too small, so ${c.hi.padding} zero bytes of padding are added to reach Ethernet's 64-byte minimum.` : ''}`,
      under: (c) => [
        `Frame = 14-byte header + ${c.hi.packet.length}-byte payload${c.hi.padding ? ` + ${c.hi.padding} padding` : ''} + 4-byte FCS = ${c.hi.frame.length} bytes. The minimum is 64 so collisions could be detected on old shared Ethernet; the maximum is 1518 (1500 MTU).`,
        `FCS = CRC-32 (polynomial 0x04C11DB7) over dst MAC through padding = 0x${c.hi.fcs.toString(16).padStart(8, '0')}, sent least-significant byte first. Wireshark usually doesn't show it because NICs strip it on capture.`,
        'The receiver later strips the padding by trusting the IP total-length field.',
      ],
      inspect: frame,
    },
    {
      id: 'hi-l1',
      short: 'L1 Physical',
      title: 'Physical layer: bits become signals',
      layer: 1,
      side: 'wire',
      pdu: 'Bits',
      focus: 'cable',
      widget: 'waveform',
      what: (c) =>
        `Now it's only 1s and 0s: ${c.hi.wire.length * 8} bits. ${
          c.medium === 'copper'
            ? 'On copper they become voltage changes.'
            : c.medium === 'fiber'
              ? 'On fiber a laser flashes light on and off.'
              : 'Over Wi-Fi they ride on radio waves.'
        } First comes a preamble, a 1010… pattern that lets the receiver lock onto the timing.`,
      under: (c) => [
        'Preamble 7 × 0x55 + SFD 0xD5 come before the frame. Ethernet sends each byte least-significant bit first; the waveform below shows bits in that wire order.',
        c.medium === 'copper'
          ? '10BASE-T uses Manchester coding (a 1 = low→high mid-bit, 0 = high→low), shown here. Faster links use other codes: 100BASE-TX uses 4B5B + MLT-3, 1000BASE-T uses PAM-5 on all 4 pairs at once with echo cancellation.'
          : c.medium === 'fiber'
            ? '1000BASE-SX/LX turn each 8 bits into a 10-bit code (8b/10b) so 1s and 0s stay balanced, then switch a laser on and off (850 nm on multimode, 1310 nm on single-mode). 10G+ uses 64b/66b. Light in glass travels at about 2/3 of c, roughly 5 µs per km.'
            : 'Wi-Fi (802.11ax) uses OFDM: data is spread over many subcarriers, each modulated with QAM (up to 1024-QAM) on 2.4/5/6 GHz. The frame is also converted to an 802.11 frame with 3 or 4 address fields. The wave below shows phase changes (BPSK) for readability.',
      ],
      simplified: 'The waveform is a readable picture of the line code, not exact analog levels or timing.',
      inspect: bits,
    },
    {
      id: 'hi-r1',
      short: 'R · L1 Physical',
      title: 'Receiver L1: signals back to bits',
      layer: 1,
      side: 'receiver',
      pdu: 'Bits',
      focus: 'receiver-1',
      widget: 'waveform',
      what: 'The receiver\'s network card measures the incoming signal, uses the preamble to sync its clock, and turns the signal back into bits. When it sees the SFD (…10101011) it knows the frame starts right after.',
      under: [
        'The PHY recovers the clock from signal transitions (this is why line codes avoid long runs of the same bit), decodes the symbols, and hands the byte stream to the MAC layer, dropping the preamble/SFD.',
      ],
      inspect: bits,
    },
    {
      id: 'hi-r2',
      short: 'R · L2 Frame',
      title: 'Receiver L2: check FCS and MAC, strip the frame',
      layer: 2,
      side: 'receiver',
      pdu: 'Frame',
      focus: 'receiver-2',
      widget: 'checks',
      what: 'The card recalculates the CRC-32. If it doesn\'t match, the frame was damaged and is silently dropped. It also checks the destination MAC is its own (or broadcast). Then it removes the Ethernet header and trailer.',
      under: [
        'The NIC computes the CRC in hardware. A bad FCS increments the rx_crc_errors counter (ethtool -S). Frames for other MACs are dropped unless the NIC is in promiscuous mode, which is what Wireshark turns on.',
        'EtherType 0x0800 tells the kernel to hand the payload to the IPv4 stack.',
      ],
      checks: (c) => {
        const k = receiverChecks(c.hi);
        return [
          { label: 'FCS (CRC-32) valid', ok: k.fcs, detail: '0x' + c.hi.fcs.toString(16).padStart(8, '0') },
          { label: 'Destination MAC is mine', ok: k.mac, detail: HI.dstMac },
          { label: 'EtherType 0x0800 → IPv4', ok: true },
        ];
      },
      inspect: frame,
    },
    {
      id: 'hi-r3',
      short: 'R · L3 Packet',
      title: 'Receiver L3: check IP, strip the IP header',
      layer: 3,
      side: 'receiver',
      pdu: 'Packet',
      focus: 'receiver-3',
      widget: 'checks',
      what: 'The operating system checks the IP header is undamaged, that the packet is really addressed to this computer, and that TTL hasn\'t run out. Protocol 6 says "give it to TCP".',
      under: [
        'Header checksum: the ones\'-complement sum over the header, including the checksum field, must be 0xFFFF (so its complement is 0). Padding past total-length is trimmed here.',
        'A host that is not a router drops packets for other IPs (unless ip_forward is on). If fragments arrived, they would be reassembled here using ID + fragment offset.',
      ],
      checks: (c) => {
        const k = receiverChecks(c.hi);
        return [
          { label: 'Header checksum correct', ok: k.ipChecksum },
          { label: `Destination ${HI.dstIp} is mine`, ok: k.ipDst },
          { label: `TTL ${HI.ttl} > 0`, ok: k.ttl },
          { label: 'Protocol 6 → TCP', ok: true },
        ];
      },
      inspect: packet,
    },
    {
      id: 'hi-r4',
      short: 'R · L4 Segment',
      title: 'Receiver L4: TCP checks, orders and ACKs',
      layer: 4,
      side: 'receiver',
      pdu: 'Segment',
      focus: 'receiver-4',
      widget: 'checks',
      what: (c) =>
        `TCP checks the segment isn't damaged, uses the destination port (${dstPort(c.tls)}) to find which app it's for, and uses the sequence number to put data in the right order. It then sends back an ACK: "got it, next I expect byte ${HI.clientIsn + 1 + c.hi.l6.length}".`,
      under: (c) => [
        `The 4-tuple (${HI.srcIp}, ${HI.srcPort}, ${HI.dstIp}, ${dstPort(c.tls)}) finds the socket. Seq ${HI.clientIsn + 1} is exactly the expected next byte, so the data goes straight into the receive buffer. Out-of-order segments would wait in the out-of-order queue, and duplicates are dropped.`,
        `ACK sent back: ack = ${HI.clientIsn + 1} + ${c.hi.l6.length} = ${HI.clientIsn + 1 + c.hi.l6.length}. Linux may delay the ACK up to ~40 ms to combine it with a reply (delayed ACK).`,
      ],
      checks: (c) => {
        const k = receiverChecks(c.hi);
        return [
          { label: 'TCP checksum correct (with pseudo-header)', ok: k.tcpChecksum },
          { label: `Port ${dstPort(c.tls)} → socket found`, ok: true },
          { label: `Seq ${HI.clientIsn + 1} is the expected next byte`, ok: true },
          { label: `ACK ${HI.clientIsn + 1 + c.hi.l6.length} sent back`, ok: true },
        ];
      },
      inspect: segment,
    },
    {
      id: 'hi-r5',
      short: 'R · L5 Session',
      title: 'Receiver L5: match the session',
      layer: 5,
      side: 'receiver',
      pdu: 'Data',
      focus: 'receiver-5',
      widget: 'checks',
      what: 'The bytes belong to an existing conversation. The server matches them to the TLS session (its keys) and the logged-in user.',
      under: ['The app reads from the socket. The TLS library looks up its connection state (keys, sequence numbers). The app maps the connection or token to a user session.'],
      checks: (c) => [
        { label: 'TCP connection established', ok: true },
        { label: c.tls ? 'TLS session keys found' : 'No TLS (plaintext session)', ok: true },
      ],
      inspect: l6,
    },
    {
      id: 'hi-r6',
      short: 'R · L6 Presentation',
      title: 'Receiver L6: decrypt and decode',
      layer: 6,
      side: 'receiver',
      pdu: 'Data',
      focus: 'receiver-6',
      widget: 'checks',
      what: (c) => `${c.tls ? 'TLS checks the 16-byte tag (proof nobody changed the data) and decrypts. Then ' : ''}UTF-8 decoding turns the bytes back into characters.`,
      under: (c) => [
        c.tls ? 'AEAD decryption fails if even one bit was changed, and the connection is torn down with a bad_record_mac alert. The record sequence number (implicit nonce) stops replays.' : 'Without TLS, nothing protects integrity above TCP\'s weak 16-bit checksum.',
        `Decoding ${toHex(c.hi.message)} as UTF-8 gives "${c.message}". Invalid sequences would become U+FFFD (�).`,
      ],
      checks: (c) => [
        ...(c.tls ? [{ label: 'AEAD tag valid → decrypted', ok: true }] : []),
        { label: 'Valid UTF-8', ok: true, detail: toBin(c.hi.message.slice(0, 2)) + (c.hi.message.length > 2 ? '…' : '') },
      ],
      inspect: data,
    },
    {
      id: 'hi-r7',
      short: 'R · L7 Application',
      title: 'Receiver L7: the message appears',
      layer: 7,
      side: 'receiver',
      pdu: 'Data',
      focus: 'receiver-7',
      widget: 'result',
      what: (c) => `The chat app reads the text and shows "${c.message}". A few small messages and a lot of headers later, it arrived.`,
      under: (c) => [
        `Overhead: ${c.message.length > 0 ? c.hi.message.length : 0} bytes of message became ${c.hi.wire.length} bytes on the wire (${((c.hi.message.length / c.hi.wire.length) * 100).toFixed(1)}% useful data), plus the 12-byte inter-frame gap Ethernet requires.`,
      ],
      inspect: data,
    },
  ],
};
