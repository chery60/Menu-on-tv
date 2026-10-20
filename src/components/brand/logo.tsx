interface GlyphProps {
  readonly className?: string;
}

/** The first mark: a little TV with rabbit-ear antennas and test-card bars. Still used by the tracker and the owner app until they move to BrandMark. */
export function TellyGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path d="M12 7 8 2.5M20 7l4-4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <rect x="2.5" y="7" width="27" height="20" rx="5.5" fill="currentColor" />
      <g>
        <rect x="6" y="10.5" width="3.4" height="13" fill="#ffd23f" />
        <rect x="9.4" y="10.5" width="3.4" height="13" fill="#3fd0e8" />
        <rect x="12.8" y="10.5" width="3.4" height="13" fill="#33c26b" />
        <rect x="16.2" y="10.5" width="3.4" height="13" fill="#e04fc2" />
        <rect x="19.6" y="10.5" width="3.4" height="13" fill="#e8392f" />
        <rect x="23" y="10.5" width="3" height="13" fill="#2f5be8" />
      </g>
      <path d="M9 27v2.5M23 27v2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Glyph plus wordmark, for the site header. */
export function Logo({ className }: GlyphProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <TellyGlyph className="size-8 text-night" />
      <span className="font-display text-[1.45rem] leading-none text-night">MenuOnTV</span>
    </span>
  );
}
