import { parseMenuText, readMenuRows, type ImportedItem } from './import';

/** Reads a menu file the owner picks: CSV or text like a paste, Excel (.xlsx) by unzipping it with the browser's own tools. */

export const MAX_MENU_FILE_BYTES = 2 * 1024 * 1024;
/** Limits on what one sheet may unpack to; a menu is a few hundred rows. */
const MAX_PART_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 50;

export class MenuFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MenuFileError';
  }
}

const UNREADABLE = 'We couldn’t read that file. Save it as .xlsx or .csv and try again.';

interface Part {
  readonly method: number;
  readonly size: number;
  readonly unzipped: number;
  readonly offset: number;
}

/** The files inside a zip, from its central directory at the end. */
function zipParts(bytes: Uint8Array): ReadonlyMap<string, Part> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  const stop = Math.max(0, end - 0xffff);
  while (end >= stop && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < stop) throw new MenuFileError(UNREADABLE);
  const parts = new Map<string, Part>();
  let at = view.getUint32(end + 16, true);
  for (let left = view.getUint16(end + 10, true); left > 0; left -= 1) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new MenuFileError(UNREADABLE);
    const nameLength = view.getUint16(at + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    parts.set(name, { method: view.getUint16(at + 10, true), size: view.getUint32(at + 20, true), unzipped: view.getUint32(at + 24, true), offset: view.getUint32(at + 42, true) });
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return parts;
}

async function unzip(bytes: Uint8Array, part: Part | undefined): Promise<string> {
  if (!part) return '';
  if (part.unzipped > MAX_PART_BYTES) throw new MenuFileError(UNREADABLE);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = part.offset + 30 + view.getUint16(part.offset + 26, true) + view.getUint16(part.offset + 28, true);
  const data = bytes.slice(start, start + part.size);
  if (part.method === 0) return new TextDecoder().decode(data);
  if (part.method !== 8) throw new MenuFileError(UNREADABLE);
  return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
}

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' };
const decode = (xml: string): string =>
  xml.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, code: string) => {
    if (!code.startsWith('#')) return ENTITIES[code] ?? entity;
    return String.fromCodePoint(/^#x/i.test(code) ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
  });
/** The text of a shared or inline string, joining the runs of rich text. */
const textOf = (xml: string): string => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decode(match[1])).join('');
const columnOf = (letters: string): number => [...letters].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;

function cellText(attributes: string, inner: string, shared: readonly string[]): string {
  const type = /\bt="(\w+)"/.exec(attributes)?.[1] ?? 'n';
  if (type === 'inlineStr') return textOf(inner);
  const value = decode(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
  if (type === 's') return shared[Number(value)] ?? '';
  // Excel can keep 180 as 179.99999999999997 after a sum; prices have at most two decimals.
  if (type === 'n' && value !== '' && Number.isFinite(Number(value))) return String(Math.round(Number(value) * 100) / 100);
  return value;
}

/** Rows of cell text, each at its own row number so line numbers match what the owner sees in Excel. */
function sheetRows(xml: string, shared: readonly string[]): string[][] {
  const rows: string[][] = [];
  for (const row of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const number = Number(/\br="(\d+)"/.exec(row[1])?.[1] ?? rows.length + 1);
    if (number > MAX_ROWS) break;
    const cells: string[] = [];
    for (const cell of (row[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cell[1])?.[1];
      const column = ref ? columnOf(ref) : cells.length;
      if (column < MAX_COLUMNS) cells[column] = cellText(cell[1], cell[2] ?? '', shared);
    }
    rows[number - 1] = Array.from(cells, (cell) => cell ?? '');
  }
  return Array.from(rows, (row) => row ?? []);
}

/** The first sheet of an .xlsx file as rows of cell text. */
export async function readXlsx(bytes: Uint8Array): Promise<string[][]> {
  try {
    const parts = zipParts(bytes);
    const sheetNumber = (name: string): number => Number(/(\d+)\.xml$/.exec(name)?.[1]);
    // shortcut: takes the lowest-numbered sheet, not the workbook's first tab; read xl/workbook.xml if owners send reordered multi-sheet files.
    const [sheet] = [...parts.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort((a, b) => sheetNumber(a) - sheetNumber(b));
    if (!sheet) throw new MenuFileError(UNREADABLE);
    const shared = [...(await unzip(bytes, parts.get('xl/sharedStrings.xml'))).matchAll(/<si(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/si>)/g)].map((match) => textOf(match[1] ?? ''));
    return sheetRows(await unzip(bytes, parts.get(sheet)), shared);
  } catch (error) {
    throw error instanceof MenuFileError ? error : new MenuFileError(UNREADABLE);
  }
}

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean => signature.every((byte, index) => bytes[index] === byte);

/** Dishes from a file the owner picked, known by its first bytes rather than its name. */
export async function readMenuFile(file: Blob): Promise<ImportedItem[]> {
  if (file.size > MAX_MENU_FILE_BYTES) throw new MenuFileError('That file is too big. Choose one under 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (startsWith(bytes, [0x50, 0x4b])) return readMenuRows(await readXlsx(bytes));
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) throw new MenuFileError('This is an old Excel file. Save it as .xlsx or .csv, then choose it again.');
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) throw new MenuFileError('That’s a PDF. Copy the menu text from it and paste it here.');
  // Excel's "Unicode text" export is UTF-16 with a byte order mark.
  if (startsWith(bytes, [0xff, 0xfe])) return parseMenuText(new TextDecoder('utf-16le').decode(bytes));
  if (bytes.includes(0)) throw new MenuFileError(UNREADABLE);
  return parseMenuText(new TextDecoder().decode(bytes));
}
