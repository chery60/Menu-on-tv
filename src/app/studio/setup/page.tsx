import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { OwnerFrame } from '@/components/owner/owner-frame';
import { formatIdentifier } from '@/features/accounts/identifier';
import { currentAccess } from '@/features/accounts/session';
import { signOutAction } from '../../sign-in/actions';
import { canReadMenuPhotos } from '@/features/menu/photo-reader';
import { SetupForm } from './setup-form';

export const metadata: Metadata = {
  title: 'Set up your restaurant',
  robots: { index: false, follow: false },
};

async function SetupContent() {
  const access = await currentAccess();
  if (!access) redirect('/sign-in?next=%2Fstudio%2Fsetup');
  if (access.restaurant) redirect('/studio');
  const signedInAs = access.user.phone ? formatIdentifier({ channel: 'phone', value: access.user.phone }) : (access.user.email ?? '');
  return (
    <>
      <h1 className="font-display text-[clamp(1.9rem,6vw,2.6rem)] leading-tight">Set up your restaurant.</h1>
      <div className="mt-3 text-night-soft">
        Signed in as <strong className="text-night">{signedInAs}</strong>.{' '}
        <form action={signOutAction} className="inline">
          <button type="submit" className="font-semibold text-night underline underline-offset-4">
            Not you? Sign out
          </button>
        </form>
      </div>
      <p className="mt-2 text-night-soft">You’ll be the owner. Add staff later from the Restaurant page.</p>
      <p className="mt-2 text-sm text-night-dim">Joining a restaurant someone else set up? Ask its owner to add your number, then sign in again.</p>
      <SetupForm canReadPhotos={canReadMenuPhotos()} />
    </>
  );
}

export default function SetupPage() {
  return (
    <OwnerFrame>
      <div className="mx-auto max-w-[32rem] rounded-panel border border-hairline bg-page p-6 sm:p-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-mist" aria-label="Loading" />}>
          <SetupContent />
        </Suspense>
      </div>
    </OwnerFrame>
  );
}
