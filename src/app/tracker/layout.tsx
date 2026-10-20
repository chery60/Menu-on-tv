import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { TrackerSidebar } from '@/features/tracker/components/sidebar';

export const metadata: Metadata = {
  title: { default: 'Tracker', template: '%s · Tracker' },
  robots: { index: false, follow: false, nocache: true },
};

interface TrackerLayoutProps {
  readonly children: ReactNode;
}

/** Same footprint as the sidebar, shown while the active route is resolved. */
function SidebarPlaceholder() {
  return (
    <>
      <div className="h-12 border-b border-rule bg-paper md:hidden" />
      <div className="hidden h-dvh w-[248px] shrink-0 border-r border-rule bg-sidebar md:block" />
    </>
  );
}

/** Applies the saved theme before the tracker paints. It lives here, not in <head>: see the root layout. */
const THEME_BOOTSTRAP =
  "try{var t=localStorage.getItem('mt-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

export default function TrackerLayout({ children }: TrackerLayoutProps) {
  return (
    <div className="tracker-root flex min-h-dvh flex-col md:flex-row">
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <Suspense fallback={<SidebarPlaceholder />}>
        <TrackerSidebar />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
