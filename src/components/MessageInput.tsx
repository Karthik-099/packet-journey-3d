import { useStore, useCtx } from '../store';
import { toHex } from '../lib/bytes';
import { Switch } from './ui';

export function MessageInput() {
  const { message, tls, tcpip, set } = useStore();
  const c = useCtx();
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs">
      <label className="flex items-center gap-2">
        <span className="h-label">message</span>
        <input
          value={message}
          maxLength={64}
          onChange={(e) => set({ message: e.target.value || '' })}
          className="w-40 rounded border border-noc-edge bg-black/40 px-2 py-1 font-mono text-sm text-noc-amber focus:border-noc-cyan focus:outline-none"
          aria-label="Message to send"
        />
      </label>
      <span className="hidden max-w-xs truncate font-mono text-[11px] text-slate-500 md:inline">{toHex(c.hi.message)}</span>
      <Switch on={tls} onChange={(v) => set({ tls: v })}>TLS</Switch>
      <Switch on={tcpip} onChange={(v) => set({ tcpip: v })}>TCP/IP 4-layer view</Switch>
      <span className="font-mono text-[11px] text-slate-400">{c.hi.wire.length} B on wire</span>
    </div>
  );
}
