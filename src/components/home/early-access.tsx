import { WaitlistForm } from '@/components/marketing/waitlist-form';
import { earlyAccess } from '@/content/site-content';

/** The last band on every page: leave your details and we set up the first screen with you. */
export function EarlyAccess() {
  return (
    <section id="early-access" className="mtv-early mtv-night" aria-labelledby="early-title">
      <div className="mtv-sheet mtv-early-grid">
        <div>
          <h2 id="early-title" className="mtv-h2">
            {earlyAccess.title}
          </h2>
          <p className="mtv-lead">{earlyAccess.body}</p>
        </div>
        <WaitlistForm />
      </div>
    </section>
  );
}
