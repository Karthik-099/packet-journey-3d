/** Packet Journey mark: a packet's route turning hop by hop from source to destination. Same as public/favicon.svg. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="pj-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="12" fill="#04121f" />
      <rect x="2" y="2" width="60" height="60" rx="10" fill="none" stroke="#123047" strokeWidth="2" />
      <path d="M14 48 H26 V32 H38 V18 H50" fill="none" stroke="url(#pj-g)" strokeWidth="5" strokeLinecap="square" />
      <rect x="9" y="43" width="10" height="10" fill="#04121f" stroke="#34d399" strokeWidth="3" />
      <rect x="45" y="13" width="10" height="10" fill="#22d3ee" />
      <rect x="34" y="28" width="8" height="8" fill="#ecfeff" />
    </svg>
  );
}

/** Mark + two-line wordmark. `dark` = for dark backgrounds. */
export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[15px] font-bold uppercase leading-[0.95] tracking-[0.12em]">
        <span className={dark ? 'text-white' : 'text-ink'}>Packet</span>
        <br />
        <span className="text-teal-500">Journey</span>
      </span>
    </span>
  );
}
