import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { menuReadingSchema, type MenuReading } from './photo-import';
import type { PhotoType } from './photos';

/**
 * Reads one menu photo with Claude (docs/accounts-and-menu.md, "Menu from a photo"). The answer comes back
 * in menuReadingSchema, validated by the SDK; photo-import.ts turns it into dishes for the owner to check.
 * The photo is sent once and kept nowhere.
 */

export const MENU_READER_MODEL = 'claude-opus-5-5';

/** Something the owner can act on, in their words. Any other error is a fault to log. */
export class MenuPhotoError extends Error {}

export interface MenuPhoto {
  readonly bytes: Uint8Array;
  readonly type: PhotoType;
}

export interface MenuReaderClient {
  readonly beta: { readonly messages: Pick<Anthropic['beta']['messages'], 'parse'> };
}

const INSTRUCTIONS = `You read photos of restaurant menus in India for MenuOnTV, which shows a restaurant's menu on its TV. The owner checks everything you return before guests see it, so mark doubt instead of guessing.

Return every dish on the menu in the order printed: top to bottom, and column by column from the left.
- category: the heading the dish sits under, as printed, like "Chai and coffee". Empty if the menu has no headings.
- name: the dish name as printed. Do not translate, correct or expand it. If the menu prints names in capitals, write them in title case, like "Masala Chai".
- nameHi: the name in Devanagari when the menu prints one; otherwise empty. Never translate.
- prices: in rupees, exactly as printed. One entry with an empty label for a single price. For sizes (half and full, small, medium and large, "180/320", or price columns such as "Half | Full"), one entry per size with its label as printed. If a price is missing, smudged, cut off or ambiguous, use null and add "price" to unsure. Never work out, round or guess a price. If an old price is struck out with a new one beside it, use the new one and add "price" to unsure.
- diet: "veg" or "nonveg" when the menu marks it (green or brown symbols, a veg or non-veg section) or the dish plainly contains chicken, mutton, meat, fish, prawn or egg ("nonveg"). Otherwise "unknown".
- unsure: every field that was hard to read, or that is your best reading rather than certain.

Skip what is not a dish: the restaurant's name, address, phone numbers, timings, tax notes, and offers or prices with no dish.
If the photo is not a menu, or is too blurred, dark or cut off to read, return no dishes and say why in problem, in one short plain sentence to the owner, like "The photo is too blurred to read. Take it again in good light." Otherwise leave problem empty.`;

/**
 * Whether this server has credentials the SDK can use: a key, a token, federation or a named profile.
 * Without any, the owner app offers paste instead of a reader that fails every time.
 * shortcut: a default profile file with none of these set reads as off; set ANTHROPIC_PROFILE to use it.
 */
export function canReadMenuPhotos(): boolean {
  const env = process.env;
  return Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_IDENTITY_TOKEN_FILE || env.ANTHROPIC_PROFILE || env.ANTHROPIC_CONFIG_DIR);
}

let shared: Anthropic | null = null;

/** One client per server; credentials come from ANTHROPIC_API_KEY (see .env.example). */
function defaultClient(): MenuReaderClient {
  shared ??= new Anthropic({ maxRetries: 1, timeout: 120_000 });
  return shared;
}

export async function readMenuPhoto(photo: MenuPhoto, client: MenuReaderClient = defaultClient()): Promise<MenuReading> {
  const response = await client.beta.messages.parse({
    model: MENU_READER_MODEL,
    max_tokens: 16_000,
    // If a safety check declines the photo, the API retries on another model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(menuReadingSchema) },
    system: INSTRUCTIONS,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: photo.type, data: Buffer.from(photo.bytes).toString('base64') } },
          { type: 'text', text: 'Read this menu.' },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') throw new MenuPhotoError('We couldn’t read that photo. Try another one, or paste your menu.');
  if (response.stop_reason === 'max_tokens') throw new MenuPhotoError('That photo has more dishes than we can read at once. Photograph one part of the menu at a time.');
  if (!response.parsed_output) throw new Error(`Menu reading did not match the schema (stop reason ${response.stop_reason}).`);
  return response.parsed_output;
}
