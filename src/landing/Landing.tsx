import { useState } from 'react';
import { Footer, Nav, links } from '../site/Nav';
import { normalizeDomain } from '../lib/lookup';

const HOPS = [
  { k: 'Keyboard', d: 'Key matrix → USB HID report → OS → browser' },
  { k: 'DNS', d: 'Resolver → root → TLD → authoritative: name becomes an IP' },
  { k: 'Your router', d: 'ARP, Wi-Fi, NAT: private IP becomes public' },
  { k: 'ISP & BGP', d: 'Fiber or satellite to the ISP, BGP picks the path' },
  { k: 'Backbone', d: 'IXPs, terrestrial fiber, submarine cables' },
  { k: 'Data center', d: 'Load balancer, TLS, HTTP, backend' },
  { k: 'Back to you', d: 'Same way home, then DOM → layout → pixels' },
];

const FEATURES = [
  { t: 'Any website, real data', d: 'Type a domain. We resolve it live with DNS-over-HTTPS, find its nameservers and TLD, and geolocate the server and your own connection.' },
  { t: 'A 3D Earth you can follow', d: 'Your home, ISP, DNS servers and the destination data center stand where they really are. Watch the packet ride real submarine-cable corridors, or a satellite.' },
  { t: 'Every OSI layer, every byte', d: 'Send any message and see UTF-8 bytes, TCP, IP and Ethernet headers wrap it, with real checksums, CRC-32 and RFC header diagrams.' },
  { t: 'Wireshark-style inspector', d: 'Expand header trees, click a field, see its exact bytes in hex or binary. DNS, TCP SYN, TLS ClientHello, HTTP/2 frames.' },
  { t: 'Latency you can see', d: 'Each step adds its milliseconds: Wi-Fi, ISP, light in glass, handshakes. Compare fiber vs Starlink-style LEO vs GEO satellites.' },
  { t: 'Video mode with narration', d: 'Press play: the camera follows your packet around the planet with subtitles and an optional voice that explains each step.' },
];

const STATS = [
  ['~99%', 'of intercontinental traffic rides submarine cables'],
  ['550+', 'submarine cable systems in service or planned'],
  ['~75,000', 'autonomous networks glued together by BGP'],
  ['1,900+', 'anycast instances behind 13 DNS root names'],
];

const COMPARE = [
  ['Cisco Packet Tracer', 'Simulates your own lab topology (CCNA). Great for configuring devices; does not show the real internet, real DNS or geography.'],
  ['Cloudflare Learning Center', 'Excellent articles on DNS, TLS, DDoS. Static text and diagrams; no live data, no packet-level view.'],
  ['Submarine Cable Map', 'The definitive cable map. Shows cables, not how your request uses them.'],
  ['Wireshark', 'Real packet capture, expert tool. Shows bytes, but not where they physically go or why.'],
  ['"What happens when…" (GitHub)', 'Famous text walkthrough of typing google.com. One fixed example, no visuals, no live data.'],
];

