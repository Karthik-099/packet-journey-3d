/** Minimal line icons (24×24, stroke = currentColor). No emoji, no icon font, no network. */
const PATHS = {
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21m0-18C9.5 5.5 8.2 8.5 8.2 12s1.3 6.5 3.8 9M3.5 9h17M3.5 15h17',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  gauge: 'M4 15a8 8 0 1 1 16 0M12 15l4-5M7 19h10',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2',
  satellite: 'm7 7 4 4M4 10l3-3 3 3-3 3-3-3Zm10 4 3-3 3 3-3 3-3-3Zm-3-3 3 3M14 21a7 7 0 0 0 7-7M14 17a3 3 0 0 0 3-3',
  play: 'M7 4.5v15l12-7.5-12-7.5Z',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Zm-3 9 2 2 4-4',
  terminal: 'M4 5h16v14H4zM7 9l3 3-3 3M12 15h5',
  cap: 'M2 9l10-5 10 5-10 5-10-5Zm4 2v5c3 2 9 2 12 0v-5',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  flask: 'M9 3h6M10 3v6L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3M7 14h10',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  upload: 'M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  scissors: 'M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.5 7.5 20 18M7.5 16.5 20 6',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
} as const;
export type IconName = keyof typeof PATHS;

export const Icon = ({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={PATHS[name]} />
  </svg>
);
