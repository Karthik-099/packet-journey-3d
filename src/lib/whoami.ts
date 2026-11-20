export interface Me {
  ip: string;
  city: string;
  region: string;
  country: string;
  org: string; // ISP name
  asn: string; // e.g. AS55836
  lat: number;
  lon: number;
}

/** Visitor's public IP + rough location via ipapi.co (HTTPS, no key). Returns null on any failure. */
export async function detectMe(signal?: AbortSignal): Promise<Me | null> {
  try {
    const r = await fetch('https://ipapi.co/json/', { signal });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    const s = (k: string) => (typeof j[k] === 'string' ? (j[k] as string) : '');
    const n = (k: string) => (typeof j[k] === 'number' ? (j[k] as number) : NaN);
    // trust boundary: only accept a plausible IP string
    if (!/^[0-9a-fA-F:.]{3,45}$/.test(s('ip'))) return null;
    return { ip: s('ip'), city: s('city'), region: s('region'), country: s('country_name'), org: s('org'), asn: s('asn'), lat: n('latitude'), lon: n('longitude') };
  } catch {
    return null;
  }
}
