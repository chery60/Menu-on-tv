import { describe, expect, it } from 'vitest';
import { safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it('keeps paths inside the owner app, with their query', () => {
    expect(safeNextPath('/studio')).toBe('/studio');
    expect(safeNextPath('/studio/menu')).toBe('/studio/menu');
    expect(safeNextPath('/studio?code=ABC234')).toBe('/studio?code=ABC234');
  });

  it('sends everything else home', () => {
    for (const value of ['https://evil.example', '//evil.example', '/studio//evil.example', '/\\evil.example', '/studiox', '/tracker', '/studio\n', null, 42, `/studio/${'a'.repeat(300)}`]) {
      expect(safeNextPath(value)).toBe('/studio');
    }
  });
});
