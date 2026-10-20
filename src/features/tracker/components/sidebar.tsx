'use client';

import { ExternalLink, Kanban, Menu, Monitor, Moon, Sun, Table2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { TellyGlyph } from '@/components/brand/logo';
import { useLocalPreference } from '../client/use-local-preference';
import { TRACKER_DOCS } from '../docs/links';

const THEME_KEY = 'mt-theme';
type Theme = 'system' | 'light' | 'dark';
const THEMES: readonly (readonly [Theme, string, typeof Sun])[] = [
  ['system', 'Match system', Monitor],
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
];

/** Applies the theme to <html>; the inline bootstrap script in the root layout does the same on load. */
function setDocumentTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

function ThemeToggle() {
  const [stored, setStored] = useLocalPreference(THEME_KEY);
  const theme: Theme = stored === 'light' || stored === 'dark' ? stored : 'system';

  const choose = (value: Theme): void => {
    setDocumentTheme(value);
    setStored(value === 'system' ? null : value);
  };

  return (
    <div role="group" aria-label="Theme" className="flex rounded-md border border-rule p-0.5">
      {THEMES.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={`grid h-7 flex-1 place-items-center rounded ${theme === value ? 'bg-hover text-ink' : 'text-ink-faint hover:text-ink'}`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

interface NavLinkProps {
  readonly href: string;
  readonly active: boolean;
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly onNavigate: () => void;
}

function NavLink({ href, active, icon, children, onNavigate }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`flex h-8 items-center gap-2 rounded-md px-2 text-sm ${active ? 'bg-hover font-medium text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'}`}
    >
      <span className="grid w-5 shrink-0 place-items-center">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function TrackerSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeMenu = (): void => setOpen(false);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-rule bg-paper px-3 md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid size-8 place-items-center rounded-md text-ink hover:bg-hover"
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
        <span className="text-sm font-medium text-ink">MenuOnTV HQ</span>
      </div>

      {open ? <div aria-hidden="true" onClick={closeMenu} className="fixed inset-0 z-40 bg-black/30 md:hidden" /> : null}

      <aside
        aria-label="Tracker navigation"
        className={`${open ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} h-dvh w-[264px] shrink-0 flex-col border-r border-rule bg-sidebar md:sticky md:top-0 md:z-auto md:flex md:w-[248px]`}
      >
        <div className="flex h-12 items-center gap-2 px-3">
          <TellyGlyph className="size-5 text-ink" />
          <span className="text-sm font-semibold text-ink">MenuOnTV HQ</span>
          <span className="ml-1 rounded bg-hover px-1.5 py-0.5 text-[10px] font-medium text-ink-dim">Internal</span>
          <button type="button" aria-label="Close navigation" onClick={closeMenu} className="ml-auto grid size-7 place-items-center rounded-md text-ink-dim hover:bg-hover md:hidden">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 pt-3 pb-1 text-xs font-medium text-ink-faint">Workspace</p>
          <NavLink href="/tracker" active={pathname === '/tracker'} icon={<Kanban className="size-4" aria-hidden="true" />} onNavigate={closeMenu}>
            Roadmap board
          </NavLink>
          <NavLink href="/tracker?view=table" active={false} icon={<Table2 className="size-4" aria-hidden="true" />} onNavigate={closeMenu}>
            All features
          </NavLink>

          <p className="px-2 pt-5 pb-1 text-xs font-medium text-ink-faint">Plan documents</p>
          {TRACKER_DOCS.map((doc) => (
            <NavLink
              key={doc.slug}
              href={`/tracker/docs/${doc.slug}`}
              active={pathname === `/tracker/docs/${doc.slug}`}
              icon={<span aria-hidden="true">{doc.icon}</span>}
              onNavigate={closeMenu}
            >
              {doc.title}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-rule p-3">
          <ThemeToggle />
          <Link href="/" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-ink-dim hover:bg-hover hover:text-ink">
            <ExternalLink className="size-4" aria-hidden="true" />
            View the website
          </Link>
        </div>
      </aside>
    </>
  );
}
