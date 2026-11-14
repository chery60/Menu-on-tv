import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { aboveTabBar } from '@/components/owner/ui';
import { SaveBar, type SaveStatus } from './save-bar';

function render(status: SaveStatus) {
  const html = renderToStaticMarkup(createElement(SaveBar, { status }));
  const wrapper = /^<div class="([^"]+)"/.exec(html)?.[1].split(' ') ?? [];
  return { html, wrapper };
}

describe('SaveBar', () => {
  it('sits above the phone tab bar, so owners see "Saved" and errors', () => {
    const { wrapper } = render({ kind: 'saved' });
    expect(wrapper).not.toContain('bottom-0');
    for (const name of aboveTabBar.split(' ')) expect(wrapper).toContain(name);
  });

  it('shows the saved line and the error, and keeps an empty status for screen readers only', () => {
    expect(render({ kind: 'saved' }).html).toContain('Saved. Your TVs update within seconds.');
    expect(render({ kind: 'error', message: 'Type a price in rupees, like 45.' }).html).toContain('role="alert"');
    expect(render({ kind: 'idle' }).html).toContain('sr-only');
  });
});
