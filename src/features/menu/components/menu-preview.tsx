'use client';

import { useMemo } from 'react';
import { ScreenStage } from '@/features/screen/components/screen-stage';
import type { LoopTiming } from '@/features/screen/loop';
import type { LayoutId, ThemeId } from '@/features/screen/types';
import type { LocalClock } from '@/lib/local-date';
import type { Menu } from '../schema';
import { screenRestaurant, type ScreenProfile } from '../to-screen';

export interface PreviewScreen {
  readonly name: string;
  readonly layout: LayoutId;
  readonly theme: ThemeId;
  readonly bilingual: boolean;
  readonly timing?: LoopTiming;
}

/** The menu as a TV will play it, from the same code the TVs run, updating as the owner edits. */
export function MenuPreview({ menu, clock, profile, screen }: { readonly menu: Menu; readonly clock: LocalClock; readonly profile: ScreenProfile; readonly screen: PreviewScreen }) {
  const restaurant = useMemo(() => screenRestaurant(profile, menu, clock), [profile, menu, clock]);
  const portrait = screen.layout === 'portrait';
  return (
    <div className={`mx-auto overflow-hidden rounded-card border-4 border-night bg-night ${portrait ? 'aspect-[9/16] max-w-[18rem]' : 'aspect-video'}`}>
      <ScreenStage restaurant={restaurant} layout={screen.layout} theme={screen.theme} bilingual={screen.bilingual} timing={screen.timing} label={`Preview of ${screen.name}`} />
    </div>
  );
}
