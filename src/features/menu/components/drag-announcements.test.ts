import { describe, expect, it } from 'vitest';
import { dishAnnouncements } from './drag-announcements';

const category = { name: 'Tea', items: [{ id: 'a', name: 'Adrak chai' }, { id: 'm', name: 'Masala chai' }, { id: 'k', name: 'Kesar chai' }] };
const node = (id: string) => ({ id, data: { current: undefined }, rect: { current: { initial: null, translated: null } } });
const say = dishAnnouncements(category);

describe('what a screen reader hears while moving a dish', () => {
  it('names the dish and its place, never an id', () => {
    expect(say.onDragStart({ active: node('m') } as never)).toBe('Picked up Masala chai, position 2 of 3 in Tea.');
    expect(say.onDragOver({ active: node('m'), over: node('k') } as never)).toBe('Masala chai is over position 3 of 3 in Tea.');
    expect(say.onDragEnd({ active: node('m'), over: node('k') } as never)).toBe('Masala chai moved to position 3 of 3 in Tea.');
    expect(say.onDragCancel({ active: node('m'), over: null } as never)).toBe('Moving Masala chai cancelled. It stays at position 2 of 3 in Tea.');
  });

  it('says where it is when it leaves the list', () => {
    expect(say.onDragOver({ active: node('m'), over: null } as never)).toBe('Masala chai is not over the list.');
    expect(say.onDragEnd({ active: node('m'), over: null } as never)).toBe('Masala chai stays at position 2 of 3 in Tea.');
  });
});
