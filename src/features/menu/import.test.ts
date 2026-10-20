import { describe, expect, it } from 'vitest';
import { parseDelimited, parseMenuText, readMenuRows, toItemInput, type ImportedItem } from './import';
import { itemInputSchema } from './schema';

const brief = (items: readonly ImportedItem[]) => items.map(({ category, name, prices, diet, flag }) => ({ category, name, prices: prices.map(({ label, paise }) => (label ? `${label} ${paise / 100}` : paise / 100)), diet, flag }));
const one = (text: string) => brief(parseMenuText(text))[0];

describe('pasted text', () => {
  it('reads a WhatsApp menu with headings, rupee signs and half and full prices', () => {
    const text = [
      '*Sharma Ji Ka Dhaba* 🍛',
      '',
      '*Snacks*',
      '1. Samosa - ₹20',
      '• Vada pav 25/-',
      'Paneer pakoda Rs. 80',
      'Aloo tikki chaat......Rs 60',
      '',
      'Main course:',
      'Chicken biryani half 180 full 320',
      'Dal makhani (H) 140 (F) 240',
      'Mutton rogan josh 260 half 480 full',
      '',
      'DRINKS',
      'Masala chai 30',
      'Cold coffee ₹ 1,200',
    ].join('\n');

    expect(brief(parseMenuText(text))).toEqual([
      { category: 'Snacks', name: 'Samosa', prices: [20], diet: 'veg', flag: null },
      { category: 'Snacks', name: 'Vada pav', prices: [25], diet: 'veg', flag: null },
      { category: 'Snacks', name: 'Paneer pakoda', prices: [80], diet: 'veg', flag: null },
      { category: 'Snacks', name: 'Aloo tikki chaat', prices: [60], diet: 'veg', flag: null },
      { category: 'Main course', name: 'Chicken biryani', prices: ['Half 180', 'Full 320'], diet: 'nonveg', flag: null },
      { category: 'Main course', name: 'Dal makhani', prices: ['Half 140', 'Full 240'], diet: 'veg', flag: null },
      { category: 'Main course', name: 'Mutton rogan josh', prices: ['Half 260', 'Full 480'], diet: 'nonveg', flag: null },
      { category: 'Drinks', name: 'Masala chai', prices: [30], diet: 'veg', flag: null },
      { category: 'Drinks', name: 'Cold coffee', prices: [1200], diet: 'veg', flag: null },
    ]);
  });

  it('keeps line numbers so the owner can find each dish', () => {
    expect(parseMenuText('Snacks\nSamosa 20\n\nChai 10').map((item) => item.line)).toEqual([2, 4]);
  });

  it('names two bare prices Half and Full, but asks the owner to check', () => {
    expect(one('Chicken curry 180/320')).toMatchObject({ prices: ['Half 180', 'Full 320'], flag: expect.stringMatching(/Half and Full/) });
    expect(one('Lassi 80 60')).toMatchObject({ prices: [80, 60], flag: 'Name each size, like Half and Full.' });
    expect(one('Pizza 199 299 399')).toMatchObject({ prices: [199, 299, 399], flag: 'Name each size, like Half and Full.' });
  });

  it('reads sizes before or after their prices, and small sizes, units and plates', () => {
    expect(one('Chicken biryani 180 half 320 full').prices).toEqual(['Half 180', 'Full 320']);
    expect(one('Margherita S 199 M 299 L 399').prices).toEqual(['Small 199', 'Medium 299', 'Large 399']);
    expect(one('Farmhouse pizza 7 inch 249 10 inch 399').prices).toEqual(['7 inch 249', '10 inch 399']);
    expect(one('Paneer tikka half plate 160 full plate 280').prices).toEqual(['Half 160', 'Full 280']);
    expect(one('Egg curry adha 70 poora 120')).toMatchObject({ prices: ['Half 70', 'Full 120'], diet: 'nonveg' });
  });

  it('keeps a pack size in the name when there is only one price', () => {
    expect(one('Pepsi 500 ml 40')).toMatchObject({ name: 'Pepsi 500ml', prices: [40] });
    expect(one('Samosa (2 pcs) 30')).toMatchObject({ name: 'Samosa (2 pcs)', prices: [30] });
  });

  it('uses only the marked price when a number belongs to the name', () => {
    expect(one('Chicken 65 ₹220')).toMatchObject({ name: 'Chicken 65', prices: [220], flag: null });
    expect(one('Biryani for 2 Rs. 450/-')).toMatchObject({ name: 'Biryani for 2', prices: [450], flag: null });
    expect(one('7up 40')).toMatchObject({ name: '7up', prices: [40] });
  });

  it('splits a line that lists several dishes, but not a line of sizes', () => {
    expect(brief(parseMenuText('Samosa 20, Kachori 25; Vada pav 30')).map((item) => `${item.name} ${item.prices.join()}`)).toEqual(['Samosa 20', 'Kachori 25', 'Vada pav 30']);
    expect(one('Chicken biryani half 180, full 320').prices).toEqual(['Half 180', 'Full 320']);
    expect(one('Lassi sweet, salted 60')).toMatchObject({ name: 'Lassi sweet salted', prices: [60] });
    expect(one('Masala dosa ₹60 Rava dosa ₹70').flag).toMatch(/more than one dish/);
  });

  it('flags a dish with no price instead of guessing, and drops headings with nothing under them', () => {
    const items = brief(parseMenuText('Our menu\n\nSnacks\nSamosa 20\nPaneer tikka\nVada pav 25\n\n-----\nThank you'));
    expect(items).toEqual([
      { category: 'Snacks', name: 'Samosa', prices: [20], diet: 'veg', flag: null },
      { category: 'Snacks', name: 'Paneer tikka', prices: [], diet: 'veg', flag: 'No price found. Type the price.' },
      { category: 'Snacks', name: 'Vada pav', prices: [25], diet: 'veg', flag: null },
    ]);
    expect(one('30 Masala chai')).toMatchObject({ prices: [], flag: 'No price found. Type the price.' });
  });

  it('reads a section name between dishes as a heading, but not an unpriced dish', () => {
    const items = brief(parseMenuText('Chai and coffee\nMasala chai 20\nFilter coffee 30\nSnacks\nSamosa 15\nMasala dosa\nHot drinks & coolers\nCold coffee 60\nBakes\nBanana cake 45'));
    expect(items.map((item) => [item.category, item.name, item.prices.length > 0])).toEqual([
      ['Chai and coffee', 'Masala chai', true],
      ['Chai and coffee', 'Filter coffee', true],
      ['Snacks', 'Samosa', true],
      ['Snacks', 'Masala dosa', false],
      ['Hot drinks & coolers', 'Cold coffee', true],
      ['Bakes', 'Banana cake', true],
    ]);
  });

  it('reads a heading with a note in brackets, after the shop name at the top', () => {
    const items = brief(parseMenuText('*GUPTA SWEETS* 🍬\nMITHAI (per kg)\nKaju katli Rs 900\nSoan papdi 400/-\nSamosa 15\nSweets (fresh daily)\nRasgulla 40'));
    expect(items.map((item) => [item.category, item.name, item.flag])).toEqual([
      ['Mithai (per kg)', 'Kaju katli', null],
      ['Mithai (per kg)', 'Soan papdi', null],
      ['Mithai (per kg)', 'Samosa', null],
      ['Sweets (fresh daily)', 'Rasgulla', null],
    ]);
  });

  it('skips phone numbers, links and WhatsApp copy headers', () => {
    const text = '[19/10/26, 10:15 am] Ramesh Kumar: Samosa 20\nCall 98765 43210 to order\nwww.example.com\nOrder on +91-98765-43210';
    expect(brief(parseMenuText(text))).toEqual([{ category: '', name: 'Samosa', prices: [20], diet: 'veg', flag: null }]);
  });

  it('reads Hindi names, veg marks and capital letters', () => {
    expect(parseMenuText('Masala chai मसाला चाय 30')[0]).toMatchObject({ name: 'Masala chai', nameHi: 'मसाला चाय' });
    expect(parseMenuText('समोसा 20')[0]).toMatchObject({ name: 'समोसा', nameHi: '' });
    expect(one('Mushroom tikka (NV) 200').diet).toBe('nonveg');
    expect(one('🔴 Keema pav 120').diet).toBe('nonveg');
    expect(one('Eggless cake (veg) 90')).toMatchObject({ name: 'Eggless cake', diet: 'veg' });
    expect(one('Fish fry 240').diet).toBe('nonveg');
    expect(one('CHICKEN TIKKA MASALA 280').name).toBe('Chicken tikka masala');
  });

  it('flags prices it can’t read, a name it can’t find, long names and prices that look too high', () => {
    expect(one('Thali ₹1,50,000').flag).toMatch(/Check the price/);
    expect(one('Thali 180320').flag).toBe('Check the price “180320”.');
    expect(one('Half 120').flag).toBe('No dish name found. Type the name.');
    expect(one(`${'Very long dish name '.repeat(5)} 120`).flag).toMatch(/Shorten the name/);
    expect(one('Sea food platter 12000').flag).toBe('₹12000 looks high. Check the price.');
    expect(one('Biryani half 180 full').flag).toMatch(/size has no price/);
    expect(one('Biryani 180 half full').flag).toMatch(/size has no price/);
    expect(one('Tea Q 10 S 15 M 20 L 25').flag).toMatch(/More than 3 prices/);
  });
});

