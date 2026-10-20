import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { OwnerFrame } from '@/components/owner/owner-frame';
import { safeNextPath } from '@/features/accounts/next-path';
import { currentAccess, hasRestaurant } from '@/features/accounts/session';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

interface SignInPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Already signed in? Straight on to where they were going. */
async function SignInContent({ searchParams }: SignInPageProps) {
  const [query, access] = await Promise.all([searchParams, currentAccess()]);
  const next = safeNextPath(query.next);
  if (access) redirect(hasRestaurant(access) ? next : '/studio/setup');
  return <SignInForm next={next} />;
}

export default function SignInPage(props: SignInPageProps) {
  return (
    <OwnerFrame>
      <div className="mx-auto max-w-[28rem] rounded-panel border border-hairline bg-page p-6 sm:p-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-mist" aria-label="Loading" />}>
          <SignInContent {...props} />
        </Suspense>
      </div>
    </OwnerFrame>
  );
}
