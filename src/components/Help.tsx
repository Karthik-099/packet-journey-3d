import { useStore } from '../store';

const KEYS: [string, string][] = [
  ['← / →', 'Previous / next step'],
  ['Space', 'Play / pause (video mode)'],
  ['Home / End', 'First / last step'],
  ['E', 'Toggle Beginner / Expert'],
  ['J', 'Switch journey'],
  ['?', 'Show / hide this help'],
  ['Esc', 'Close panels'],
  ['Drag / scroll', 'Orbit and zoom the 3D view; click any object for an explanation'],
];

export function Help() {
  const open = useStore((s) => s.helpOpen);
  const set = useStore((s) => s.set);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => set({ helpOpen: false })}>
      <div role="dialog" aria-label="Keyboard shortcuts" className="panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">Keyboard shortcuts</h2>
          <button className="btn text-xs" onClick={() => set({ helpOpen: false })} aria-label="Close">×</button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {KEYS.map(([k, d]) => (
            <div key={k} className="contents">
              <dt><kbd className="kbd">{k}</kbd></dt>
              <dd className="text-slate-300">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
