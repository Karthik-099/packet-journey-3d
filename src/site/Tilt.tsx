import { useRef, type ReactNode } from 'react';

/** Card that tilts toward the cursor in 3D (disabled for reduced motion via CSS). */
export function Tilt({ children, className = '' }: { children: ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const r = el.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.current!.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 10}deg) translateZ(0)`;
    el.current!.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    el.current!.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const leave = () => {
    if (el.current) el.current.style.transform = '';
  };
  return (
    <div ref={el} onPointerMove={move} onPointerLeave={leave} className={`tilt relative transition-transform duration-200 ease-out motion-reduce:!transform-none ${className}`}>
      {children}
    </div>
  );
}
