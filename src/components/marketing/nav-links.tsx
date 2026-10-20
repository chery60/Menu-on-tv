'use client';

import { ArrowRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { hero } from '@/content/site-content';

const MENU_ID = 'site-menu';

/** The bar's links, one cell each. The page you are on carries a small chilli square. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="mtv-nav-links">
      <ul>
        {siteConfig.nav.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className="mtv-nav-cell">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * On phones: a menu button that opens the links in a sheet under the bar. It is the browser's own
 * popover, so Escape, a tap outside and the button's expanded state all work without code of ours.
 */
export function NavMenu() {
  const pathname = usePathname();
  const close = () => document.getElementById(MENU_ID)?.hidePopover();
  const links = [...siteConfig.nav, siteConfig.ownerSignIn];

  return (
    <>
      <button type="button" popoverTarget={MENU_ID} className="mtv-nav-toggle" aria-label="Menu">
        <Menu aria-hidden="true" />
      </button>
      <div id={MENU_ID} popover="auto" className="mtv-menu">
        <nav aria-label="Main">
          <ul>
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined} onClick={close}>
                  {item.label}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li>
              <a href={hero.primary.href} onClick={close} className="mtv-menu-cta">
                {hero.primary.label}
                <ArrowRight aria-hidden="true" />
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
