import { clockTime } from '@/features/menu/dayparts';
import { findItem } from '@/features/menu/edit';
import { formatPaise, parseRupees } from '@/features/menu/money';
import type { Menu } from '@/features/menu/schema';
import { formatRupees } from '@/features/screen/loop';
import { FESTIVALS, PROMO_LIMITS, type Festival, type Promo, type PromoTemplate } from '../schema';
import { promoDishes, type PromoProblem, type PromoStatus } from '../status';

/** The Promos page's form and list, in words for the owner (MT-26). Pure, so it is tested. */

export type TemplateChoice = PromoTemplate | 'special';

export const TEMPLATES: readonly { readonly id: TemplateChoice; readonly name: string; readonly line: string }[] = [
  { id: 'combo', name: 'Combo', line: 'Two to four dishes for one lower price.' },
  { id: 'happy-hour', name: 'Happy hour', line: 'One dish for less, at the times you pick.' },
  { id: 'new', name: 'New item', line: 'Show off a dish that just joined the menu.' },
  { id: 'festival', name: 'Festival', line: 'Diwali, Eid, Christmas and more, with up to two dishes.' },
  { id: 'special', name: 'Today’s special', line: 'One dish that plays first, until midnight.' },
  { id: 'scan', name: 'Scan the QR', line: 'A QR code that opens your link, like your ordering page.' },
];

export const templateName = (template: TemplateChoice): string => TEMPLATES.find((entry) => entry.id === template)?.name ?? template;

