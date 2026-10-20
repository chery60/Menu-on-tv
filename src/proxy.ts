import { NextResponse, type NextRequest } from 'next/server';
import { markdownPathFor } from '@/config/site';
import { SESSION_COOKIE } from '@/features/accounts/cookie';
import { checkBasicAuth } from '@/lib/basic-auth';

const TRACKER_REALM = 'MenuOnTV team';

/** The internal roadmap, behind one team password. */
function isTrackerPath(pathname: string): boolean {
  return pathname === '/tracker' || pathname.startsWith('/tracker/') || pathname.startsWith('/api/tracker');
}

/** The owner app. Without a session cookie, go straight to sign-in; pages and actions still check the session itself. */
function isOwnerAppPath(pathname: string): boolean {
  return pathname === '/studio' || pathname.startsWith('/studio/');
}

function prefersMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/markdown') && !accept.includes('text/html');
}

function guardTracker(request: NextRequest): NextResponse {
  const password = process.env.TRACKER_PASSWORD;

  if (!password) {
    // Secure by default: an unprotected tracker never ships to production.
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('This page is locked. Set TRACKER_PASSWORD to open it.', { status: 503 });
    }
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  if (!checkBasicAuth(request.headers.get('authorization'), password)) {
    return new NextResponse('Sign in with the team password to open this page.', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${TRACKER_REALM}", charset="UTF-8"` },
    });
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const markdownPath = markdownPathFor(pathname);
  if (markdownPath && prefersMarkdown(request)) {
    return NextResponse.rewrite(new URL(markdownPath, request.url));
  }

  if (isTrackerPath(pathname)) {
    return guardTracker(request);
  }

  if (isOwnerAppPath(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    const signIn = new URL('/sign-in', request.url);
    signIn.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  // Static strings only: Next reads the matcher at build time. Keep in step with siteConfig.pages.
  matcher: ['/', '/how-it-works', '/pricing', '/demo', '/tracker', '/tracker/:path*', '/api/tracker/:path*', '/studio', '/studio/:path*'],
};
