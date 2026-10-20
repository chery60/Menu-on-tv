import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OwnerFrame } from '@/components/owner/owner-frame';
import { card, heading, kicker } from '@/components/owner/ui';
import { formatIdentifier } from '@/features/accounts/identifier';
import { getAccountsRepository } from '@/features/accounts/repository';
import { requireRestaurant } from '@/features/accounts/session';
import { requestOrigin } from '@/lib/origin';
import { AddPersonForm, CancelInviteButton, RemovePersonButton, RestaurantDetailsForm } from './restaurant-forms';

export const metadata: Metadata = {
  title: 'Restaurant',
  robots: { index: false, follow: false },
};

const ROLE_NAMES = { owner: 'Owner', staff: 'Staff' } as const;

/** A link that opens the owner's own WhatsApp or email with the sign-in link written for them. They send it. */
function inviteLink(channel: 'phone' | 'email', destination: string, restaurant: string, signInUrl: string): { readonly href: string; readonly label: string } {
  const text = `You’ve been added to ${restaurant} on MenuOnTV. Sign in with this ${channel === 'phone' ? 'number' : 'email'} at ${signInUrl}`;
  if (channel === 'phone') return { href: `https://wa.me/${destination.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, label: 'Send the link on WhatsApp' };
  return { href: `mailto:${destination}?subject=${encodeURIComponent(`Join ${restaurant} on MenuOnTV`)}&body=${encodeURIComponent(text)}`, label: 'Email them the link' };
}

function who(phone: string | null, email: string | null): string {
  if (phone) return formatIdentifier({ channel: 'phone', value: phone });
  return email ?? 'Someone';
}

async function RestaurantContent() {
  const { restaurant, role, user } = await requireRestaurant('/studio/restaurant');
  const isOwner = role === 'owner';
  const [team, origin] = await Promise.all([isOwner ? getAccountsRepository().team(restaurant.id) : null, requestOrigin()]);
  const owners = team?.members.filter((member) => member.role === 'owner').length ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className={kicker}>{restaurant.name}</p>
        <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[0.95]">Restaurant.</h1>
      </div>

      <section aria-labelledby="details-title" className={card}>
        <h2 id="details-title" className={heading}>
          Details.
        </h2>
        {isOwner ? (
          <RestaurantDetailsForm name={restaurant.name} city={restaurant.city} tagline={restaurant.tagline} />
        ) : (
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-sm font-semibold text-night-dim">Name</dt>
              <dd className="font-semibold">{restaurant.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-night-dim">Area and city</dt>
              <dd>{restaurant.city}</dd>
            </div>
            <p className="text-sm text-night-dim">Only an owner can change these.</p>
          </dl>
        )}
      </section>

      {team ? (
        <section aria-labelledby="people-title" className={card}>
          <h2 id="people-title" className={heading}>
            People.
          </h2>
          <p className="mt-2 max-w-[44rem] text-night-soft">Everyone here signs in with their own number or email. Staff can mark dishes sold out and edit the menu. Owners can also change TVs, screens and people.</p>
          <ul className="mt-5 divide-y divide-hairline">
            {team.members.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">
                    {who(member.phone, member.email)}
                    {member.userId === user.id ? <span className="ml-2 text-sm font-normal text-night-dim">(you)</span> : null}
                  </p>
                  <p className="text-sm text-night-dim">{ROLE_NAMES[member.role]}</p>
                </div>
                {member.role === 'owner' && owners <= 1 ? (
                  <span className="text-sm text-night-dim">The only owner</span>
                ) : (
                  <RemovePersonButton userId={member.userId} who={who(member.phone, member.email)} isSelf={member.userId === user.id} />
                )}
              </li>
            ))}
            {team.invites.map((invite) => {
              const share = inviteLink(invite.channel, invite.destination, restaurant.name, `${origin}/sign-in`);
              const label = formatIdentifier({ channel: invite.channel, value: invite.destination });
              return (
                <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="text-sm text-night-dim">{ROLE_NAMES[invite.role]}, joins when they first sign in</p>
                    <a href={share.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-chutney-deep underline underline-offset-4">
                      {share.label}
                    </a>
                  </div>
                  <CancelInviteButton inviteId={invite.id} who={label} />
                </li>
              );
            })}
          </ul>
          <h3 className="mt-6 font-display text-[1.2rem]">Add someone.</h3>
          <AddPersonForm />
        </section>
      ) : null}
    </div>
  );
}

export default function RestaurantPage() {
  return (
    <OwnerFrame current="restaurant">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-panel bg-page" aria-label="Loading" />}>
        <RestaurantContent />
      </Suspense>
    </OwnerFrame>
  );
}
