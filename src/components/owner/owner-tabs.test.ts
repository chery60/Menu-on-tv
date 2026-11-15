// @vitest-environment jsdom
/**
 * QA checks for MT-26 slice 3's Promos tab (docs/prd/mt-26-promo-studio.md, Design "Promos tab" and
 * "How we'll know it works" 1): five tabs, Today, Menu, Promos, TVs, Restaurant, with a megaphone on Promos,
 * and Promos one tap from every owner page. The 75px width on a 375px phone is measured in a browser walk;
 * here the phone bar only has to split into five equal columns.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OwnerFrame, type OwnerSection } from './owner-frame';

vi.mock('@/app/sign-in/actions', () => ({ signOutAction: async () => undefined }));

const TABS = [
  { id: 'today', label: 'Today', href: '/studio' },
  { id: 'menu', label: 'Menu', href: '/studio/menu' },
  { id: 'promos', label: 'Promos', href: '/studio/promos' },
  { id: 'tvs', label: 'TVs', href: '/studio/tvs' },
  { id: 'restaurant', label: 'Restaurant', href: '/studio/restaurant' },
] as const;

function frame(current: OwnerSection): { readonly phone: HTMLElement; readonly computer: HTMLElement } {
  document.body.innerHTML = renderToStaticMarkup(OwnerFrame({ current, children: 'page' }));
  const [computer, phone] = Array.from(document.querySelectorAll<HTMLElement>('nav[aria-label="Owner app"]'));
  return { phone, computer };
}

const links = (nav: HTMLElement) => Array.from(nav.querySelectorAll('a')).map((link) => ({ label: link.textContent?.trim(), href: link.getAttribute('href'), current: link.getAttribute('aria-current') }));

describe('the owner app’s tabs', () => {
  it.each(TABS.map((tab) => tab.id))('from %s, the phone bar and the computer bar both offer the five tabs in order, Promos among them', (current) => {
    const { phone, computer } = frame(current);
    for (const nav of [phone, computer]) {
      expect(links(nav)).toEqual(TABS.map((tab) => ({ label: tab.label, href: tab.href, current: tab.id === current ? 'page' : null })));
    }
  });

  it('marks Promos as the page you are on, with a megaphone on its phone tab', () => {
    const { phone } = frame('promos');
    const promos = phone.querySelector('a[href="/studio/promos"]');
    expect(promos?.getAttribute('aria-current')).toBe('page');
    expect(promos?.querySelector('svg.lucide-megaphone')).not.toBeNull();
  });

  it('splits the phone bar into five equal columns, 75px each at 375px', () => {
    const { phone } = frame('promos');
    const list = phone.querySelector('ul');
    expect(list?.children).toHaveLength(5);
    expect(list?.className.split(/\s+/)).toContain('grid-cols-5');
  });
});
