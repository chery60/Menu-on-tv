import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-mark';
import { siteConfig } from '@/config/site';
import { hero } from '@/content/site-content';
import { NavLinks, NavMenu } from './nav-links';

/**
 * The site's one bar: a row of framed cells, the same on every page and at every scroll position
 * (site.css). On phones the links fold into a sheet under the bar.
 */
export function SiteHeader() {
  return (
    <header className="mtv-nav">
      <div className="mtv-nav-bar">
        <Link href="/" aria-label={`${siteConfig.name} home`} className="mtv-nav-brand">
          <BrandLogo />
        </Link>
        <NavLinks />
        <Link href={siteConfig.ownerSignIn.href} className="mtv-nav-cell mtv-nav-signin">
          <span className="mtv-nav-signin-long">{siteConfig.ownerSignIn.label}</span>
          <span className="mtv-nav-signin-short">{siteConfig.ownerSignIn.short}</span>
        </Link>
        <a href={hero.primary.href} className="mtv-nav-cell mtv-nav-cta">
          {hero.primary.label}
          <ArrowRight aria-hidden="true" />
        </a>
        <NavMenu />
      </div>
    </header>
  );
}
