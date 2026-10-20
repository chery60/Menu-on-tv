import { BookOpenText, LogOut, Store, Sun, Tv, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/brand-mark';
import { signOutAction } from '@/app/sign-in/actions';
import { siteConfig } from '@/config/site';

export type OwnerSection = 'today' | 'menu' | 'tvs' | 'restaurant';

interface Section {
  readonly id: OwnerSection;
  readonly href: string;
  readonly label: string;
  readonly Icon: LucideIcon;
}

/** The owner's four jobs, most frequent first: today's changes, the menu, the TVs, the restaurant. */
const SECTIONS: readonly Section[] = [
  { id: 'today', href: '/studio', label: 'Today', Icon: Sun },
  { id: 'menu', href: '/studio/menu', label: 'Menu', Icon: BookOpenText },
  { id: 'tvs', href: '/studio/tvs', label: 'TVs', Icon: Tv },
  { id: 'restaurant', href: '/studio/restaurant', label: 'Restaurant', Icon: Store },
];

const cell = 'flex h-full items-center gap-2 border-l border-hairline px-5 text-[0.95rem] font-medium transition-colors hover:bg-telly-soft';

/**
 * The owner app's frame, in the site's brand. On a computer the sections sit in the top bar as framed
 * cells, the way the site's bar does; on a phone they move to a tab bar under the thumb. Sign-in and
 * setup get the logo only.
 */
export function OwnerFrame({ current, children }: { readonly current?: OwnerSection; readonly children: ReactNode }) {
  return (
    <div className="site min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-hairline bg-mist/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1100px] items-stretch border-x border-hairline sm:h-16">
          <Link href={current ? '/studio' : '/'} aria-label={current ? 'Today' : `${siteConfig.name} home`} className="flex items-center px-4 sm:px-6">
            <BrandLogo />
          </Link>
          {current ? (
            <>
              <nav aria-label="Owner app" className="ml-auto hidden md:flex">
                {SECTIONS.map((section) => (
                  <Link key={section.id} href={section.href} aria-current={section.id === current ? 'page' : undefined} className={`${cell} ${section.id === current ? 'text-night' : 'text-night-soft'}`}>
                    {section.id === current ? <span aria-hidden="true" className="size-[7px] bg-chilli" /> : null}
                    {section.label}
                  </Link>
                ))}
              </nav>
              <form action={signOutAction} className="ml-auto flex md:ml-0">
                <button type="submit" className={`${cell} text-night-soft`}>
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Sign out</span>
                </button>
              </form>
            </>
          ) : null}
        </div>
      </header>

      <main className={`mx-auto max-w-[1100px] px-4 pt-6 sm:px-6 sm:pt-10 ${current ? 'pb-28 md:pb-16' : 'pb-16'}`}>{children}</main>

      {current ? (
        <nav aria-label="Owner app" className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-mist/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <ul className="grid grid-cols-4">
            {SECTIONS.map(({ id, href, label, Icon }) => (
              <li key={id} className="border-l border-hairline first:border-l-0">
                <Link href={href} aria-current={id === current ? 'page' : undefined} className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[0.78rem] font-semibold ${id === current ? 'text-night' : 'text-night-dim'}`}>
                  {id === current ? <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-chilli" /> : null}
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
