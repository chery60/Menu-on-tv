import { buildHomeMarkdown, MARKDOWN_HEADERS } from '@/lib/site-markdown';

/** Markdown copy of the home page, linked with rel="alternate" type="text/markdown". */
export function GET(): Response {
  return new Response(buildHomeMarkdown(), { headers: MARKDOWN_HEADERS });
}
