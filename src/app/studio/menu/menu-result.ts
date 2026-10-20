import type { Menu } from '@/features/menu/schema';

/** What a menu action returns: the latest menu, so the editor always shows what the TVs will. */
export interface MenuResult {
  readonly ok: boolean;
  readonly menu: Menu | null;
  readonly message?: string;
  /** The new item's id after "add item", so its photo can follow. */
  readonly createdId?: string;
}