describe('spreadsheet rows', () => {
  it('maps a billing export’s columns and joins sizes listed on separate rows', () => {
    const csv = [
      '﻿Item Code,Item Name,Category,Variation,Price (₹),Veg/Non-veg',
      'S01,Masala Chai,Beverages,,30,Veg',
      'M01,Chicken Biryani,Main Course,Half,180,Non Veg',
      'M01,Chicken Biryani,Main Course,Full,320,Non Veg',
      'M02,"Paneer Tikka, Dry",Starters,,"1,200",Veg',
      'M03,Egg Bhurji,Main Course,,90,Egg',
      ',,,Full,,',
      'M04,Lemon soda,Beverages,,free,Veg',
    ].join('\r\n');
    expect(brief(parseMenuText(csv))).toEqual([
      { category: 'Beverages', name: 'Masala Chai', prices: [30], diet: 'veg', flag: null },
      { category: 'Main Course', name: 'Chicken Biryani', prices: ['Half 180', 'Full 320'], diet: 'nonveg', flag: null },
      { category: 'Starters', name: 'Paneer Tikka, Dry', prices: [1200], diet: 'veg', flag: null },
      { category: 'Main Course', name: 'Egg Bhurji', prices: [90], diet: 'nonveg', flag: null },
      { category: 'Beverages', name: 'Lemon soda', prices: [], diet: 'veg', flag: 'Check the price “free”.' },
    ]);
  });

  it('reads size columns and category rows from cells copied out of a spreadsheet', () => {
    const tsv = 'Dish\tHalf\tFull\nCURRIES\t\t\nDal tadka\t110\t190\nKadai chicken\t\t300\nRoti\t\t15\nRoti\t\t15';
    expect(brief(parseMenuText(tsv))).toEqual([
      { category: 'Curries', name: 'Dal tadka', prices: ['Half 110', 'Full 190'], diet: 'veg', flag: null },
      { category: 'Curries', name: 'Kadai chicken', prices: ['Full 300'], diet: 'nonveg', flag: null },
      { category: 'Curries', name: 'Roti', prices: ['Full 15'], diet: 'veg', flag: null },
      { category: 'Curries', name: 'Roti', prices: ['Full 15'], diet: 'veg', flag: 'Listed twice. Remove one, or name its sizes.' },
    ]);
  });

  it('reads rows without a header as lines', () => {
    expect(brief(readMenuRows([['Snacks'], ['Samosa', '', '20'], ['Masala chai', '30']]))).toEqual([
      { category: 'Snacks', name: 'Samosa', prices: [20], diet: 'veg', flag: null },
      { category: 'Snacks', name: 'Masala chai', prices: [30], diet: 'veg', flag: null },
    ]);
    expect(parseMenuText('Samosa,20\nChai,10').map((item) => item.name)).toEqual(['Samosa', 'Chai']);
  });

  it('flags a table row with a name but no price', () => {
    expect(brief(parseMenuText('Name,Category,Price\nSamosa,Snacks,'))[0].flag).toBe('No price found. Type the price.');
  });
});

