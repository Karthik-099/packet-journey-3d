import { hex, ipStr, macStr, read16, read32, toHex, decodeUtf8 } from './bytes';
import { flagNames, inetChecksum } from './packets';

/** One row in the Wireshark-style tree. `range` is [start, end) into Inspection.bytes. */
export interface Field {
  name: string;
  value?: string;
  range?: [number, number];
  children?: Field[];
}

export interface Inspection {
  title: string;
  bytes?: Uint8Array;
  tree: Field[];
}

const h16 = (n: number) => '0x' + n.toString(16).padStart(4, '0');

export function ethFields(b: Uint8Array, o: number, payloadLen: number, padding: number): Field {
  const end = b.length;
  return {
    name: 'Ethernet II',
    value: `${macStr(b, o + 6)} → ${macStr(b, o)}`,
    range: [o, end],
    children: [
      { name: 'Destination MAC', value: macStr(b, o), range: [o, o + 6] },
      { name: 'Source MAC', value: macStr(b, o + 6), range: [o + 6, o + 12] },
      { name: 'EtherType', value: `${h16(read16(b, o + 12))} (IPv4)`, range: [o + 12, o + 14] },
      ...(padding
        ? [{ name: 'Padding', value: `${padding} bytes (min payload is 46)`, range: [o + 14 + payloadLen, o + 14 + payloadLen + padding] as [number, number] }]
        : []),
      { name: 'FCS (CRC-32)', value: '0x' + toHex(b.subarray(end - 4, end).slice().reverse(), ''), range: [end - 4, end] },
    ],
  };
}

export function ipFields(b: Uint8Array, o: number): Field {
  const ck = read16(b, o + 10);
  const ok = inetChecksum(b.subarray(o, o + 20)) === 0;
  return {
    name: 'Internet Protocol Version 4',
    value: `${ipStr(b, o + 12)} → ${ipStr(b, o + 16)}`,
    range: [o, o + read16(b, o + 2)],
    children: [
      { name: 'Version', value: String((b[o] ?? 0) >> 4), range: [o, o + 1] },
      { name: 'Header length', value: `${((b[o] ?? 0) & 0xf) * 4} bytes`, range: [o, o + 1] },
      { name: 'DSCP/ECN', value: '0x' + hex(b[o + 1] ?? 0), range: [o + 1, o + 2] },
      { name: 'Total length', value: String(read16(b, o + 2)), range: [o + 2, o + 4] },
      { name: 'Identification', value: h16(read16(b, o + 4)), range: [o + 4, o + 6] },
      { name: 'Flags', value: read16(b, o + 6) & 0x4000 ? "0x2 (Don't Fragment)" : '0x0', range: [o + 6, o + 8] },
      { name: 'Time to Live', value: String(b[o + 8]), range: [o + 8, o + 9] },
      { name: 'Protocol', value: `${b[o + 9]} (${b[o + 9] === 6 ? 'TCP' : b[o + 9] === 17 ? 'UDP' : '?'})`, range: [o + 9, o + 10] },
      { name: 'Header checksum', value: `${h16(ck)} [${ok ? 'correct' : 'BAD'}]`, range: [o + 10, o + 12] },
      { name: 'Source address', value: ipStr(b, o + 12), range: [o + 12, o + 16] },
      { name: 'Destination address', value: ipStr(b, o + 16), range: [o + 16, o + 20] },
    ],
  };
}

export function tcpFields(b: Uint8Array, o: number, segLen: number): Field {
  const hl = ((b[o + 12] ?? 0) >> 4) * 4;
  const win = read16(b, o + 14);
  return {
    name: 'Transmission Control Protocol',
    value: `${read16(b, o)} → ${read16(b, o + 2)}, Len ${segLen - hl}`,
    range: [o, o + segLen],
    children: [
      { name: 'Source port', value: String(read16(b, o)), range: [o, o + 2] },
      { name: 'Destination port', value: String(read16(b, o + 2)), range: [o + 2, o + 4] },
      { name: 'Sequence number (raw)', value: String(read32(b, o + 4)), range: [o + 4, o + 8] },
      { name: 'Acknowledgment number (raw)', value: String(read32(b, o + 8)), range: [o + 8, o + 12] },
      { name: 'Header length', value: `${hl} bytes`, range: [o + 12, o + 13] },
      { name: 'Flags', value: `0x${hex(b[o + 13] ?? 0)} (${flagNames(b[o + 13] ?? 0)})`, range: [o + 13, o + 14] },
      { name: 'Window', value: String(win), range: [o + 14, o + 16] },
      { name: 'Checksum', value: h16(read16(b, o + 16)) + ' [correct]', range: [o + 16, o + 18] },
      { name: 'Urgent pointer', value: String(read16(b, o + 18)), range: [o + 18, o + 20] },
      ...(hl > 20 ? [{ name: 'Options', value: `${hl - 20} bytes`, range: [o + 20, o + hl] as [number, number] }] : []),
    ],
  };
}

