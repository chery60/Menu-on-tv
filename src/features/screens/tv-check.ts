/**
 * "Will this TV work?" (tracker MT-12). /tv-check measures what the TV's browser can do, and this turns it into
 * plain words for an owner, or for the lab sheet in docs/tv-lab.md.
 */

export interface TvReport {
  /** CSS container units: every size on a screen is set in them, so without them a menu comes out the wrong size. */
  readonly containerQueries: boolean;
  /** Server-sent events: changes arrive in seconds; without them, at the next one-minute heartbeat. */
  readonly liveUpdates: boolean;
  /** A service worker: the TV can start playing without Wi-Fi. */
  readonly offline: boolean;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  /** Frames a second while a slide moves, or null when it couldn't be measured. */
  readonly fps: number | null;
}

export type Mark = 'good' | 'warn' | 'bad';

export interface TvCheckLine {
  readonly mark: Mark;
  readonly text: string;
}

export interface TvVerdict {
  readonly mark: Mark;
  readonly headline: string;
  readonly lines: readonly TvCheckLine[];
}

const FULL_HD_WIDTH = 1920;
const SHARP_ENOUGH = 1280;
/** Below this, slides visibly stutter as they change. */
const SMOOTH_FPS = 20;

function screenLine({ width, height, pixelRatio }: TvReport): TvCheckLine {
  const wide = Math.round(width * pixelRatio);
  const tall = Math.round(height * pixelRatio);
  const longSide = Math.max(wide, tall);
  if (longSide < SHARP_ENOUGH) return { mark: 'warn', text: `It draws only ${wide} by ${tall}. The menu fits, but text looks soft; a Full HD streaming stick is sharper.` };
  const standing = tall > wide;
  const quality = longSide >= FULL_HD_WIDTH ? 'Full HD' : 'HD';
  return { mark: 'good', text: standing ? `Sharp: it draws ${wide} by ${tall}, standing up. Choose the Portrait layout for it.` : `Sharp: it draws ${wide} by ${tall}, ${quality}.` };
}

export function tvVerdict(report: TvReport): TvVerdict {
  if (!report.containerQueries) {
    return {
      mark: 'bad',
      headline: 'This TV’s browser is too old to show your menu properly.',
      lines: [{ mark: 'bad', text: 'Menus would come out the wrong size. Plug a streaming stick into the TV and open MenuOnTV in the stick’s browser instead.' }],
    };
  }
  const lines: TvCheckLine[] = [
    screenLine(report),
    report.liveUpdates ? { mark: 'good', text: 'Changes from your phone show up in a few seconds.' } : { mark: 'warn', text: 'Changes from your phone show up within a minute, not seconds.' },
    report.offline ? { mark: 'good', text: 'It keeps your menu, so it can start even if the Wi-Fi is down.' } : { mark: 'warn', text: 'If the TV restarts without Wi-Fi, the menu waits until the Wi-Fi is back.' },
  ];
  if (report.fps !== null) {
    const fps = Math.round(report.fps);
    lines.push(fps >= SMOOTH_FPS ? { mark: 'good', text: `Smooth: ${fps} frames a second.` } : { mark: 'warn', text: `Slides may look jerky (${fps} frames a second). A streaming stick will be smoother.` });
  }
  const warned = lines.some((line) => line.mark === 'warn');
  return { mark: warned ? 'warn' : 'good', headline: warned ? 'Yes, this TV can show your menu. Read the notes below.' : 'Yes, this TV can show your menu.', lines };
}
