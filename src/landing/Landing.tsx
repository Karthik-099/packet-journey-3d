import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Footer, Nav, links } from '../site/Nav';
import { Tilt } from '../site/Tilt';
import { Icon, type IconName } from '../site/Icon';
import { normalizeDomain } from '../lib/lookup';

const HeroGlobe = lazy(() => import('../scene/CableGlobe'));

const EXAMPLES = ['google.com', 'amazon.com', 'facebook.com', 'wikipedia.org', 'github.com', 'netflix.com', 'bbc.co.uk', 'naver.com'];

const HOPS = [
  { k: 'Keyboard', d: 'Key matrix → USB HID → OS → browser' },
  { k: 'DNS', d: 'Resolver → root → TLD → authoritative' },
  { k: 'Your router', d: 'ARP, Wi-Fi, NAT to a public IP' },
  { k: 'ISP & BGP', d: 'Fiber or satellite; BGP picks the path' },
  { k: 'Backbone', d: 'IXPs, land fiber, submarine cables' },
  { k: 'Data center', d: 'Load balancer, TLS, HTTP, backend' },
  { k: 'Back to you', d: 'Same way home, then pixels' },
];

const FEATURES: { i: IconName; t: string; d: string }[] = [
  { i: 'search', t: 'Any website, real data', d: 'Live DNS-over-HTTPS resolves the domain, its nameservers and TLD; your GPS (with permission) or IP places you on the map.' },
  { i: 'globe', t: 'A 3D Earth you can follow', d: 'Your home, ISP, DNS servers and the data center stand where they really are. The packet rides real submarine-cable corridors.' },
  { i: 'layers', t: 'Every OSI layer, every byte', d: 'Watch any message become UTF-8, TCP, IP and Ethernet with real checksums, CRC-32 and RFC-style header diagrams.' },
  { i: 'terminal', t: 'Wireshark-style inspector', d: 'Expand header trees and click a field to highlight its exact bytes in hex or binary: DNS, TCP SYN, TLS ClientHello, HTTP/2.' },
  { i: 'satellite', t: 'Fiber vs Starlink vs GEO', d: 'Switch your access network and see the physics: ~5 ms per 1,000 km of glass, ~250 ms to a geostationary satellite.' },
  { i: 'gauge', t: 'Latency you can see', d: 'Every step adds its milliseconds. A trip summary shows how far your request travelled there and back.' },
  { i: 'play', t: 'Video mode with narration', d: 'Press play: the camera follows your packet around the planet with subtitles and an optional voice.' },
  { i: 'cap', t: 'A complete reference', d: '25 protocol deep dives, 110 ports, every HTTP status code, routing, cables and satellites, cloud networking, interview prep.' },
];

const STATS = [
  ['~99%', 'of intercontinental traffic rides submarine cables'],
  ['550+', 'submarine cable systems worldwide'],
  ['~75,000', 'independent networks glued together by BGP'],
  ['1,900+', 'anycast instances behind 13 DNS root names'],
];

const AUDIENCE: { i: IconName; t: string; d: string }[] = [
  { i: 'cap', t: 'Students', d: 'See the OSI model happen instead of memorising it.' },
  { i: 'zap', t: 'DevOps & SRE', d: 'Understand the path behind every 502, timeout and slow page.' },
  { i: 'route', t: 'Network engineers', d: 'Routing, BGP, anycast and cables on a real map, with real lookups.' },
  { i: 'shield', t: 'Interview prep', d: 'The classic "what happens when you type google.com", answered completely.' },
];

const COMPARE = [
  ['Cisco Packet Tracer', "Simulates your own lab topology (CCNA). Doesn't show the real internet, real DNS or geography."],
  ['Cloudflare Learning Center', 'Excellent articles. Static text and diagrams; no live data or packet-level view.'],
  ['Submarine Cable Map', 'The definitive cable map. Shows cables, not how your request uses them.'],
  ['Wireshark', 'Real packet capture for experts. Shows bytes, not where they go or why.'],
  ['"What happens when…" (GitHub)', 'The famous text answer. One fixed example, no visuals, no live data.'],
];

function Heading({ kicker, title, sub }: { kicker: string; title: ReactNode; sub?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">{kicker}</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-lg leading-8 text-slate-600">{sub}</p>}
    </div>
  );
}

const ghostDark = 'inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20';

