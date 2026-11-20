import { lazy, Suspense, useState } from 'react';
import { JOURNEYS } from './content';
import { useStep, useStore } from './store';
import { useDeepLink, usePlayback, useShortcuts } from './hooks';
import { Controls } from './components/Controls';
import { StepList } from './components/StepList';
import { SidePanel } from './components/SidePanel';
import { LatencyBar } from './components/LatencyBar';
import { MessageInput } from './components/MessageInput';
import { Concepts } from './components/Concepts';
import { ObjectTip } from './components/ObjectTip';
import { WhoAmI } from './components/WhoAmI';
import { Seg } from './components/ui';
import { Scene2D } from './scene/Scene2D';

const Scene3D = lazy(() => import('./scene/Scene'));

export default function App() {
  usePlayback();
  useDeepLink();
  useShortcuts();
  const { journey, mode, view, set, setJourney } = useStore();
  const step = useStep();
  // once 3D has been shown keep it mounted (paused when hidden)
  const [loaded3d, setLoaded3d] = useState(view === '3d');
  if (view === '3d' && !loaded3d) setLoaded3d(true);
  return (
    <div className="flex min-h-full flex-col bg-noc-bg md:h-full">
      <header className="flex flex-wrap items-center gap-3 border-b border-noc-edge px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-noc-cyan shadow-[0_0_10px] shadow-noc-cyan" />
          <h1 className="font-mono text-sm font-bold tracking-[0.2em] text-white">PACKET JOURNEY<span className="text-noc-cyan">·3D</span></h1>
        </div>
        <Seg label="Journey" value={journey} onChange={(j) => setJourney(j)} options={[{ v: 'google', l: 'google.com ⏎' }, { v: 'hi', l: '"hi" through OSI' }]} />
        <WhoAmI />
        <div className="ml-auto flex items-center gap-2">
          <Seg label="Detail level" value={mode} onChange={(m) => set({ mode: m })} options={[{ v: 'beginner', l: 'Beginner' }, { v: 'expert', l: 'Expert' }]} />
          <Seg label="View" value={view} onChange={(v) => set({ view: v })} options={[{ v: '3d', l: '3D' }, { v: '2d', l: '2.5D' }]} />
          <button className="btn text-xs" onClick={() => set({ conceptsOpen: true })}>📖 Concepts</button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 md:min-h-0 md:grid-cols-[200px_1fr_400px]">
        <aside className="hidden min-h-0 overflow-auto border-r border-noc-edge md:block">
          <p className="h-label px-3 pt-3">{JOURNEYS[journey].title}</p>
          <StepList />
        </aside>

        <main className="flex flex-col md:min-h-0">
          {journey === 'hi' ? <MessageInput /> : <LatencyBar />}
          <div className="relative h-[52vh] min-h-[300px] border-y border-noc-edge md:h-auto md:flex-1">
            {loaded3d && (
              <div className={view === '3d' ? 'absolute inset-0' : 'hidden'}>
                <Suspense fallback={<div className="grid h-full place-items-center font-mono text-xs text-slate-500">loading 3D…</div>}>
                  <Scene3D active={view === '3d'} />
                </Suspense>
              </div>
            )}
            {view === '2d' && <Scene2D />}
            <ObjectTip />
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div className="panel max-w-md px-3 py-2">
                <div className="h-label text-noc-cyan">{step.short}</div>
                <div className="text-sm text-white">{step.title}</div>
              </div>
              {step.pdu && <div className="chip border-noc-green/60 bg-black/60 text-sm text-noc-green">{step.pdu}</div>}
            </div>
          </div>
          <Controls />
        </main>

        <aside className="border-noc-edge bg-noc-panel/40 md:min-h-0 md:overflow-auto md:border-l" aria-label="Step details">
          <SidePanel />
        </aside>
      </div>
      <Concepts />
      <p className="sr-only">Keyboard: left and right arrows change step, space plays or pauses.</p>
    </div>
  );
}
