import type { Announcements, ScreenReaderInstructions, UniqueIdentifier } from '@dnd-kit/core';

/** What a screen reader hears while a dish is moved with the keyboard: its name and place, never dnd-kit's ids. */

interface DishList {
  readonly name: string;
  readonly items: readonly { readonly id: string; readonly name: string }[];
}

export const DISH_DRAG_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable: 'To move a dish, press Space or Enter, use the up and down arrows, then press Space or Enter again. Escape puts it back.',
};

export function dishAnnouncements(category: DishList): Announcements {
  const { items } = category;
  const name = (id: UniqueIdentifier): string => items.find((item) => item.id === id)?.name ?? 'The dish';
  const place = (id: UniqueIdentifier): string => `position ${items.findIndex((item) => item.id === id) + 1} of ${items.length} in ${category.name}`;
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}, ${place(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} is over ${place(over.id)}.` : `${name(active.id)} is not over the list.`),
    onDragEnd: ({ active, over }) => (over ? `${name(active.id)} moved to ${place(over.id)}.` : `${name(active.id)} stays at ${place(active.id)}.`),
    onDragCancel: ({ active }) => `Moving ${name(active.id)} cancelled. It stays at ${place(active.id)}.`,
  };
}
