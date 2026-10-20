import { buildLlmsTxt, PLAIN_TEXT_HEADERS } from '@/lib/site-markdown';

export function GET(): Response {
  return new Response(buildLlmsTxt(), { headers: PLAIN_TEXT_HEADERS });
}
