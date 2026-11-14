import { createHash } from 'node:crypto';
import { DEFAULT_TIMING, type LoopTiming } from '@/features/screen/loop';
import type { LayoutId, Restaurant, ScreenLanguage, ThemeId } from '@/features/screen/types';
import type { Screen } from './schema';

/** Everything a TV needs to play, in one versioned document. The version is a hash of the content. */
export interface ScreenBundle {
  readonly version: string;
  readonly name: string;
  readonly layout: LayoutId;
  readonly theme: ThemeId;
  readonly language: ScreenLanguage;
  /** Only on bundles a TV saved before MT-28, which had no language. */
  readonly bilingual?: boolean;
  readonly timing: LoopTiming;
  readonly restaurant: Restaurant;
  readonly qrCodes: Readonly<Record<string, string>>;
  /**
   * When the server sent this copy, by the server's clock (epoch ms). Not part of the version: it only tells a TV,
   * after an offline reload, which of its saved copies (the page's own, the cached bundle) is newer.
   */
  readonly servedAt?: number;
}

const VERSION_LENGTH = 16;

/** The restaurant passed in is already what guests should see: today's sold-out items marked, hidden ones gone. */
export function buildBundle(screen: Screen, restaurant: Restaurant, qrCodes: Readonly<Record<string, string>>, servedAt?: number): ScreenBundle {
  const content = { name: screen.name, layout: screen.layout, theme: screen.theme, language: screen.language, timing: screen.timing ?? DEFAULT_TIMING, restaurant, qrCodes };
  const version = createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, VERSION_LENGTH);
  return { version, ...content, ...(servedAt === undefined ? {} : { servedAt }) };
}

/** A strong ETag for a bundle version, and a check of the TV's If-None-Match header against it. */
export function bundleEtag(version: string): string {
  return `"${version}"`;
}

export function isFresh(ifNoneMatch: string | null, version: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(',').some((tag) => tag.trim().replace(/^W\//, '') === bundleEtag(version));
}
