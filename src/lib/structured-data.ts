import { absoluteUrl, siteConfig } from '@/config/site';
import { faq, pricing, type FaqEntry } from '@/content/site-content';

/** schema.org JSON-LD for the home page. It only describes what is actually on the page. */

export type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;

/** A FAQPage node; its questions must be the ones the page shows. */
export function faqPageJsonLd(items: readonly FaqEntry[]): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((entry) => ({ '@type': 'Question', name: entry.question, acceptedAnswer: { '@type': 'Answer', text: entry.answer } })),
  };
}

/** Home, then the page. */
export function breadcrumbJsonLd(page: { readonly name: string; readonly path: string }): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: page.name, item: absoluteUrl(page.path) },
    ],
  };
}

/** Wraps nodes in one JSON-LD document. */
export function pageJsonLd(...nodes: readonly JsonLd[]): JsonLd {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function homeJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: absoluteUrl('/icon.svg'),
        description: siteConfig.description,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.tagline,
        publisher: { '@id': ORGANIZATION_ID },
        inLanguage: 'en-IN',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteConfig.url}/#software`,
        name: siteConfig.name,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Digital menu boards and restaurant signage',
        operatingSystem: 'Any TV or device with a web browser',
        description: siteConfig.description,
        publisher: { '@id': ORGANIZATION_ID },
        offers: pricing.plans.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          price: plan.price.replace(/[^\d]/g, ''),
          priceCurrency: 'INR',
          description: `${plan.cadence}. ${plan.summary}`,
        })),
      },
      faqPageJsonLd(faq.items),
    ],
  };
}

/** JSON for a <script> tag: "<" is escaped so content can never close the tag early. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
