import { useStore } from '../store';
import { Icon } from '../site/Icon';

/** Explains why we'd like the visitor's location before the browser's own permission prompt appears. */
export function LocationPrompt() {
  const status = useStore((s) => s.gpsStatus);
  const pending = useStore((s) => s.pending);
  const choose = useStore((s) => s.chooseLocation);
  if (status !== 'asking') return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#07041a]/70 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="loc-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-noc-edge bg-noc-panel shadow-2xl shadow-black/50">
        <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Icon name="pin" className="h-6 w-6" /></span>
            <div>
              <h2 id="loc-title" className="text-lg font-semibold">Start from where you really are?</h2>
              <p className="text-sm text-white/85">Tracing {pending ?? 'your request'}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5 text-sm leading-6 text-slate-300">
          <p>
            Your request begins at your device. With your permission, Packet Journey uses your browser's <b className="text-white">GPS / location</b> to put you exactly on the globe and measure the real distance to every server.
          </p>
          <ul className="space-y-1.5 text-slate-400">
            <li>Your coordinates stay in this browser tab. They are never sent or stored anywhere.</li>
            <li>Your browser will show its own "Allow location" prompt next.</li>
            <li>Your ISP's name still comes from your public IP address.</li>
          </ul>
          <div className="grid gap-2 pt-1 sm:grid-cols-3">
            <button autoFocus className="btn-primary sm:col-span-3" onClick={() => choose('gps')}>Use my exact location (GPS)</button>
            <button className="btn" onClick={() => choose('approx')}>Approximate (from IP)</button>
            <button className="btn sm:col-span-2" onClick={() => choose('skip')}>Skip: use an example location</button>
          </div>
        </div>
      </div>
    </div>
  );
}