export function Landing() {
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    const d = normalizeDomain(q || 'google.com');
    if (!d) return setErr('Enter a domain like example.com');
    location.href = `${links.app}?d=${encodeURIComponent(d)}#g-key`;
  };
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;
  return (
    <div className="site-bg">
      <Nav active="home" />
      <main>
        {/* ---------- hero (dark, 3D) ---------- */}
        <section className="hero-dark relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 pb-24 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Free · open source · runs in your browser
              </p>
              <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                See how the internet <span className="bg-gradient-to-r from-blue-300 via-sky-300 to-cyan-300 bg-clip-text text-transparent">really works.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100/90">
                Packet Journey is an interactive 3D guide to networking. Type any website and follow your request from your keyboard, through every OSI layer, your router and ISP, across submarine cables or satellites, to a data center and back. It uses real DNS, your real location and real packet bytes.
              </p>
              <form
                className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  go();
                }}
              >
                <label htmlFor="hero-domain" className="sr-only">Website to trace</label>
                <div className="flex flex-1 items-center rounded-xl bg-white px-4 shadow-xl shadow-black/20 ring-1 ring-white/20 focus-within:ring-2 focus-within:ring-cyan-300">
                  <span className="font-mono text-sm text-slate-400">https://</span>
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
                    className="w-full bg-transparent py-3.5 pl-1 font-mono text-ink outline-none placeholder:text-slate-400"
                  />
                </div>
                <button className="cta justify-center">Trace my request →</button>
              </form>
              {err && <p className="mt-2 text-sm text-rose-300" role="alert">{err}</p>}
              <ol className="mt-5 grid max-w-xl gap-2 text-sm text-blue-100/90 sm:grid-cols-3" aria-label="What happens when you start">
                {[
                  ['Real lookup', 'We find the real IP, nameservers and server location of the site you typed.'],
                  ['Watch the trip', '23 short steps in 3D: keyboard, DNS, router, ISP, cables, data center and back.'],
                  ['Pause and dig in', 'Every step has a plain-English story, real timings and the actual packet bytes.'],
                ].map(([t, d], i) => (
                  <li key={t} className="rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <span className="font-display text-xs font-semibold uppercase tracking-wider text-emerald-300">{i + 1}. {t}</span>
                    <p className="mt-1 text-[13px] leading-5 text-slate-300">{d}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 max-w-xl text-[13px] text-slate-400">About 3 minutes start to finish. No sign-up, nothing to install. If you've ever wondered what "loading…" is actually doing, this is it.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {EXAMPLES.map((d) => (
                  <a key={d} href={`${links.app}?d=${d}#g-key`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-blue-100 backdrop-blur transition hover:bg-white/15">
                    {d}
                  </a>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a className={ghostDark} href={`${links.app}#hi-l7`}><Icon name="layers" /> Send a message through the 7 layers</a>
                <a className={ghostDark} href={links.learn}><Icon name="cap" /> Learn networking</a>
              </div>
            </div>
            <div className="relative h-[420px] sm:h-[520px] lg:h-[620px]">
              <div className="absolute inset-0 [mask-image:radial-gradient(circle_at_50%_50%,black_58%,transparent_74%)]">
              <div className="pointer-events-none absolute inset-10 rounded-full bg-blue-500/25 blur-3xl" />
              {wide ? (
                <Suspense fallback={<div className="absolute inset-16 animate-pulse rounded-full bg-gradient-to-br from-blue-500/40 to-cyan-400/30" />}>
                  <HeroGlobe />
                </Suspense>
              ) : (
                <div className="absolute inset-12 rounded-full bg-gradient-to-br from-blue-500/50 via-sky-500/30 to-cyan-400/40 shadow-[0_0_120px_rgba(167,139,250,.5)]" />
              )}
              </div>
              <p className="absolute bottom-2 right-2 text-[11px] text-blue-200/70">All 734 submarine cables · data: TeleGeography (CC BY-NC-SA) · drag to spin</p>
            </div>
          </div>
        </section>

        {/* ---------- stats ---------- */}
        <section className="relative z-10 mx-auto -mt-12 grid max-w-6xl grid-cols-2 gap-4 px-5 md:grid-cols-4">
          {STATS.map(([n, t]) => (
            <div key={t} className="glass p-6">
              <div className="grad-text text-4xl font-extrabold tracking-tight">{n}</div>
              <div className="mt-1 text-sm text-slate-600">{t}</div>
            </div>
          ))}
        </section>

        {/* ---------- how ---------- */}
        <section className="mx-auto mt-28 max-w-6xl px-5">
          <Heading kicker="How it works" title="Three steps to understand the internet" sub="No installs, no sign-up. Everything runs in your browser." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ['1', 'Type a website', 'Any domain. We look it up live: the IP address, its nameservers, where the server is. Allow GPS and we start from exactly where you are.'],
              ['2', 'Watch the journey', 'Press Play and follow the packet in 3D across 23 steps, or step through with the arrow keys. Every step explains what happens in plain English and in expert detail.'],
              ['3', 'Go deeper', 'Open the packet inspector, switch fiber for a satellite, compare HTTP/2 and HTTP/3, cut a cable, then read the full reference.'],
            ].map(([n, t, d]) => (
              <Tilt key={n} className="glass p-7">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xl font-bold text-white shadow-lg shadow-blue-500/30">{n}</div>
                <h3 className="mt-5 text-xl font-semibold text-ink">{t}</h3>
                <p className="mt-2 leading-7 text-slate-600">{d}</p>
              </Tilt>
            ))}
          </div>
        </section>

        {/* ---------- the path ---------- */}
        <section className="mx-auto mt-24 max-w-6xl px-5" aria-label="The path of a request">
          <Heading kicker="The path" title="Seven stops between your keyboard and the server" />
          <div className="glass mt-10 overflow-x-auto p-7" tabIndex={0} role="region" aria-label="The path of a request">
            <ol className="relative flex min-w-[760px] justify-between">
              <span aria-hidden className="absolute left-6 right-6 top-6 h-0.5 rounded bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400" />
              <span aria-hidden className="absolute top-[18px] h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-[0_0_18px] shadow-cyan-400 motion-safe:animate-[travel_7s_linear_infinite]" style={{ offsetPath: 'path("M 24 0 H 712")' }} />
              {HOPS.map((h, i) => (
                <li key={h.k} className="relative z-10 flex w-28 flex-col items-center text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-blue-200 bg-white font-mono text-sm font-semibold text-blue-700 shadow-md">{i + 1}</span>
                  <span className="mt-3 text-sm font-semibold text-ink">{h.k}</span>
                  <span className="mt-1 text-xs leading-5 text-slate-500">{h.d}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- features ---------- */}
        <section className="mx-auto mt-28 max-w-6xl px-5">
          <Heading kicker="Features" title={<>Everything between your keyboard <span className="grad-text">and the server</span></>} sub='Technically accurate throughout. Anything simplified for teaching carries a "simplified" tag.' />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Tilt key={f.t} className="glass p-6">
                <div className="icon-tile"><Icon name={f.i} /></div>
                <h3 className="mt-4 font-semibold text-ink">{f.t}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{f.d}</p>
              </Tilt>
            ))}
          </div>
        </section>

        {/* ---------- entry points ---------- */}
        <section className="mx-auto mt-28 grid max-w-6xl gap-5 px-5 md:grid-cols-3">
          {(
            [
              { href: links.app, k: 'Interactive', t: 'The packet journey', d: '23 steps for a website visit, 16 for a message through the OSI stack. Play it like a video.', i: 'globe' },
              { href: links.learn, k: 'Reference', t: 'Learn networking', d: 'How the world is connected, every major protocol in depth, ports, status codes, cloud networking and more.', i: 'cap' },
              { href: links.lab, k: 'Tool', t: 'Packet Lab', d: 'Open your own Wireshark capture (.pcap) and explore it layer by layer, privately in your browser.', i: 'flask' },
            ] as const
          ).map((c) => (
            <a key={c.t} href={c.href} className="group block">
              <Tilt className="glass h-full p-8 group-hover:border-blue-300">
                <div className="icon-tile"><Icon name={c.i} /></div>
                <div className="mt-5 text-xs font-semibold uppercase tracking-widest text-cyan-600">{c.k}</div>
                <h3 className="mt-1 text-2xl font-bold text-ink">{c.t} <span className="inline-block transition group-hover:translate-x-1">→</span></h3>
                <p className="mt-2 leading-7 text-slate-600">{c.d}</p>
              </Tilt>
            </a>
          ))}
        </section>

        {/* ---------- audience ---------- */}
        <section className="mx-auto mt-28 max-w-6xl px-5">
          <Heading kicker="Who it's for" title="Built for curious people at every level" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map((a) => (
              <div key={a.t} className="glass flex gap-4 p-5">
                <div className="icon-tile shrink-0"><Icon name={a.i} /></div>
                <div>
                  <h3 className="font-semibold text-ink">{a.t}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{a.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- comparison ---------- */}
        <section className="mx-auto mt-28 max-w-6xl px-5">
          <Heading kicker="Why another tool?" title="How it compares" sub="Great tools exist; each shows one slice. Packet Journey connects bytes, layers, geography and timing for a request you choose." />
          <div className="glass mt-10 overflow-x-auto" tabIndex={0} role="region" aria-label="Comparison table">
            <table className="tbl">
              <thead><tr><th>Tool</th><th>What it does well / what it doesn't show</th></tr></thead>
              <tbody>
                {COMPARE.map(([t, d]) => (
                  <tr key={t}><td className="whitespace-nowrap font-medium text-ink">{t}</td><td>{d}</td></tr>
                ))}
                <tr><td className="whitespace-nowrap font-bold text-blue-700">Packet Journey</td><td className="font-medium text-ink">Live DNS for any domain, your real location, real packet bytes at every layer, routed over real cable corridors or satellites on a 3D Earth, with a latency budget, incident simulations, a packet lab and a full reference.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- final CTA ---------- */}
        <section className="mx-auto mt-28 max-w-6xl px-5">
          <div className="hero-dark overflow-hidden rounded-3xl px-8 py-16 text-center shadow-2xl shadow-blue-900/30">
            <h2 className="text-4xl font-extrabold tracking-tight text-white">Ready? Press Enter.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100/90">Works in any modern browser. On phones and older computers it switches to a lighter 2.5D view automatically.</p>
            <a href={links.app} className="cta mt-8">Start the journey →</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
