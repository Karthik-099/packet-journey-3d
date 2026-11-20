import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useState } from 'react';
import { useStore } from '../store';
import { HiScene } from './HiScene';
import { GoogleScene } from './GoogleScene';
import { useReducedMotion } from '../hooks';

/** Reads the journey inside the R3F tree so swaps happen in R3F's own reconciler, not the DOM commit. */
function SceneSwitch({ reduced }: { reduced: boolean }) {
  const journey = useStore((s) => s.journey);
  return journey === 'hi' ? <HiScene reduced={reduced} /> : <GoogleScene reduced={reduced} />;
}

/** Stays mounted once loaded so toggling 2.5D ⇄ 3D is instant; paused (frameloop never) while hidden. */
export default function Scene({ active }: { active: boolean }) {
  const set = useStore((s) => s.set);
  const reduced = useReducedMotion();
  const [fx, setFx] = useState(true);
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 6, 16], fov: 45, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => set({ tip: null })}
      aria-label="3D visualisation of the current step"
    >
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 25, 70]} />
      {/* drop bloom if the GPU can't hold the frame rate */}
      <PerformanceMonitor onDecline={() => setFx(false)} />
      <AdaptiveDpr pixelated />
      <Suspense fallback={null}>
        <SceneSwitch reduced={reduced} />
      </Suspense>
      {fx && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
