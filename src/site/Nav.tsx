import { Logo } from './Logo';
import { Search } from './Search';
import { ThemeToggle } from './ThemeToggle';
const BASE = import.meta.env.BASE_URL;

export const links = { home: `${BASE}`, app: `${BASE}app.html`, learn: `${BASE}learn.html`, lab: `${BASE}lab.html`, atlas: `${BASE}atlas.html` };

/** Top navigation shared by the landing and learning pages. */
export function Nav({ active }: { active: 'home' | 'learn' | 'lab' | 'atlas' }) {
  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3" aria-label="Main">
        <a href={links.home} className="whitespace-nowrap" aria-label="Packet Journey home">
          <Logo />
        </a>
        <div className="ml-auto flex items-center gap-1 text-sm">
          <Search />
          <ThemeToggle className="mx-1 border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-ink" />
          <a href={links.home} className={`hidden rounded-lg px-3 py-1.5 sm:inline ${active === 'home' ? 'text-ink' : 'text-slate-500 hover:text-ink'}`}>Home</a>
          <a href={links.learn} className={`rounded-lg px-3 py-1.5 ${active === 'learn' ? 'text-ink' : 'text-slate-500 hover:text-ink'}`}>Learn</a>
          <a href={links.lab} className={`hidden rounded-lg px-3 py-1.5 sm:inline ${active === 'lab' ? 'text-ink' : 'text-slate-500 hover:text-ink'}`}>Packet Lab</a>
          <a href={links.atlas} className={`hidden rounded-lg px-3 py-1.5 sm:inline ${active === 'atlas' ? 'text-ink' : 'text-slate-500 hover:text-ink'}`}>Internet Atlas</a>
          <a href={links.app} className="ml-2 whitespace-nowrap rounded-md border border-slate-900 bg-[#04121f] px-4 py-2 font-display font-semibold uppercase tracking-wider text-emerald-300 shadow-md hover:bg-[#0a2233]">
            Start<span className="hidden sm:inline"> the journey</span> →
          </a>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-blue-100">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 text-sm text-slate-500 sm:grid-cols-3">
        <div>
          <div className="font-semibold text-ink">Packet Journey</div>
          <p className="mt-1">An open educational project: how data really moves through the OSI layers and around the world.</p>
        </div>
        <div>
          <div className="font-semibold text-ink">Explore</div>
          <ul className="mt-1 space-y-1">
            <li><a className="hover:text-ink" href={links.app}>3D journey</a></li>
            <li><a className="hover:text-ink" href={`${links.app}#hi-l7`}>A message through the 7 layers</a></li>
            <li><a className="hover:text-ink" href={links.learn}>Learn networking</a></li>
            <li><a className="hover:text-ink" href={links.lab}>Packet Lab</a></li>
            <li><a className="hover:text-ink" href={links.atlas}>Internet Atlas</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-ink">Privacy</div>
          <p className="mt-1">No accounts, no cookies, no tracking, nothing stored. Live lookups run in your browser: DNS via dns.google, IP location via ipwho.is / ipapi.co.</p>
        </div>
      </div>
    </footer>
  );
}
