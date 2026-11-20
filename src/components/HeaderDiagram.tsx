import type { Ctx, Step } from '../content';

/** One header field: width in bits + how to show its value from the header bytes. */
interface F {
  name: string;
  bits: number;
  color: string;
}

const TCP: F[] = [
  { name: 'Source port', bits: 16, color: '#22d3ee' },
  { name: 'Destination port', bits: 16, color: '#22d3ee' },
  { name: 'Sequence number', bits: 32, color: '#67e8f9' },
  { name: 'Acknowledgment number', bits: 32, color: '#67e8f9' },
  { name: 'Offset', bits: 4, color: '#a5f3fc' },
  { name: 'Rsv', bits: 4, color: '#475569' },
  { name: 'Flags', bits: 8, color: '#fbbf24' },
  { name: 'Window', bits: 16, color: '#a5f3fc' },
  { name: 'Checksum', bits: 16, color: '#fb7185' },
  { name: 'Urgent ptr', bits: 16, color: '#475569' },
];
const IPV4: F[] = [
  { name: 'Ver', bits: 4, color: '#34d399' },
  { name: 'IHL', bits: 4, color: '#34d399' },
  { name: 'DSCP', bits: 6, color: '#6ee7b7' },
  { name: 'ECN', bits: 2, color: '#6ee7b7' },
  { name: 'Total length', bits: 16, color: '#a7f3d0' },
  { name: 'Identification', bits: 16, color: '#6ee7b7' },
  { name: 'Flags', bits: 3, color: '#fbbf24' },
  { name: 'Fragment offset', bits: 13, color: '#6ee7b7' },
  { name: 'TTL', bits: 8, color: '#fbbf24' },
  { name: 'Protocol', bits: 8, color: '#a7f3d0' },
  { name: 'Header checksum', bits: 16, color: '#fb7185' },
  { name: 'Source address', bits: 32, color: '#34d399' },
  { name: 'Destination address', bits: 32, color: '#34d399' },
];
const ETH: F[] = [
  { name: 'Destination MAC', bits: 48, color: '#fbbf24' },
  { name: 'Source MAC', bits: 48, color: '#fcd34d' },
  { name: 'EtherType', bits: 16, color: '#fde68a' },
];

/** Read `bits` bits starting at bit offset `at` (big-endian, network order). */
function readBits(b: Uint8Array, at: number, bits: number): bigint {
  let v = 0n;
  for (let i = 0; i < bits; i++) {
    const bit = at + i;
    v = (v << 1n) | BigInt(((b[bit >> 3] ?? 0) >> (7 - (bit & 7))) & 1);
  }
  return v;
}

function show(name: string, v: bigint, bits: number): string {
  if (/address/i.test(name)) return [24n, 16n, 8n, 0n].map((s) => (v >> s) & 255n).join('.');
  if (/MAC/.test(name)) return Array.from({ length: 6 }, (_, i) => ((v >> BigInt(40 - i * 8)) & 255n).toString(16).padStart(2, '0')).join(':');
  if (/checksum|EtherType/i.test(name)) return '0x' + v.toString(16).padStart(Math.ceil(bits / 4), '0');
  return v.toString();
}

function Diagram({ title, fields, bytes }: { title: string; fields: F[]; bytes: Uint8Array }) {
  // lay fields into 32-bit rows, splitting fields that cross a row boundary
  const rows: { f: F; from: number; span: number; value: string; cont: boolean }[][] = [[]];
  let bit = 0;
  for (const f of fields) {
    const value = show(f.name, readBits(bytes, bit, f.bits), f.bits);
    let left = f.bits;
    let cont = false;
    while (left > 0) {
      const used = bit % 32;
      const span = Math.min(left, 32 - used);
      rows.at(-1)!.push({ f, from: used, span, value, cont });
      bit += span;
      left -= span;
      cont = true;
      if (bit % 32 === 0) rows.push([]);
    }
  }
  if (!rows.at(-1)!.length) rows.pop();
  return (
    <figure className="space-y-1">
      <figcaption className="flex justify-between font-mono text-[10px] text-slate-400">
        <span>{title}</span>
        <span>0 · · · 8 · · · 16 · · · 24 · · · 31</span>
      </figcaption>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-32 gap-px" style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }}>
          {r.map((c, j) => (
            <div
              key={j}
              title={`${c.f.name} (${c.f.bits} bits) = ${c.value}`}
              className="min-w-0 overflow-hidden rounded-sm border px-1 py-0.5 text-center"
              style={{ gridColumn: `${c.from + 1} / span ${c.span}`, borderColor: c.f.color + '88', background: c.f.color + '1a' }}
            >
              <div className="truncate text-[9px] text-slate-300">{c.cont ? '…' : ''}{c.f.name}</div>
              {!c.cont && <div className="truncate font-mono text-[10px]" style={{ color: c.f.color }}>{c.value}</div>}
            </div>
          ))}
        </div>
      ))}
    </figure>
  );
}

/** RFC-style header diagrams with the real values of the current message's packet. */
export function HeaderDiagram({ step, c }: { step: Step; c: Ctx }) {
  const p = step.pdu;
  return (
    <div className="space-y-3 rounded-md border border-noc-edge bg-black/30 p-2">
      {(p === 'Frame' || p === 'Bits') && <Diagram title="Ethernet II header (14 bytes) + FCS at the end" fields={ETH} bytes={c.hi.frame} />}
      {(p === 'Packet' || p === 'Frame' || p === 'Bits') && <Diagram title="IPv4 header (RFC 791, 20 bytes)" fields={IPV4} bytes={c.hi.packet} />}
      {p !== 'Data' && <Diagram title="TCP header (RFC 9293, 20 bytes)" fields={TCP} bytes={c.hi.segment} />}
      <p className="text-[10px] text-slate-500">Hover a field for its size and value. Values are read bit-by-bit from the real bytes of "{c.message}".</p>
    </div>
  );
}