export function payloadField(b: Uint8Array, o: number, len: number, tls: boolean): Field {
  if (tls)
    return {
      name: 'Transport Layer Security',
      value: `TLSv1.3 Record: Application Data`,
      range: [o, o + len],
      children: [
        { name: 'Content type', value: '23 (application_data)', range: [o, o + 1] },
        { name: 'Legacy version', value: '0x0303 (TLS 1.2, fixed for compatibility)', range: [o + 1, o + 3] },
        { name: 'Length', value: String(read16(b, o + 3)), range: [o + 3, o + 5] },
        { name: 'Encrypted data', value: `${len - 5 - 16} bytes (message + 1-byte inner type)`, range: [o + 5, o + len - 16] },
        { name: 'Auth tag (AEAD)', value: '16 bytes', range: [o + len - 16, o + len] },
      ],
    };
  return {
    name: 'Data',
    value: JSON.stringify(decodeUtf8(b.subarray(o, o + len))),
    range: [o, o + len],
    children: [{ name: 'Length', value: `${len} bytes` }],
  };
}

export function dnsFields(b: Uint8Array, o: number): Field {
  const flags = read16(b, o + 2);
  const isResp = !!(flags & 0x8000);
  let p = o + 12;
  const labels: string[] = [];
  while ((b[p] ?? 0) !== 0) {
    const l = b[p] ?? 0;
    labels.push(decodeUtf8(b.subarray(p + 1, p + 1 + l)));
    p += l + 1;
  }
  const qEnd = p + 5;
  const qtype = read16(b, p + 1);
  const children: Field[] = [
    { name: 'Transaction ID', value: h16(read16(b, o)), range: [o, o + 2] },
    {
      name: 'Flags',
      value: `${h16(flags)} ${isResp ? 'Response' : 'Query'}${flags & 0x0400 ? ', Authoritative' : ''}${flags & 0x0100 ? ', RD' : ''}${flags & 0x0080 ? ', RA' : ''}`,
      range: [o + 2, o + 4],
    },
    { name: 'Questions', value: String(read16(b, o + 4)), range: [o + 4, o + 6] },
    { name: 'Answer RRs', value: String(read16(b, o + 6)), range: [o + 6, o + 8] },
    { name: 'Query', value: `${labels.join('.')}: type ${qtype === 1 ? 'A' : qtype === 28 ? 'AAAA' : qtype}, class IN`, range: [o + 12, qEnd] },
  ];
  if (read16(b, o + 6) > 0)
    children.push({
      name: 'Answer',
      value: `${labels.join('.')} A ${ipStr(b, qEnd + 12)} TTL ${read32(b, qEnd + 6)}`,
      range: [qEnd, qEnd + 16],
    });
  return { name: 'Domain Name System', value: isResp ? 'response' : 'query', range: [o, b.length], children };
}

export function udpFields(b: Uint8Array, o: number): Field {
  return {
    name: 'User Datagram Protocol',
    value: `${read16(b, o)} → ${read16(b, o + 2)}`,
    range: [o, o + read16(b, o + 4)],
    children: [
      { name: 'Source port', value: String(read16(b, o)), range: [o, o + 2] },
      { name: 'Destination port', value: String(read16(b, o + 2)), range: [o + 2, o + 4] },
      { name: 'Length', value: String(read16(b, o + 4)), range: [o + 4, o + 6] },
      { name: 'Checksum', value: h16(read16(b, o + 6)), range: [o + 6, o + 8] },
    ],
  };
}
