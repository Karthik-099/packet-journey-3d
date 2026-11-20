/**
 * Like counter for Packet Journey: one global number shared by every visitor.
 *
 *   GET  /likes     → { "count": 42, "liked": false }
 *   POST /likes/up  → { "count": 43, "liked": true }   (one like per visitor)
 *
 * A single Durable Object holds the count, so increments are atomic and every
 * reader sees the latest value immediately (KV would be eventually consistent).
 * Visitors are de-duplicated by a salted SHA-256 of their IP; raw IPs are never stored.
 */
export interface Env {
  COUNTER: DurableObjectNamespace;
  ALLOWED_ORIGINS: string; // comma-separated, e.g. "https://karthik-099.github.io,http://localhost:5173"
  SALT: string; // secret: wrangler secret put SALT
}

const json = (body: unknown, origin: string | null, env: Env, status = 200) => {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
};

async function visitorId(req: Request, salt: string) {
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('origin');
    if (req.method === 'OPTIONS')
      return new Response(null, {
        headers: { 'access-control-allow-origin': origin ?? '*', 'access-control-allow-methods': 'GET, POST', 'access-control-max-age': '86400' },
      });
    if (url.pathname !== '/likes' && url.pathname !== '/likes/up') return json({ error: 'not found' }, origin, env, 404);
    if (url.pathname === '/likes/up' && req.method !== 'POST') return json({ error: 'use POST' }, origin, env, 405);
    const stub = env.COUNTER.get(env.COUNTER.idFromName('global'));
    const id = await visitorId(req, env.SALT);
    const r = await stub.fetch(`https://counter/${url.pathname === '/likes/up' ? 'up' : 'get'}?v=${id}`);
    return json(await r.json(), origin, env);
  },
};

export class Counter {
  constructor(private state: DurableObjectState) {}
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const v = url.searchParams.get('v') ?? '';
    const key = `v:${v}`;
    let count = (await this.state.storage.get<number>('count')) ?? 0;
    let liked = !!(await this.state.storage.get<boolean>(key));
    if (url.pathname === '/up' && !liked) {
      count += 1;
      liked = true;
      await this.state.storage.put({ count, [key]: true });
    }
    return Response.json({ count, liked });
  }
}
