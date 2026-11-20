import { useEffect, useState } from 'react';
import { Footer, Nav } from '../site/Nav';
import { BigPicture, Osi, Addressing, Routing, Dns } from './sections-a';
import { Transport, Tls, Http, Ports, Protocols } from './sections-b';
import { Physical, BigNetworks, Cloud, Security, Toolkit, Glossary } from './sections-c';
import { Interview, Quiz } from './sections-d';
import { DeepDives } from './sections-e';

const TOC = [
  ['big-picture', 'How the world is connected'],
  ['osi', 'The OSI model'],
  ['addressing', 'Addresses, subnets, ports'],
  ['routing', 'Routing & BGP'],
  ['dns', 'DNS'],
  ['transport', 'TCP, UDP, QUIC'],
  ['tls', 'TLS & HTTPS'],
  ['http', 'HTTP & status codes'],
  ['ports', 'Port list'],
  ['protocols', 'Protocol directory'],
  ['deep', 'Protocols in depth'],
  ['physical', 'Cables & satellites'],
  ['big-networks', 'How the giants run networks'],
  ['cloud', 'Cloud networking'],
  ['security', 'Security'],
  ['toolkit', 'Troubleshooting'],
  ['interview', 'Interview questions'],
  ['quiz', 'Test yourself'],
  ['glossary', 'Glossary'],
] as const;

const READ_KEY = 'pj-read';

/** Highlights the section in view and remembers which ones the reader has reached. */
function useReading() {
  const [active, setActive] = useState<string>(TOC[0][0]);
  const [read, setRead] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[]));
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setActive(e.target.id);
            setRead((r) => {
              if (r.has(e.target.id)) return r;
              const n = new Set(r).add(e.target.id);
              localStorage.setItem(READ_KEY, JSON.stringify([...n]));
              return n;
            });
          }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    TOC.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return { active, read };
}

export function Learn() {
  const { active, read } = useReading();
  // deep links like learn.html#http: the sections render after load, so scroll once they exist
  useEffect(() => {
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, []);
  const pct = Math.round((read.size / TOC.length) * 100);
  return (
    <div className="site-bg">
      <Nav active="learn" />
      <div className="mx-auto max-w-6xl px-5">
        <header className="pb-6 pt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">Learn networking</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl">
            How the internet <span className="grad-text">actually</span> connects the world
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">From a single bit on a wire to Google's global backbone. Every section links to the matching moment in the 3D journey so you can see it happen.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
            <button className="cta-ghost text-sm" onClick={() => window.print()}>Save as PDF</button>
            <span className="text-sm text-slate-500">
              {read.size} of {TOC.length} sections read
            </span>
            <span className="h-1.5 w-40 overflow-hidden rounded-full bg-blue-100" aria-hidden>
              <span className="block h-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${pct}%` }} />
            </span>
          </div>
        </header>
        <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
          <nav aria-label="Sections" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-auto py-14 lg:block print:hidden">
            <ol className="space-y-0.5 text-sm">
              {TOC.map(([id, t], i) => (
                <li key={id}>
                  <a href={`#${id}`} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${active === id ? 'bg-blue-100 text-ink' : 'text-slate-500 hover:text-ink'}`}>
                    <span className={`font-mono text-[10px] ${read.has(id) ? 'text-emerald-600' : 'text-slate-600'}`}>{String(i + 1).padStart(2, '0')}</span>
                    {t}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <main className="min-w-0">
            <BigPicture />
            <Osi />
            <Addressing />
            <Routing />
            <Dns />
            <Transport />
            <Tls />
            <Http />
            <Ports />
            <Protocols />
            <DeepDives />
            <Physical />
            <BigNetworks />
            <Cloud />
            <Security />
            <Toolkit />
            <Interview />
            <Quiz />
            <Glossary />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
