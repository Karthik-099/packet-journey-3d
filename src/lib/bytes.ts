export const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
export const decodeUtf8 = (b: Uint8Array): string => new TextDecoder('utf-8', { fatal: false }).decode(b);

export const hex = (b: number) => b.toString(16).padStart(2, '0');
export const bin = (b: number) => b.toString(2).padStart(8, '0');
export const toHex = (b: Uint8Array, sep = ' ') => Array.from(b, hex).join(sep);
export const toBin = (b: Uint8Array, sep = ' ') => Array.from(b, bin).join(sep);

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export const u16 = (n: number) => new Uint8Array([(n >>> 8) & 0xff, n & 0xff]);
export const u32 = (n: number) => new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
export const read16 = (b: Uint8Array, o: number) => ((b[o] ?? 0) << 8) | (b[o + 1] ?? 0);
export const read32 = (b: Uint8Array, o: number) => (read16(b, o) * 0x10000 + read16(b, o + 2)) >>> 0;

export const ipBytes = (ip: string) => new Uint8Array(ip.split('.').map(Number));
export const ipStr = (b: Uint8Array, o: number) => Array.from(b.subarray(o, o + 4)).join('.');
export const macBytes = (mac: string) => new Uint8Array(mac.split(':').map((x) => parseInt(x, 16)));
export const macStr = (b: Uint8Array, o: number) => Array.from(b.subarray(o, o + 6), hex).join(':');

/** Code point → UTF-8 byte breakdown for the Presentation layer view. */
export function charBreakdown(s: string) {
  return Array.from(s).map((ch) => {
    const bytes = utf8(ch);
    return { ch, cp: ch.codePointAt(0) ?? 0, bytes: Array.from(bytes) };
  });
}
