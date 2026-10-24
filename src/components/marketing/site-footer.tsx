import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { footer, hero } from '@/content/site-content';

const GUIDES = [26, 70, 114];

/** The wordmark in construction lines, the way the drawings on the page were made. */
function Wordmark() {
  return (
    <svg className="mtv-wordmark" viewBox="0 0 1200 140" aria-hidden="true" focusable="false">
      {GUIDES.map((y) => (
        <line key={y} className="mtv-wordmark-guide" x1="0" y1={y} x2="1200" y2={y} />
      ))}
      <text x="600" y="122" textAnchor="middle" fontSize="150" textLength="1180" lengthAdjust="spacingAndGlyphs">
        {siteConfig.name}
      </text>
      <rect className="mtv-wordmark-dot" x="1176" y="10" width="14" height="14" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mtv-footer">
      <div className="mtv-sheet">
        <div className="mtv-footer-top">
          <div>
            <p className="mtv-footer-title">{hero.title}</p>
            <p className="mtv-body mtv-footer-note">{hero.note}</p>
          </div>
          <div>
            <p className="mtv-mono">Product</p>
            <ul className="mtv-footer-list">
              {siteConfig.nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mtv-mono">Guides</p>
            <ul className="mtv-footer-list">
              {siteConfig.guides.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mtv-mono">Owners</p>
            <ul className="mtv-footer-list">
              <li>
                <Link href={siteConfig.ownerSignIn.href}>{siteConfig.ownerSignIn.label}</Link>
              </li>
              <li>
                <Link href="/#early-access">{hero.primary.label}</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mtv-mono">For assistants</p>
            <ul className="mtv-footer-list">
              {siteConfig.agentFiles.map((file) => (
                <li key={file.href}>
                  <a href={file.href}>{file.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Wordmark />
        <div className="mtv-footer-base">
          <p className="mtv-mono">{footer.line}</p>
          <p className="mtv-mono">© {siteConfig.name}</p>
        </div>
      </div>
    </footer>
  );
}
