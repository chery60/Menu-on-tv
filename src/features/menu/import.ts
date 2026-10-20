import { formatPaise, parseRupees } from './money';
import { itemInputSchema, MENU_LIMITS, type ItemInput, type MenuItemData } from './schema';

/**
 * Reads a menu the owner already has (a WhatsApp message, a billing export, cells copied from a spreadsheet)
 * into dishes they check before saving. It never guesses a price: a line it can't read cleanly is flagged.
 */

export interface ImportedPrice {
  readonly label: string;
  readonly paise: number;
}

/** A part of a dish a reader may be unsure of, so the preview can mark that field. */
export type ImportedField = 'name' | 'price' | 'category' | 'diet';

export interface ImportedItem {
  /** Where the dish was in what the owner pasted, counting from 1. */
  readonly line: number;
  /** The heading or category column above it; empty when there was none. */
  readonly category: string;
  readonly name: string;
  readonly nameHi: string;
  readonly prices: readonly ImportedPrice[];
  readonly diet: MenuItemData['diet'];
  /** Why the owner should look at this dish before saving it; null when it read cleanly. */
  readonly flag: string | null;
  /** The fields a photo reader was unsure of; the paste reader leaves this out. */
  readonly unsure?: readonly ImportedField[];
}

export type Cells = readonly string[];
type Diet = MenuItemData['diet'];

/** One dish above this is more likely a phone number or a year than a price. */
const HIGH_PAISE = 10_000 * 100;
const HEADER_ROWS = 10;

const NO_PRICE = 'No price found. Type the price.';
const NO_NAME = 'No dish name found. Type the name.';
const NAME_SIZES = 'Name each size, like Half and Full.';
const GUESSED_SIZES = 'Two prices. We called them Half and Full. Check the names.';
const LOOSE_SIZE = 'A size has no price next to it. Check the prices.';
const TOO_MANY = `More than ${MENU_LIMITS.sizes} prices. Keep up to ${MENU_LIMITS.sizes}.`;
const TWO_DISHES = 'This line may hold more than one dish. Check it.';
const TWICE = 'Listed twice. Remove one, or name its sizes.';
const LONG_NAME = `Shorten the name to ${MENU_LIMITS.name} characters.`;

