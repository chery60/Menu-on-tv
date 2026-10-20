import { tvCheckPage } from '@/features/screens/player-page';
import { requestOrigin } from '@/lib/origin';

/** "Will this TV work?" (MT-12): open it in a TV's browser. Plain HTML and the player bundle, like a TV's own link. */
export async function GET(): Promise<Response> {
  return new Response(tvCheckPage(`${await requestOrigin()}/pair`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
