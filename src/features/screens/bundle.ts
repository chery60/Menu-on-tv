import { createHash } from 'node:crypto';
import { DEFAULT_TIMING, type LoopTiming } from '@/features/screen/loop';
import type { LayoutId, Restaurant, ThemeId } from '@/features/screen/types';
import type { Screen } from './schema';

/** Everything a TV needs to play, in one versioned document. The version is a hash of the content. */
export interface ScreenBundle {
  readonly version: string;
  readonly name: string;
  readonly layout: LayoutId;
  readonly theme: ThemeId;
  readonly bilingual: boolean;
  readonly timing: LoopTiming;
  readonly restaurant: Restaurant;
  readonly qrCodes: Readonly<Record<string, string>>;
}

const VERSION_LENGTH = 16;

/** The restaurant passed in is already what guests should see: today's sold-out items marked, hidden ones gone. */
export function buildBundle(screen: Screen, restaurant: Restaurant, qrCodes: Readonly<Record<string, string>>): ScreenBundle {
  const content = { name: screen.name, layout: screen.layout, theme: screen.theme, bilingual: screen.bilingual, timing: screen.timing ?? DEFAULT_TIMING, restaurant, qrCodes };
  const version = createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, VERSION_LENGTH);
  return { version, ...content };
}

/** A strong ETag for a bundle version, and a check of the TV's If-None-Match header against it. */
export function bundleEtag(version: string): string {
  return `"${version}"`;
}

export function isFresh(ifNoneMatch: string | null, version: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(',').some((tag) => tag.trim().replace(/^W\//, '') === bundleEtag(version));
}
