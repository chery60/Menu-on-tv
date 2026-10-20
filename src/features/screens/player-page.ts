import type { ScreenBundle } from './bundle';

/**
 * The HTML a TV's link returns (ADR-005): the standalone player's one stylesheet and one script, built by
 * scripts/build-player.mjs into public/player, and the screen it should play as JSON. No framework runtime.
 * The file names are fixed; the TV revalidates them on load and its service worker fetches them network first.
 */

export const PLAYER_ASSETS = { css: '/player/player.css', js: '/player/player.js' } as const;

export interface PlayerData {
  readonly token: string;
  readonly bundle: ScreenBundle;
  readonly pairUrl: string;
}

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON that is safe inside a script element: nothing in it can close the tag or open a comment. */
const scriptJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function page(head: string, body: string, title = 'Screen'): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<link rel="stylesheet" href="${PLAYER_ASSETS.css}">
${head}</head>
<body>${body}</body>
</html>
`;
}

export function playerPage(data: PlayerData): string {
  return page(`<script id="screen-data" type="application/json">${scriptJson(data)}</script>\n<script defer src="${PLAYER_ASSETS.js}"></script>\n`, '<div id="screen"></div>');
}

/** Shown on a TV whose link was removed or rotated; it needs no script. */
export function linkGonePage(pairUrl: string): string {
  return page(
    '',
    `<div class="scr-message" role="alert"><p class="scr-message-title">This screen link no longer works.</p><p class="scr-message-body">Open <strong>${escapeHtml(pairUrl)}</strong> on this TV to connect it again.</p></div>`,
  );
}

/**
 * /tv-check (MT-12): the same player bundle measures the TV and replaces this message with a verdict.
 * A browser too old to run the bundle never replaces it, so the message says so itself.
 */
export function tvCheckPage(pairUrl: string): string {
  return page(
    `<script id="tv-check-data" type="application/json">${scriptJson({ pairUrl })}</script>\n<script defer src="${PLAYER_ASSETS.js}"></script>\n`,
    `<div id="tv-check" class="scr-message" role="status"><p class="scr-message-title">Checking this TV.</p><p class="scr-message-body">If this message stays, this TV’s browser is too old for MenuOnTV. Plug in a streaming stick and open MenuOnTV in its browser instead.</p></div>`,
    'Check this TV · MenuOnTV',
  );
}
