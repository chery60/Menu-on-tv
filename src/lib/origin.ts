import 'server-only';
import { headers } from 'next/headers';
import { siteConfig } from '@/config/site';

/** The origin this request came in on, so links work on any port or preview domain. Falls back to the site URL. */
export async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get('x-forwarded-host') ?? list.get('host');
  if (!host || !/^[A-Za-z0-9.-]+(:\d+)?$/.test(host)) return siteConfig.url;
  const proto = list.get('x-forwarded-proto') === 'https' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'https' : 'http';
  return `${proto}://${host}`;
}