export interface PromoDraft {
  readonly template: PromoTemplate;
  readonly dishes: readonly { readonly itemId: string; readonly size: string }[];
  /** The deal price as typed, in rupees: combo and happy hour only. */
  readonly dealText: string;
  readonly headline: string;
  readonly line: string;
  readonly festival: Festival | null;
  readonly link: string;
  /** YYYY-MM-DDTHH:mm, or '' to start now. */
  readonly startsAt: string;
  /** YYYY-MM-DDTHH:mm, or '' for no end. */
  readonly endsAt: string;
  /** Only at certain times and days. */
  readonly timed: boolean;
  /** HH:mm, as a time field gives it. */
  readonly from: string;
  readonly to: string;
  readonly days: readonly number[];
  readonly countdown: boolean;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const pad = (value: number): string => String(value).padStart(2, '0');
const hhmm = (minute: number): string => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
const minutes = (time: string): number => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

export function emptyDraft(template: PromoTemplate): PromoDraft {
  return { template, dishes: [], dealText: '', headline: '', line: '', festival: null, link: '', startsAt: '', endsAt: '', timed: template === 'happy-hour', from: '15:00', to: '17:00', days: EVERY_DAY, countdown: false };
}

export function draftFrom(promo: Promo): PromoDraft {
  return {
    template: promo.template,
    dishes: promo.dishes,
    dealText: promo.dealPaise === null ? '' : formatPaise(promo.dealPaise),
    headline: promo.headline,
    line: promo.line,
    festival: promo.festival,
    link: promo.link ?? '',
    startsAt: promo.startsAt ?? '',
    endsAt: promo.endsAt ?? '',
    timed: promo.daypart !== null,
    from: promo.daypart ? hhmm(promo.daypart.from) : '15:00',
    to: promo.daypart ? hhmm(promo.daypart.to) : '17:00',
    days: promo.daypart?.days ?? EVERY_DAY,
    countdown: promo.countdown,
  };
}

/** The menu price of the chosen dishes, each in its chosen size. */
export function menuTotal(draft: Pick<PromoDraft, 'dishes'>, menu: Menu): number {
  return draft.dishes.reduce((total, { itemId, size }) => {
    const item = findItem(menu, itemId)?.item;
    const price = item?.prices.find((entry) => entry.label.toLowerCase() === size.toLowerCase()) ?? item?.prices[0];
    return total + (price?.paise ?? 0);
  }, 0);
}

const fits = (text: string): string | null => (text.length <= PROMO_LIMITS.headline ? text : null);

/** A headline from the dishes, short enough for every layout. */
export function suggestedHeadline(template: PromoTemplate, names: readonly string[], festival: Festival | null): string {
  switch (template) {
    case 'combo':
      return fits(names.join(' + ')) ?? `${names.length}-dish combo`;
    case 'happy-hour':
      return fits(`Happy hour: ${names[0] ?? ''}`) ?? 'Happy hour';
    case 'new':
      return fits(`New: ${names[0] ?? ''}`) ?? 'New on the menu';
    case 'festival':
      return festival ? `${FESTIVALS[festival]} specials` : 'Festival specials';
    case 'scan':
      return 'Scan for more';
  }
}

/** What the save action takes. A deal price that isn't rupees comes back as NaN, so the form can say so before sending. */
export function toInput(draft: PromoDraft) {
  const deal = draft.template === 'combo' || draft.template === 'happy-hour';
  return {
    template: draft.template,
    dishes: draft.dishes,
    dealPaise: deal ? (parseRupees(draft.dealText) ?? Number.NaN) : null,
    headline: draft.headline,
    line: draft.line,
    festival: draft.festival,
    link: draft.template === 'scan' ? draft.link.trim() : null,
    startsAt: draft.startsAt || null,
    endsAt: draft.endsAt || null,
    daypart: draft.timed ? { from: minutes(draft.from), to: minutes(draft.to), days: [...draft.days] } : null,
    countdown: draft.countdown && draft.endsAt !== '',
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon 16 Nov, 9 am" for an outlet time, YYYY-MM-DDTHH:mm. */
export function whenText(stamp: string): string {
  const [date, time] = stamp.split('T');
  const day = new Date(`${date}T00:00:00Z`);
  return `${DAYS[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}, ${clockTime(minutes(time))}`;
}

const rupees = (paise: number): string => `₹${formatRupees(paise / 100)}`;

function problemText(problem: PromoProblem): string {
  switch (problem.kind) {
    case 'dish-gone':
      return 'a dish is no longer on the menu';
    case 'dish-hidden':
      return `${problem.dish} is hidden from your TVs`;
    case 'size-gone':
      return `${problem.dish} has no “${problem.size}” size`;
    case 'deal-not-lower':
      return `the price isn’t lower than the menu’s ${rupees(problem.menuPaise)}`;
  }
}

export type StatusTone = 'live' | 'quiet' | 'warn';

export function statusLabel(status: PromoStatus): { readonly text: string; readonly tone: StatusTone } {
  switch (status.state) {
    case 'on-air':
      return { text: 'On air now', tone: 'live' };
    case 'starts':
      return { text: `Starts ${whenText(status.at)}`, tone: 'quiet' };
    case 'ended':
      return { text: 'Ended', tone: 'quiet' };
    case 'paused':
      return { text: 'Paused', tone: 'quiet' };
    case 'sold-out':
      return { text: `Sold out: ${status.dishes.join(', ')}`, tone: 'quiet' };
    case 'needs-fix':
      return { text: `Needs a fix: ${problemText(status.problem)}`, tone: 'warn' };
  }
}

const joinNames = (names: readonly string[]): string => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** "Combo: Samosa and Masala chai", from the menu as it is now. */
export function promoSummary(promo: Promo, menu: Menu): string {
  const names = promo.dishes.map(({ itemId }) => findItem(menu, itemId)?.item.name).filter((name): name is string => Boolean(name));
  const what = promo.template === 'festival' && promo.festival ? FESTIVALS[promo.festival] : promo.template === 'scan' ? (promo.link ?? '') : joinNames(names);
  return `${templateName(promo.template)}: ${what}`;
}

/** "₹45, menu ₹50" for a deal, the menu price otherwise, nothing for a QR. */
export function priceText(promo: Promo, menu: Menu): string {
  if (promo.template === 'scan' || promo.dishes.length === 0) return '';
  const found = promoDishes({ dishes: promo.dishes, dealPaise: null }, menu);
  if (!found.ok) return promo.dealPaise === null ? '' : rupees(promo.dealPaise);
  return promo.dealPaise === null ? rupees(found.menuPaise) : `${rupees(promo.dealPaise)}, menu ${rupees(found.menuPaise)}`;
}