describe('parseDelimited', () => {
  it('reads quotes, doubled quotes, line breaks inside quotes and Windows line ends', () => {
    expect(parseDelimited('a,"b, c","say ""hi"""\r\n"two\nlines",7" pizza,\n', ',')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['two\nlines', '7" pizza', ''],
    ]);
    expect(parseDelimited('x\ty', '\t')).toEqual([['x', 'y']]);
  });
});

describe('toItemInput', () => {
  it('turns every cleanly read dish into a valid menu item', () => {
    const items = parseMenuText('Snacks\nSamosa 20\nChicken biryani half 180 full 320\nMasala chai मसाला चाय 30\nPizza S 199 M 299 L 399');
    for (const item of items) {
      const result = toItemInput(item);
      expect(result).toHaveProperty('input');
      if ('input' in result) expect(itemInputSchema.safeParse(result.input).success).toBe(true);
    }
  });

  it('says what to fix when a dish isn’t ready', () => {
    expect(toItemInput({ name: 'Samosa', nameHi: '', prices: [], diet: 'veg' })).toEqual({ error: 'Enter a price in rupees.' });
    expect(toItemInput({ name: 'Biryani', nameHi: '', prices: [{ label: '', paise: 100 }, { label: '', paise: 200 }], diet: 'veg' })).toEqual({ error: 'Name each size, like “Half” and “Full”.' });
  });
});
