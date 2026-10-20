import { dataFilePath } from '@/lib/data-path';
import { openDocumentStore, type DocumentStore } from '@/lib/document-store';
import { emptyMenu } from './edit';
import { menusFileSchema, type Menu, type MenusFile } from './schema';

/** Storage boundary for each restaurant's menu. Every change runs on the latest copy, one at a time. */
export class FileMenusRepository {
  private readonly store: DocumentStore<MenusFile>;

  constructor(filePath: string) {
    this.store = openDocumentStore<MenusFile>({ name: 'menus', filePath, createInitial: () => ({ version: 1, menus: {} }), parse: (raw) => menusFileSchema.parse(raw) });
  }

  async get(restaurantId: string, now: Date): Promise<Menu> {
    return (await this.store.read()).menus[restaurantId] ?? emptyMenu(now);
  }

  /** Applies a change to the restaurant's latest menu. If the change throws, nothing is saved. */
  async update(restaurantId: string, change: (menu: Menu) => Menu, now: Date): Promise<Menu> {
    let saved: Menu = emptyMenu(now);
    await this.store.update((file) => {
      saved = change(file.menus[restaurantId] ?? emptyMenu(now));
      return { ...file, menus: { ...file.menus, [restaurantId]: saved } };
    });
    return saved;
  }
}

export function getMenusRepository(): FileMenusRepository {
  return new FileMenusRepository(dataFilePath('menus.json', process.env.MENUS_DATA_FILE));
}
