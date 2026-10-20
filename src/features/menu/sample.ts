import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import type { Menu } from './schema';

/** The demo café's menu as an owner's editable menu, for owners who would rather change a menu than start one. */
export function sampleMenu(now: Date, newId: () => string): Menu {
  return {
    updatedAt: now.toISOString(),
    categories: DEMO_RESTAURANT.categories.map((category) => ({
      id: newId(),
      name: category.name,
      nameHi: category.nameHi ?? '',
      items: category.items.map((item) => ({
        id: newId(),
        name: item.name,
        nameHi: item.nameHi ?? '',
        description: item.description ?? '',
        prices: [{ label: '', paise: item.price * 100 }],
        diet: item.diet,
        badges: [...(item.badges ?? [])],
        kcal: item.kcal ?? null,
        serving: '',
        allergens: [],
        photo: null,
        emoji: item.emoji,
        soldOutOn: null,
        hidden: false,
      })),
    })),
  };
}
