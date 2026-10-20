import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import './site.css';
import './home.css';
import './pages.css';

interface MarketingLayoutProps {
  readonly children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="mtv-site min-h-dvh">
      {/* llms.txt discovery: point agents at the Markdown index for this page. */}
      <link rel="describedby" href="/llms.txt" type="text/markdown" />
      <a href="#main" className="mtv-skip">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
