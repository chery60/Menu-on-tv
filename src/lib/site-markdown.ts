import { absoluteUrl, siteConfig } from '@/config/site';
import { comparison, earlyAccess, earn, faq, hero, howItWorks, layoutsSection, madeFor, pricing, problems, screenRules, why, type TextItem } from '@/content/site-content';
import { LAYOUTS } from '@/features/screen/types';

/**
 * Markdown copies of the public site for AI agents and search tools:
 * /llms.txt (a short index in the llms.txt format) and /index.md (the home page).
 * Both read the same content module as the HTML page, so they never drift.
 */

const bullet = (text: string): string => `- ${text}`;
const boldItem = (item: TextItem): string => bullet(`**${item.title}.** ${item.body}`);
const section = (title: string, lines: readonly string[]): string => [`## ${title}`, '', ...lines, ''].join('\n');

export const MARKDOWN_HEADERS = { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } as const;
export const PLAIN_TEXT_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } as const;

function summaryBlock(): string {
  return [
    `# ${siteConfig.name}`,
    '',
    `> ${siteConfig.name} turns the TV a restaurant already owns into a digital menu board that sells. Owners build the menu from a photo of their paper menu, open one link on the TV, and change prices, sold-out items and specials from a phone. Screens mix the menu with the restaurant's own promos, and later with local ads the owner approves and earns from. Free for one screen; built first for cafés, quick-service counters and bakeries in India.`,
    '',
  ].join('\n');
}

export function buildLlmsTxt(): string {
  return [
    summaryBlock(),
    'Status: early access. Pricing: free for one screen; Plus ₹499 and Pro ₹999 per screen per month (early-access prices).',
    '',
    section('Pages', [
      bullet(`[Home page](${absoluteUrl('/index.md')}): what ${siteConfig.name} is, why restaurants switch, how it works, the six layouts, pricing and questions.`),
      bullet(`[Live demo](${absoluteUrl('/demo')}): the sample café in 3D on a busy square, its menu playing on the TV in front of it.`),
      bullet(`[Live demo screen](${absoluteUrl('/screen/demo')}): the sample café running full screen, as a restaurant TV shows it. Add ?layout=board|split|spotlight|lbar|ticker|portrait, ?theme=night for the dark theme and ?lang=hi.`),
    ]),
    section('Key facts', [
      bullet('Works on any TV with a web browser, or any TV with an HDMI port and a small Android TV stick.'),
      bullet('Menus are stored as data: prices, veg and non-veg marks, Hindi names, calories and allergens.'),
      bullet('Screens keep playing the last menu offline and update within seconds when online.'),
      bullet('No cameras and no tracking of guests. Owners approve every ad and keep half of ad earnings (planned).'),
    ]),
    section('Optional', [bullet(`[Get early access](${absoluteUrl('/#early-access')}): restaurants can request their first screen.`)]),
  ].join('\n');
}

export function buildHomeMarkdown(): string {
  return [
    `# ${hero.title}`,
    '',
    hero.lead,
    '',
    hero.note,
    '',
    section(problems.title, [problems.lead, '', ...problems.items.map((item) => bullet(`**${item.title}** ${item.body}`))]),
    section(why.title, why.items.map(boldItem)),
    section(madeFor.title, madeFor.items.map(boldItem)),
    section(howItWorks.title, howItWorks.steps.map((step, index) => `${index + 1}. **${step.title}.** ${step.body}`)),
    section(layoutsSection.title, [layoutsSection.lead, '', ...LAYOUTS.map((layout) => bullet(`**${layout.name}.** ${layout.summary} Best for: ${layoutsSection.bestFor[layout.id].toLowerCase()}.`))]),
    section(screenRules.title, screenRules.items.map(boldItem)),
    section(earn.title, [earn.body, '', ...earn.points.map(bullet)]),
    section(pricing.title, [pricing.lead, '', ...pricing.plans.map((plan) => bullet(`**${plan.name}: ${plan.price} ${plan.cadence}.** ${plan.features.join('; ')}.`)), '', pricing.footnote]),
    section(comparison.title, [
      `| | ${comparison.columns.join(' | ')} |`,
      `| --- | ${comparison.columns.map(() => '---').join(' | ')} |`,
      ...comparison.rows.map((row) => `| ${row.join(' | ')} |`),
      '',
      comparison.note,
    ]),
    section(faq.title, faq.items.flatMap((entry) => [`### ${entry.question}`, '', entry.answer, ''])),
    section(earlyAccess.title, [earlyAccess.body, '', `Request a spot: ${absoluteUrl('/#early-access')}`]),
  ].join('\n');
}
