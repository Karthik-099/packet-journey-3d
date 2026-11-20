import { useEffect } from 'react';
import { useStore } from '../store';
import { detectMe } from '../lib/whoami';

/** Detects the visitor's public IP/ISP once on load and shows it; can be turned off. */
export function WhoAmI() {
  const { me, meStatus, set } = useStore();
  useEffect(() => {
    if (meStatus !== 'loading') return;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 6000);
    detectMe(ac.signal).then((m) => set(m ? { me: m, meStatus: 'ok' } : { meStatus: 'failed' }));
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [meStatus, set]);
  const label =
    meStatus === 'loading'
      ? 'detecting your IP…'
      : meStatus === 'ok' && me
        ? `${me.ip} · ${[me.city, me.country].filter(Boolean).join(', ')} · ${me.org}${me.asn ? ' ' + me.asn : ''}`
        : meStatus === 'off'
          ? 'using example addresses'
          : 'IP lookup unavailable: using examples';
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400" title="Your public IP and ISP, looked up via ipapi.co in your browser. Nothing is stored.">
      <span className={`h-1.5 w-1.5 rounded-full ${meStatus === 'ok' ? 'bg-noc-green' : meStatus === 'loading' ? 'animate-pulse bg-noc-amber' : 'bg-slate-600'}`} />
      <span className="max-w-[28ch] truncate sm:max-w-[48ch]">{label}</span>
      {meStatus === 'ok' && (
        <button className="underline hover:text-white" onClick={() => set({ meStatus: 'off' })}>
          hide
        </button>
      )}
      {meStatus === 'off' && (
        <button className="underline hover:text-white" onClick={() => set({ meStatus: me ? 'ok' : 'loading' })}>
          use mine
        </button>
      )}
    </div>
  );
}