export function Landing() {
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    const d = normalizeDomain(q || 'google.com');
    if (!d) return setErr('Enter a domain like example.com');
    location.href = `${links.app}?d=${encodeURIComponent(d)}#g-key`;
  };
  return (
    <div className="site-bg">
      <Nav active="home" />
      <main>
        {/* hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 text-center sm:pt-28">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Free · open source · runs in your browser
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            See how the internet <span className="grad-text">really</span> works.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Type any website and follow your request from the key under your finger, through every OSI layer, your router, your ISP, undersea cables or satellites, to a data center and back. In 3D, with real DNS and real distances.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
          >
            <label htmlFor="hero-domain" className="sr-only">Website to trace</label>
            <div className="glass flex flex-1 items-center px-4">
              <span className="font-mono text-sm text-slate-500">https://</span>
              <input
                id="hero-domain"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setErr('');
                }}
                placeholder="google.com"
                spellCheck={false}
                autoCapitalize="none"
                className="w-full bg-transparent py-3 pl-1 font-mono text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <button className="cta justify-center">Trace my request →</button>
          </form>
          {err && <p className="mt-2 text-sm text-rose-300" role="alert">{err}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <span className="py-1 text-slate-500">Try:</span>
            {['google.com', 'amazon.com', 'facebook.com', 'wikipedia.org', 'github.com', 'netflix.com', 'bbc.co.uk', 'naver.com'].map((d) => (
              <a key={d} href={`${links.app}?d=${d}#g-key`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-slate-300 hover:border-cyan-300/40 hover:text-white">
                {d}
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <a className="cta-ghost" href={`${links.app}#hi-l7`}>Send a message through the 7 layers</a>
            <a className="cta-ghost" href={links.learn}>Learn networking</a>
          </div>
        </section>

        {/* animated path (CSS only, no images) */}
        <section className="mx-auto max-w-6xl px-5" aria-label="The path of a request">
          <div className="glass overflow-x-auto p-6">
            <ol className="relative flex min-w-[760px] justify-between">
              <span aria-hidden className="absolute left-6 right-6 top-5 h-px bg-gradient-to-r from-cyan-400/60 via-violet-400/60 to-emerald-400/60" />
              <span aria-hidden className="absolute top-[14px] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_16px] shadow-amber-300 motion-safe:animate-[travel_7s_linear_infinite]" style={{ offsetPath: 'path("M 24 0 H 712")' }} />
              {HOPS.map((h, i) => (
                <li key={h.k} className="relative z-10 flex w-28 flex-col items-center text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-[#0b1028] font-mono text-sm text-cyan-300">{i + 1}</span>
                  <span className="mt-2 text-sm font-semibold text-white">{h.k}</span>
                  <span className="mt-1 text-xs text-slate-400">{h.d}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* stats */}
        <section className="mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-4 px-5 md:grid-cols-4">
          {STATS.map(([n, t]) => (
            <div key={t} className="glass p-5">
              <div className="grad-text text-3xl font-bold">{n}</div>
              <div className="mt-1 text-sm text-slate-400">{t}</div>
            </div>
          ))}
        </section>

        {/* features */}
        <section className="mx-auto mt-24 max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold text-white">Everything between your keyboard and the server</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">Every step is technically accurate. Anything simplified for teaching is marked with a "simplified" tag.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="glass p-6 transition hover:border-cyan-300/30">
                <h3 className="font-semibold text-white">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* two paths */}
        <section className="mx-auto mt-24 grid max-w-6xl gap-4 px-5 md:grid-cols-2">
          <a href={links.app} className="glass group p-8 transition hover:border-cyan-300/40">
            <div className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Interactive</div>
            <h3 className="mt-2 text-2xl font-bold text-white">The packet journey →</h3>
            <p className="mt-2 text-slate-400">23 steps for a website visit, 16 for a message through the OSI stack. Play it like a video or step through with ← →.</p>
          </a>
          <a href={links.learn} className="glass group p-8 transition hover:border-violet-300/40">
            <div className="text-sm font-semibold uppercase tracking-widest text-violet-300">Reference</div>
            <h3 className="mt-2 text-2xl font-bold text-white">Learn networking →</h3>
            <p className="mt-2 text-slate-400">How the world is connected, OSI, routing, DNS, TCP/QUIC, TLS, HTTP, every common port and status code, cloud & Kubernetes networking, and how Google, Cloudflare & co. run their networks.</p>
          </a>
        </section>

        {/* comparison */}
        <section className="mx-auto mt-24 max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold text-white">How it compares</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">Great tools exist; each shows one slice. Packet Journey connects the slices: bytes, layers, geography and timing, for a request you choose.</p>
          <div className="glass mt-8 overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Tool</th><th>What it does well / what it doesn't show</th></tr></thead>
              <tbody>
                {COMPARE.map(([t, d]) => (
                  <tr key={t}><td className="whitespace-nowrap font-medium text-white">{t}</td><td>{d}</td></tr>
                ))}
                <tr><td className="whitespace-nowrap font-semibold text-cyan-300">Packet Journey</td><td className="text-white">Live DNS + geo-IP for any domain, real packet bytes at every OSI layer, routed over real cable corridors or satellites on a 3D Earth, with a latency budget and a full learning reference.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-bold text-white">Ready? Press Enter.</h2>
          <p className="mt-3 text-slate-400">Works in any modern browser. On phones and older computers it switches to a lighter 2.5D view automatically.</p>
          <a href={links.app} className="cta mt-8">Start the journey →</a>
        </section>
      </main>
      <Footer />
    </div>
  );
}
