interface MarkProps {
  readonly className?: string;
}

/** The MenuOnTV mark: a TV on its stand with three menu lines and their prices on the screen. */
export function BrandMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="26" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M16 23v4M10.5 27.5h11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 10.5h8M8 14h6M8 17.5h8.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M21.5 10.5h2M21.5 14h2M21.5 17.5h2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Mark plus wordmark. "On" is set in chilli, the TV's on-light (globals.css, `.brand-wordmark`). */
export function BrandLogo({ className = '' }: MarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className="size-7" />
      <span className="brand-wordmark">
        Menu<span className="brand-wordmark-on">On</span>TV
      </span>
    </span>
  );
}
