import { describe, expect, it } from 'vitest';
import { MAX_MENU_FILE_BYTES, MenuFileError, readMenuFile, readXlsx } from './spreadsheet';

/** Builds a small .xlsx the way Excel does: a zip of XML parts, deflated or stored. */
const encoder = new TextEncoder();

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  parts.reduce((at, part) => (joined.set(part, at), at + part.length), 0);
  return joined;
};

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes.slice()]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
}

async function zip(files: Readonly<Record<string, string>>, method: 0 | 8 = 8): Promise<Uint8Array> {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const raw = encoder.encode(text);
    const data = method === 8 ? await deflate(raw) : raw;
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(8, method, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, raw.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, raw.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const directory = concat(centrals);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centrals.length, true);
  endView.setUint16(10, centrals.length, true);
  endView.setUint32(12, directory.length, true);
  endView.setUint32(16, offset, true);
  return concat([...locals, directory, end]);
}

const SHARED = '<sst><si><t>Item Name</t></si><si><t>Price</t></si><si><r><t>Masala </t></r><r><t xml:space="preserve">chai</t></r></si><si><t>Fish &amp; chips &#8377;</t></si><si/><si><t>Category</t></si><si><t>Drinks</t></si></sst>';
const SHEET = [
  '<worksheet><cols><col min="1" max="3"/></cols><sheetData>',
  '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>5</v></c><c r="C1" t="s"><v>1</v></c></row>',
  '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>6</v></c><c r="C2"><v>30</v></c></row>',
  '<row r="3"/>',
  '<row r="4"><c r="A4" t="inlineStr"><is><t>Paneer tikka</t></is></c><c r="B4"/><c r="C4"><v>179.99999999999997</v></c></row>',
  '<row r="5"><c r="A5" t="s"><v>3</v></c><c r="C5" t="str"><v>250</v></c></row>',
  '</sheetData></worksheet>',
].join('');

describe('readXlsx', () => {
  it('reads the first sheet’s cells, shared and inline text, at their rows and columns', async () => {
    const file = await zip({ 'xl/sharedStrings.xml': SHARED, 'xl/worksheets/sheet2.xml': '<worksheet/>', 'xl/worksheets/sheet1.xml': SHEET });
    expect(await readXlsx(file)).toEqual([
      ['Item Name', 'Category', 'Price'],
      ['Masala chai', 'Drinks', '30'],
      [],
      ['Paneer tikka', '', '180'],
      ['Fish & chips ₹', '', '250'],
    ]);
  });

  it('reads stored parts and sheets without shared text', async () => {
    const file = await zip({ 'xl/worksheets/sheet1.xml': '<sheetData><row><c t="inlineStr"><is><t>Chai</t></is></c><c><v>10</v></c></row></sheetData>' }, 0);
    expect(await readXlsx(file)).toEqual([['Chai', '10']]);
  });

  it('refuses files that aren’t spreadsheets', async () => {
    await expect(readXlsx(encoder.encode('PK not really a zip'))).rejects.toBeInstanceOf(MenuFileError);
    await expect(readXlsx(await zip({ 'word/document.xml': '<w/>' }))).rejects.toThrow(/Save it as .xlsx or .csv/);
    const broken = await zip({ 'xl/worksheets/sheet1.xml': SHEET });
    new DataView(broken.buffer).setUint32(broken.length - 6, 0xfffffff0, true); // the directory points past the end
    await expect(readXlsx(broken)).rejects.toBeInstanceOf(MenuFileError);
  });
});

describe('readMenuFile', () => {
  it('reads Excel, CSV and Unicode text files into dishes', async () => {
    const xlsx = await zip({ 'xl/sharedStrings.xml': SHARED, 'xl/worksheets/sheet1.xml': SHEET });
    expect((await readMenuFile(new Blob([xlsx.slice()]))).map((item) => [item.line, item.category, item.name, item.prices[0]?.paise, item.diet])).toEqual([
      [2, 'Drinks', 'Masala chai', 3000, 'veg'],
      [4, '', 'Paneer tikka', 18000, 'veg'],
      [5, '', 'Fish & chips ₹', 25000, 'nonveg'],
    ]);
    expect((await readMenuFile(new Blob(['﻿Name,Price\nSamosa,20\n'])))[0]).toMatchObject({ name: 'Samosa', prices: [{ paise: 2000 }] });
    const utf16 = new Uint8Array([0xff, 0xfe, ...Array.from('Chai\t10', (char) => [char.charCodeAt(0), 0]).flat()]);
    expect((await readMenuFile(new Blob([utf16])))[0]).toMatchObject({ name: 'Chai', prices: [{ paise: 1000 }] });
  });

  it('says what to do with files it can’t read', async () => {
    await expect(readMenuFile(new Blob([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1])]))).rejects.toThrow(/old Excel file/);
    await expect(readMenuFile(new Blob(['%PDF-1.7']))).rejects.toThrow(/That’s a PDF/);
    await expect(readMenuFile(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0])]))).rejects.toThrow(/couldn’t read that file/);
    await expect(readMenuFile(new Blob([new Uint8Array(MAX_MENU_FILE_BYTES + 1)]))).rejects.toThrow(/too big/);
  });
});
