// Inline SVG icons (24x24). `fill` icons are solid, the rest are 2.4px line icons.
const FILL = {
  fire: 'M12 2c.6 3.4 5 5.4 5 10.2a5 5 0 0 1-10 0c0-1.8.7-3 1.7-4 .2 1.2.9 1.9 1.7 2.1-.3-3 .2-5.9 1.6-8.3z',
  bolt: 'M13.5 2L4.5 13.6h6L9.5 22l9-11.8h-6z',
  star: 'M12 2.8l2.8 5.7 6.3.9-4.55 4.43 1.07 6.27L12 17.1l-5.62 2.96 1.07-6.27L2.9 9.4l6.3-.9z',
  play: 'M8 5.2v13.6a.6.6 0 0 0 .9.5l11-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z',
}
const LINE = {
  freeze: 'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 6.5l2.5-2M9.5 19.5l2.5-2 2.5 2',
  book: 'M4 5.5c2.6-1 5.6-1 8 .6 2.4-1.6 5.4-1.6 8-.6V19c-2.6-1-5.6-1-8 .6-2.4-1.6-5.4-1.6-8-.6zM12 6.1v13.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
  down: 'M6 9.5l6 6 6-6',
  left: 'M14.5 5.5L8 12l6.5 6.5',
  right: 'M9.5 5.5L16 12l-6.5 6.5',
  close: 'M6 6l12 12M18 6L6 18',
  home: 'M3.5 10.5L12 3.5l8.5 7M5.5 9v11h13V9M10 20v-5h4v5',
  cal: 'M3.5 5h17v15.5h-17zM3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4',
  // subject marks: sigma, double-struck C, curly braces
  analiza: 'M18 5H6.5l6 7-6 7H18',
  algebra: 'M18 6.2A7.2 7.2 0 1 0 18 17.8M14.6 9.4a3.6 3.6 0 1 0 0 5.2',
  c: 'M9 4C6.5 4 6 5.2 6 7v2c0 1.5-.8 3-2 3 1.2 0 2 1.5 2 3v2c0 1.8.5 3 3 3M15 4c2.5 0 3 1.2 3 3v2c0 1.5.8 3 2 3-1.2 0-2 1.5-2 3v2c0 1.8-.5 3-3 3',
}

export type IconName = keyof typeof FILL | keyof typeof LINE

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const solid = name in FILL
  const d = solid ? FILL[name as keyof typeof FILL] : LINE[name as keyof typeof LINE]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill={solid ? 'currentColor' : 'none'} stroke={solid ? 'none' : 'currentColor'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