/** Size words owners write next to prices, including short forms and Hinglish. */
const SIZE_WORDS: Readonly<Record<string, string>> = {
  half: 'Half', h: 'Half', hf: 'Half', adha: 'Half', aadha: 'Half',
  full: 'Full', f: 'Full', fl: 'Full', pura: 'Full', poora: 'Full',
  quarter: 'Quarter', qtr: 'Quarter', q: 'Quarter',
  small: 'Small', sm: 'Small', s: 'Small',
  medium: 'Medium', med: 'Medium', m: 'Medium',
  large: 'Large', lg: 'Large', l: 'Large',
  regular: 'Regular', reg: 'Regular',
  single: 'Single', double: 'Double', mini: 'Mini', jumbo: 'Jumbo',
};
const UNITS = 'ml|ltr|litre|kg|gms?|pcs?|pieces?|inch';
const UNIT = new RegExp(`^\\d+(?:\\.\\d+)?(?:${UNITS})$`, 'i');
const NONVEG = /\b(?:chicken|chikan|murgh?|mutton|lamb|goat|gosht|keema|kheema|fish|machli|machhi|prawns?|shrimps?|crabs?|lobster|eggs?|anda|omelett?e|beef|pork|bacon|ham|salami|pepperoni|sausages?|tuna|salmon|sea\s?food|meat|non[\s-]?veg)\b/i;
const DEVANAGARI = /[ऀ-ॿ]+(?:\s+[ऀ-ॿ]+)*/g;
/** Phone numbers and links: footers like "Call 98765 43210 to order", never dishes. */
const SKIP = /https?:\/\/|www\.|(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/i;
/** "[19/10/26, 10:15 am] Ramesh: " in front of messages copied from a WhatsApp chat. */
const CHAT_PREFIX = /^\[\d[^\]]{3,30}\]\s*[^:]{1,40}:\s*/;
const HEADING_MARK = /:\s*$|^\s*[*_]+[^*_]+[*_]+\s*:?\s*$|^\s*[-=#~]{2,}|[-=#~]{2,}\s*$|^\s*#/;
/**
 * Words menus use for their sections. A line made only of these (and "and", "&", "hot", "cold"...) is a
 * heading even between dishes: "Snacks" or "Chai and coffee" is, "Masala dosa" with its price missing is not.
 */
const SECTION_WORD = /^(?:and|&|\/|n|our|hot|cold|fresh|veg|non-veg|nonveg|today's|todays|special|specials|snacks?|starters?|appetizers?|mains?|main|course|beverages?|drinks?|chai|tea|teas|coffees?|bakes?|bakery|cakes?|desserts?|sweets?|mithai|combos?|meals?|thalis?|rolls?|wraps?|breads?|rotis?|rice|biryanis?|chinese|south|north|indian|chaat|coolers?|shakes?|juices?|soups?|salads?|sandwich(?:es)?|burgers?|pizzas?|pastas?|breakfast|lunch|dinner|sides?|add-ons?|addons?|extras?|tiffins?)$/;
const isSectionName = (name: string): boolean => {
  const words = name.toLowerCase().split(/[\s,]+/).filter(Boolean);
  return words.length > 0 && words.length <= 4 && words.every((word) => SECTION_WORD.test(word));
};
/** Commas, semicolons and bars between dishes on one line; a comma before three digits is part of a price. */
const DISH_BREAK = /\s*[;|]\s*|,(?!\d{3}(?!\d))\s*/;

const NAME_HEAD = /^(?:item|items|item name|name|dish|dishes|dish name|product|product name|menu item|particulars)$/;
const PRICE_HEAD = /\b(?:price|rate|mrp|amount|cost|rs)\b/;
const CATEGORY_HEAD = /\b(?:category|group|section|course)\b/;
const SIZE_HEAD = /\b(?:size|variant|variation|portion)\b/;
const DIET_HEAD = /\bveg\b|\bdiet|food type/;

type SizeToken = { readonly kind: 'size'; readonly raw: string; readonly label: string; readonly unit: boolean };
type Token = { readonly kind: 'price'; readonly raw: string; readonly paise: number | null; readonly marked: boolean } | SizeToken | { readonly kind: 'word'; readonly raw: string };

interface Size {
  readonly label: string;
  /** A pack size like "500ml", which belongs in the name when it is the only price. */
  readonly unit: string;
  readonly paise: number | null;
  readonly raw: string;
}

interface Read {
  readonly name: string;
  readonly nameHi: string;
  readonly prices: readonly ImportedPrice[];
  readonly flag: string | null;
  readonly priced: boolean;
  /** Some number on the line looked like a price, so it isn't a heading. */
  readonly numbers: boolean;
}

const isShouting = (text: string): boolean => /\p{Lu}.*\p{Lu}/u.test(text) && !/\p{Ll}/u.test(text);
/** A note in brackets, like "MITHAI (per kg)" or "Sweets (fresh daily)", doesn't change whether a line is a heading. */
const withoutNote = (text: string): string => text.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

function tidy(text: string): string {
  const name = text.replace(/\s+/g, ' ').replace(/^[\s\-–—:.,|/=#]+|[\s\-–—:.,|/=#]+$/g, '');
  return isShouting(withoutNote(name)) ? name.charAt(0) + name.slice(1).toLowerCase() : name;
}

function names(text: string): { readonly name: string; readonly nameHi: string } {
  const hindi = (text.match(DEVANAGARI) ?? []).join(' ');
  const latin = tidy(text.replace(DEVANAGARI, ' '));
  return latin ? { name: latin, nameHi: hindi } : { name: tidy(hindi), nameHi: '' };
}

function dietMark(text: string): Diet | null {
  if (/🔴|🟥|🟤|🔺|\(\s*(?:nv|non[\s-]?veg)\s*\)/iu.test(text)) return 'nonveg';
  if (/🟢|🟩|\(\s*(?:v|veg)\s*\)/iu.test(text)) return 'veg';
  return null;
}

function dietCell(text: string): Diet | null {
  if (/non|nv|egg|meat/i.test(text)) return 'nonveg';
  return /veg|^v$/i.test(text.trim()) ? 'veg' : null;
}

const guessDiet = (name: string): Diet => (NONVEG.test(name) ? 'nonveg' : 'veg');

/** Puts every way of writing rupees ("Rs. 80", "80/-", "₹ 1,200") as "₹80" and drops the decoration around a line. */
function normalize(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍⃣"*_~]/gu, ' ')
    .replace(/\(\s*(?:non[\s-]?veg|nv|veg|v)\s*\)/gi, ' ')
    .replace(/^\s*(?:[-•·▪◦➤►>+]+|\d{1,3}[.)])\s+/, '')
    .replace(/(?:(?:₹|\brs\.?|\binr)\s*)+(?=\d)/gi, '₹')
    .replace(/₹?(\d[\d,.]*)\s*(?:\/-|₹|\brs\b\.?|\binr\b)(?=\s|$)/gi, '₹$1')
    .replace(/\.{2,}|…/g, ' ')
    .replace(/(\d)\s*\/\s*(?=₹?\d)/g, '$1 ')
    .replace(/\b(half|full|quarter|qtr)\s+plate\b/gi, '$1')
    .replace(new RegExp(`(?<![(\\d.])(\\d+(?:\\.\\d+)?)\\s+(${UNITS})\\b`, 'gi'), '$1$2')
    .replace(/\d{1,3}(?:,\d{2})*,\d{3}(?!\d)/g, (amount) => amount.replace(/,/g, ''))
    .replace(/\s[-–—=|:@]+(?=\s)|[-–—=:@|,;]+(?=\s*₹?\d)|,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classify(raw: string): Token {
  const bare = raw.replace(/^[([]+|[)\].!]+$/g, '');
  if (/^₹?\d+(?:\.\d{1,2})?$/.test(bare)) return { kind: 'price', raw, paise: parseRupees(bare), marked: bare.startsWith('₹') };
  const size = SIZE_WORDS[bare.toLowerCase()];
  if (size) return { kind: 'size', raw, label: size, unit: false };
  if (UNIT.test(bare)) return { kind: 'size', raw, label: bare.replace(/^([\d.]+)/, '$1 ').toLowerCase(), unit: true };
  return { kind: 'word', raw };
}

/** Pairs sizes with prices, whether the owner wrote "half 180 full 320" or "180 half 320 full". */
function pairUp(tail: readonly Token[]): { readonly sizes: readonly Size[]; readonly loose: boolean } {
  const labelFirst = tail[0]?.kind === 'size';
  const sizes: Size[] = [];
  let pending: SizeToken | null = null;
  for (const token of tail) {
    if (token.kind === 'price') {
      sizes.push({ label: pending?.label ?? '', unit: pending?.unit ? pending.raw : '', paise: token.paise, raw: token.raw });
      pending = null;
    } else if (token.kind === 'size' && labelFirst) {
      pending = token;
    } else if (token.kind === 'size') {
      const last = sizes.at(-1);
      if (!last || last.label) return { sizes, loose: true };
      sizes[sizes.length - 1] = { ...last, label: token.label, unit: token.unit ? token.raw : '' };
    }
  }
  return { sizes, loose: pending !== null };
}

/** One dish: the name, then its prices and sizes at the end of the line. */
function readDish(text: string): Read {
  const tokens = text.split(' ').filter(Boolean).map(classify);
  const numbers = tokens.some((token) => token.kind === 'price');
  let start = tokens.length;
  while (start > 0 && tokens[start - 1].kind !== 'word') start -= 1;
  const tail = tokens.slice(start);
  if (!tail.some((token) => token.kind === 'price')) return { ...names(text), prices: [], flag: null, priced: false, numbers };
  // "Chicken 65 ₹220": with a ₹ on the line, an unmarked number before it belongs to the name.
  if (tail.some((token) => token.kind === 'price' && token.marked)) start += tail.findIndex((token) => token.kind === 'size' || (token.kind === 'price' && token.marked));

  const { sizes, loose } = pairUp(tokens.slice(start));
  const unit = sizes.length === 1 ? sizes[0].unit : '';
  const named = names([...tokens.slice(0, start).map((token) => token.raw), unit].join(' '));
  const unreadable = sizes.find((size) => size.paise === null);
  const prices = sizes.flatMap((size) => (size.paise === null ? [] : [{ label: unit ? '' : size.label, paise: size.paise }]));
  const guessed = prices.length === 2 && !prices[0].label && !prices[1].label && prices[0].paise < prices[1].paise;
  const flag = unreadable ? `Check the price “${unreadable.raw}”.` : loose ? LOOSE_SIZE : guessed ? GUESSED_SIZES : named.name.includes('₹') ? TWO_DISHES : null;
  return { ...named, prices: guessed ? [{ label: 'Half', paise: prices[0].paise }, { label: 'Full', paise: prices[1].paise }] : prices, flag, priced: true, numbers };
}

function readDishes(line: string): readonly Read[] {
  const parts = line.split(DISH_BREAK).filter((part) => part.trim());
  if (parts.length > 1) {
    const reads = parts.map((part) => readDish(normalize(part)));
    if (reads.every((read) => read.priced && read.name)) return reads;
  }
  return [readDish(normalize(line))];
}

/** Text, a line at a time. A line without a price is a heading when it starts a block or looks like one. */
function readLines(rows: readonly Cells[]): ImportedItem[] {
  const items: ImportedItem[] = [];
  let category = '';
  let blank = true;
  rows.forEach((cells, index) => {
    const raw = cells.map((cell) => cell.trim()).filter(Boolean).join(' ').replace(CHAT_PREFIX, '');
    const startsBlock = blank;
    blank = raw === '';
    if (blank || SKIP.test(raw)) return;
    const reads = readDishes(raw);
    const [first] = reads;
    if (!first.priced && !first.name) {
      blank = true; // a line of dashes or stars separates blocks
      return;
    }
    if (!first.priced && !first.numbers && first.name.length <= MENU_LIMITS.categoryName && (startsBlock || HEADING_MARK.test(raw) || isShouting(withoutNote(raw)) || isSectionName(withoutNote(first.name)))) {
      category = first.name;
      return;
    }
    const diet = dietMark(raw);
    items.push(...reads.map((read) => ({ line: index + 1, category, name: read.name, nameHi: read.nameHi, prices: read.prices, diet: diet ?? guessDiet(read.name), flag: read.flag })));
  });
  return items;
}

interface Columns {
  readonly name: number;
  readonly price: number;
  readonly category: number;
  readonly size: number;
  readonly diet: number;
  /** Columns headed by a size, like "Half" and "Full", holding that size's price. */
  readonly sizes: readonly { readonly index: number; readonly label: string }[];
}

function findHeader(rows: readonly Cells[]): { readonly at: number; readonly columns: Columns } | null {
  for (let at = 0; at < Math.min(rows.length, HEADER_ROWS); at += 1) {
    const heads = rows[at].map((cell) => cell.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim());
    const find = (pattern: RegExp, not?: RegExp) => heads.findIndex((head) => pattern.test(head) && !not?.test(head));
    const sizes = heads.flatMap((head, index) => (head.length > 1 && SIZE_WORDS[head] ? [{ index, label: SIZE_WORDS[head] }] : []));
    const columns = { name: find(NAME_HEAD), price: find(PRICE_HEAD), category: find(CATEGORY_HEAD), size: find(SIZE_HEAD, PRICE_HEAD), diet: find(DIET_HEAD), sizes };
    if (columns.name >= 0 && (columns.price >= 0 || sizes.length > 0)) return { at, columns };
  }
  return null;
}

/** A sheet with a header row: each column is read by what its header says it holds. */
function readTable(rows: readonly Cells[], { at, columns }: { readonly at: number; readonly columns: Columns }): ImportedItem[] {
  const items: ImportedItem[] = [];
  let category = '';
  rows.slice(at + 1).forEach((row, offset) => {
    const cell = (index: number): string => (index >= 0 ? (row[index] ?? '').trim() : '');
    const size = cell(columns.size);
    const priceCells = [
      ...(columns.price >= 0 ? [{ label: SIZE_WORDS[size.toLowerCase()] ?? tidy(size).slice(0, MENU_LIMITS.sizeLabel), text: cell(columns.price) }] : []),
      ...columns.sizes.map((column) => ({ label: column.label, text: cell(column.index) })),
    ].filter((price) => price.text);
    const named = names(cell(columns.name));
    if (!named.name && priceCells.length === 0) return;
    if (priceCells.length === 0 && columns.category < 0 && row.filter((value) => value.trim()).length === 1) {
      category = named.name;
      return;
    }
    // A row with a price but no name is another size of the dish above it.
    const name = named.name || (items.at(-1)?.name ?? '');
    const unreadable = priceCells.find((price) => parseRupees(price.text) === null);
    items.push({
      line: at + offset + 2,
      category: tidy(cell(columns.category)) || category,
      name,
      nameHi: named.nameHi,
      prices: priceCells.flatMap((price) => {
        const paise = parseRupees(price.text);
        return paise === null ? [] : [{ label: price.label, paise }];
      }),
      diet: dietCell(cell(columns.diet)) ?? guessDiet(name),
      flag: unreadable ? `Check the price “${unreadable.text}”.` : null,
    });
  });
  return items;
}

/** Joins a dish listed once per size ("Biryani, Half, 180" then "Biryani, Full, 320") into one dish. */
function joinSizes(items: readonly ImportedItem[]): ImportedItem[] {
  return items.reduce<ImportedItem[]>((joined, item) => {
    const at = joined.findIndex((other) => item.name !== '' && other.category === item.category && other.name.toLowerCase() === item.name.toLowerCase());
    if (at < 0) return [...joined, item];
    const first = joined[at];
    const labels = [...first.prices, ...item.prices].map((price) => price.label.toLowerCase());
    if (!labels.every(Boolean) || new Set(labels).size !== labels.length) return [...joined, { ...item, flag: item.flag ?? TWICE }];
    return joined.map((other, index) => (index === at ? { ...first, prices: [...first.prices, ...item.prices], flag: first.flag ?? item.flag } : other));
  }, []);
}

function flagFor(item: ImportedItem): string | null {
  if (item.flag) return item.flag;
  if (!item.name) return NO_NAME;
  if (item.prices.length === 0) return NO_PRICE;
  if (item.prices.length > MENU_LIMITS.sizes) return TOO_MANY;
  if (item.prices.length > 1 && item.prices.some((price) => !price.label)) return NAME_SIZES;
  if (item.name.length > MENU_LIMITS.name) return LONG_NAME;
  const high = item.prices.find((price) => price.paise >= HIGH_PAISE);
  return high ? `₹${formatPaise(high.paise)} looks high. Check the price.` : null;
}

/** Rows of cells from a spreadsheet, CSV or paste. A header row, if there is one, says which column is which. */
export function readMenuRows(rows: readonly Cells[]): ImportedItem[] {
  const header = findHeader(rows);
  return joinSizes(header ? readTable(rows, header) : readLines(rows)).map((item) => ({ ...item, flag: flagFor(item) }));
}

/** Splits CSV or tab-separated text into rows of cells. Quotes work as spreadsheets write them. */
export function parseDelimited(text: string, delimiter: ',' | '\t'): string[][] {
  const source = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let at = 0; at < source.length; at += 1) {
    const char = source[at];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (source[at + 1] === '"') {
        cell += '"';
        at += 1;
      } else quoted = false;
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[at + 1] === '\n') at += 1;
      rows.push([...row, cell]);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

/** What the owner pasted, or a CSV or text file: cells when it has tabs or a header row, else lines. */
export function parseMenuText(text: string): ImportedItem[] {
  const tabbed = text.includes('\t');
  const cells = parseDelimited(text, tabbed ? '\t' : ',');
  return readMenuRows(tabbed || findHeader(cells) ? cells : text.replace(/^﻿/, '').split(/\r?\n/).map((line) => [line]));
}

/** A dish as the menu stores it, or the first thing to fix, in the editor's words. */
export function toItemInput(dish: Pick<ImportedItem, 'name' | 'nameHi' | 'prices' | 'diet'>): { readonly input: ItemInput } | { readonly error: string } {
  const parsed = itemInputSchema.safeParse({ name: dish.name, nameHi: dish.nameHi, description: '', prices: dish.prices, diet: dish.diet, badges: [], kcal: null, serving: '', allergens: [] });
  return parsed.success ? { input: parsed.data } : { error: parsed.error.issues[0]?.message ?? 'Check this dish.' };
}
