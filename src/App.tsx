import { lazy, Suspense, useState } from 'react';
import { JOURNEYS, JOURNEY_MENU, resolve } from './content';
import { useCtx, useStore } from './store';
import { useDeepLink, usePlayback, useShortcuts } from './hooks';
import { Controls } from './components/Controls';
import { StepList } from './components/StepList';
import { SidePanel } from './components/SidePanel';
import { LatencyBar } from './components/LatencyBar';
import { MessageInput } from './components/MessageInput';
import { Concepts } from './components/Concepts';
import { ObjectTip } from './components/ObjectTip';
import { TargetBar } from './components/TargetBar';
import { Seg } from './components/ui';
import { Logo } from './site/Logo';
import { Search } from './site/Search';
import { ThemeToggle } from './site/ThemeToggle';
import { TripHud } from './components/TripSummary';
import { StoryCard } from './components/StoryCard';
import { Help } from './components/Help';
import { LocationPrompt } from './components/LocationPrompt';
import { Onboarding } from './components/Onboarding';
import { Scene2D } from './scene/Scene2D';

const Scene3D = lazy(() => import('./scene/Scene'));
const DOCS = `${import.meta.env.BASE_URL}learn.html`;
const HOME = import.meta.env.BASE_URL;

export default function App() {
  usePlayback();
  useDeepLink();
  useShortcuts();
  const { journey, mode, view, set, setJourney } = useStore();
  const c = useCtx();
  // once 3D has been shown keep it mounted (paused when hidden)
  const [loaded3d, setLoaded3d] = useState(view === '3d');
  if (view === '3d' && !loaded3d) setLoaded3d(true);
  return (
    <div className="app-bg flex min-h-full flex-col md:h-full">
      <header className="flex flex-wrap items-center gap-3 border-b border-noc-edge bg-noc-bg/80 px-4 py-2.5 backdrop-blur">
        <a href={HOME} className="flex items-center gap-2" aria-label="Packet Journey home">
          <h1 className="sr-only">Packet Journey</h1>
          <Logo dark />
        </a>
        <Seg label="Journey" value={journey} onChange={(j) => setJourney(j)} options={JOURNEY_MENU} />
        {journey === 'google' ? <TargetBar /> : <div className="flex-1" />}
        <div className="flex flex-wrap items-center gap-2">
          <Seg label="Detail level" value={mode} onChange={(m) => set({ mode: m })} options={[{ v: 'beginner', l: 'Beginner' }, { v: 'expert', l: 'Expert' }]} />
          <Seg label="View" value={view} onChange={(v) => set({ view: v })} options={[{ v: '3d', l: '3D' }, { v: '2d', l: '2.5D' }]} />
          <Search dark />
          <ThemeToggle className="border-noc-edge bg-noc-panel text-slate-300 hover:border-noc-cyan/70 hover:text-white" />
          <button className="btn" onClick={() => set({ guideOpen: true })}>Guide</button>
          <button className="btn" onClick={() => set({ conceptsOpen: true })}>Concepts</button>
          <a className="btn btn-on" href={DOCS}>Learn</a>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 md:min-h-0 md:grid-cols-[210px_1fr_410px]">
        <aside className="hidden min-h-0 overflow-auto border-r border-noc-edge md:block">
          <p className="h-label px-3 pt-3 normal-case tracking-normal text-slate-300">{resolve(JOURNEYS[journey].title, c)}</p>
          <StepList />
        </aside>

        <main className="flex flex-col md:min-h-0">
          {journey === 'hi' ? <MessageInput /> : <LatencyBar />}
          <div className="keep-dark relative h-[52vh] min-h-[300px] border-y border-noc-edge md:h-auto md:flex-1">
            {loaded3d && (
              <div className={view === '3d' ? 'absolute inset-0' : 'hidden'}>
                <Suspense fallback={<div className="grid h-full place-items-center font-mono text-xs text-slate-500">loading 3D world…</div>}>
                  <Scene3D active={view === '3d'} />
                </Suspense>
              </div>
            )}
            {view === '2d' && <Scene2D />}
            <ObjectTip />
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <StoryCard />
              {journey === 'google' && <TripHud c={c} />}
            </div>
          </div>
          <Controls />
        </main>

        <aside className="border-noc-edge bg-noc-panel/40 md:min-h-0 md:overflow-auto md:border-l" aria-label="Step details">
          <SidePanel />
        </aside>
      </div>
      <Concepts />
      <Help />
      <LocationPrompt />
      <Onboarding />
      <p className="sr-only">Keyboard: left and right arrows change step, space plays or pauses.</p>
    </div>
  );
}
