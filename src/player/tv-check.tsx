import { useEffect, useState } from 'react';
import { tvVerdict, type TvReport, type TvVerdict } from '@/features/screens/tv-check';

/** How long a moving bar runs while frames are counted. */
const MEASURE_MS = 3_000;
/** A hidden tab never paints; give up on counting rather than wait forever. */
const GIVE_UP_MS = MEASURE_MS + 2_000;

const supports = (rule: string): boolean => typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(rule);

function countFrames(): Promise<number | null> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    let frames = 0;
    let start = 0;
    const giveUp = setTimeout(() => resolve(null), GIVE_UP_MS);
    const tick = (time: number): void => {
      if (!start) start = time;
      frames += 1;
      if (time - start < MEASURE_MS) {
        requestAnimationFrame(tick);
        return;
      }
      clearTimeout(giveUp);
      resolve(((frames - 1) * 1000) / (time - start));
    };
    requestAnimationFrame(tick);
  });
}

async function measure(): Promise<TvReport> {
  return {
    containerQueries: supports('container-type: size') && supports('width: 1cqw'),
    liveUpdates: typeof EventSource !== 'undefined',
    offline: 'serviceWorker' in navigator,
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    fps: await countFrames(),
  };
}

export function TvCheck({ pairUrl }: { readonly pairUrl: string }) {
  const [verdict, setVerdict] = useState<TvVerdict | null>(null);

  useEffect(() => {
    void measure().then((report) => setVerdict(tvVerdict(report)));
  }, []);

  if (!verdict) {
    return (
      <div className="scr-message scr-check" role="status">
        <p className="scr-message-title">Checking this TV.</p>
        <p className="scr-message-body">This takes a few seconds. Leave the remote for a moment.</p>
        <div className="scr-check-track" aria-hidden="true">
          <div className="scr-check-bar" />
        </div>
      </div>
    );
  }

  return (
    <div className={`scr-message scr-check is-${verdict.mark}`} role="status">
      <p className="scr-message-title">{verdict.headline}</p>
      <ul className="scr-check-lines">
        {verdict.lines.map((line) => (
          <li key={line.text} className={`scr-check-line is-${line.mark}`}>
            {line.text}
          </li>
        ))}
      </ul>
      {verdict.mark === 'bad' ? null : (
        <p className="scr-message-body">
          Next, open <strong>{pairUrl}</strong> on this TV to connect it.
        </p>
      )}
    </div>
  );
}
