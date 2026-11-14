import { describe, expect, it } from 'vitest';
import { isNewerBundle } from './newer-bundle';

describe('isNewerBundle', () => {
  it('takes the cached bundle over the menu in a page saved before it, after an offline reload', () => {
    // QA's repro: the page was saved at 03:22, the sold-out bundle cached at 03:24.
    const page = { version: 'b17b', servedAt: Date.parse('2026-11-15T03:22:00+05:30') };
    const cached = { version: 'e97d', servedAt: Date.parse('2026-11-15T03:24:00+05:30') };
    expect(isNewerBundle(cached, page)).toBe(true);
  });

  it('keeps the page’s menu when the cached bundle is older', () => {
    const page = { version: 'e97d', servedAt: 2_000 };
    expect(isNewerBundle({ version: 'b17b', servedAt: 1_000 }, page)).toBe(false);
  });

  it('ignores the same version, and takes a copy saved before servedAt existed, as before', () => {
    expect(isNewerBundle({ version: 'same', servedAt: 9_000 }, { version: 'same', servedAt: 1_000 })).toBe(false);
    expect(isNewerBundle({ version: 'new' }, { version: 'old', servedAt: 1_000 })).toBe(true);
    expect(isNewerBundle({ version: 'new', servedAt: 1_000 }, { version: 'old' })).toBe(true);
  });
});
