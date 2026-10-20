import type { Restaurant } from '@/features/screen/types';

/**
 * The sample café that plays on the demo screen and the home page. Fictional, with typical
 * Indian café prices; real menus come from the owner's photo or POS.
 */
export const DEMO_RESTAURANT: Restaurant = {
  name: 'Masala Mornings',
  tagline: 'Chai, chaat and fresh bakes',
  categories: [
    {
      id: 'chai',
      name: 'Chai and coffee',
      nameHi: 'चाय और कॉफ़ी',
      items: [
        { id: 'masala-chai', name: 'Masala chai', nameHi: 'मसाला चाय', price: 30, diet: 'veg', badges: ['bestseller'], emoji: '☕' },
        { id: 'adrak-chai', name: 'Adrak elaichi chai', nameHi: 'अदरक इलायची चाय', price: 35, diet: 'veg', emoji: '🫖' },
        { id: 'filter-coffee', name: 'Filter coffee', nameHi: 'फ़िल्टर कॉफ़ी', price: 45, diet: 'veg', emoji: '☕' },
        { id: 'cold-coffee', name: 'Cold coffee', nameHi: 'कोल्ड कॉफ़ी', price: 120, diet: 'veg', badges: ['new'], emoji: '🧋' },
        { id: 'badam-milk', name: 'Kesar badam milk', nameHi: 'केसर बादाम दूध', price: 90, diet: 'veg', emoji: '🥛' },
      ],
    },
    {
      id: 'snacks',
      name: 'Snacks',
      nameHi: 'नाश्ता',
      items: [
        { id: 'samosa', name: 'Samosa, 2 pieces', nameHi: 'समोसा (2)', price: 40, diet: 'veg', badges: ['bestseller'], emoji: '🥟' },
        { id: 'vada-pav', name: 'Vada pav', nameHi: 'वड़ा पाव', price: 45, diet: 'veg', badges: ['spicy'], emoji: '🍔' },
        { id: 'paneer-roll', name: 'Paneer tikka roll', nameHi: 'पनीर टिक्का रोल', price: 140, diet: 'veg', badges: ['chef'], emoji: '🌯' },
        { id: 'chicken-roll', name: 'Chicken kathi roll', nameHi: 'चिकन काठी रोल', price: 160, diet: 'nonveg', emoji: '🌯', soldOut: true },
        { id: 'noodles', name: 'Masala noodles', nameHi: 'मसाला नूडल्स', price: 70, diet: 'veg', emoji: '🍜' },
        { id: 'bun-maska', name: 'Bun maska', nameHi: 'बन मस्का', price: 40, diet: 'veg', emoji: '🍞' },
      ],
    },
    {
      id: 'chaat',
      name: 'Chaat',
      nameHi: 'चाट',
      items: [
        { id: 'bhel', name: 'Bhel puri', nameHi: 'भेल पूरी', price: 60, diet: 'veg', badges: ['jain'], emoji: '🥗' },
        { id: 'papdi', name: 'Dahi papdi chaat', nameHi: 'दही पापड़ी चाट', price: 80, diet: 'veg', emoji: '🥣' },
        { id: 'tikki', name: 'Aloo tikki chaat', nameHi: 'आलू टिक्की चाट', price: 80, diet: 'veg', badges: ['spicy'], emoji: '🥔' },
      ],
    },
    {
      id: 'bakes',
      name: 'Bakes and sweets',
      nameHi: 'बेक और मिठाई',
      items: [
        { id: 'lava-cake', name: 'Choco lava cake', nameHi: 'चोको लावा केक', price: 110, diet: 'veg', badges: ['new'], emoji: '🍫' },
        { id: 'banana-cake', name: 'Banana walnut cake', nameHi: 'केला अखरोट केक', price: 90, diet: 'veg', emoji: '🍌' },
        { id: 'gulab-jamun', name: 'Gulab jamun, 2 pieces', nameHi: 'गुलाब जामुन (2)', price: 60, diet: 'veg', emoji: '🍮' },
        { id: 'egg-puff', name: 'Egg puff', nameHi: 'एग पफ़', price: 35, diet: 'nonveg', emoji: '🥚' },
      ],
    },
    {
      id: 'coolers',
      name: 'Coolers',
      nameHi: 'ठंडा',
      items: [
        { id: 'mango-lassi', name: 'Mango lassi', nameHi: 'आम लस्सी', price: 90, diet: 'veg', badges: ['bestseller'], emoji: '🥭' },
        { id: 'lime-soda', name: 'Fresh lime soda', nameHi: 'नींबू सोडा', price: 60, diet: 'veg', emoji: '🍋' },
        { id: 'mojito', name: 'Virgin mint mojito', nameHi: 'मिंट मोहितो', price: 110, diet: 'veg', emoji: '🍹' },
      ],
    },
  ],
  promos: [
    { id: 'combo', kind: 'combo', label: 'Combo', headline: 'Chai + samosa', line: 'The 4 pm classic', price: 59, wasPrice: 70, emoji: '🥟' },
    { id: 'happy-hour', kind: 'happy-hour', label: 'Happy hour, 3 to 5 pm', headline: 'Cold coffee', line: 'Every day, while the sun is out', price: 99, wasPrice: 120, emoji: '🧋' },
    { id: 'new-cake', kind: 'new', label: 'New', headline: 'Choco lava cake', line: 'Warm and gooey, baked fresh at 11 am', price: 110, emoji: '🍫' },
    { id: 'special', kind: 'special', label: 'Today’s special', headline: 'Aloo tikki chaat', line: 'With sweet curd and green chutney', price: 80, emoji: '🥔' },
    { id: 'diwali', kind: 'festival', label: 'Diwali', headline: 'Mithai boxes', line: 'Pre-order at the counter by 30 October', price: 499, emoji: '🪔' },
    { id: 'scan', kind: 'scan', label: 'Like this screen?', headline: 'Put your menu on your TV', line: 'Scan to see how this café did it', emoji: '📺', qrUrl: '/?ref=demo-screen' },
  ],
  ads: [
    { id: 'gym', advertiser: 'FitZone Gym', headline: 'First week free', line: 'Two minutes from here. Show this screen at the desk.', emoji: '🏋️' },
    { id: 'coaching', advertiser: 'Bright Minds Coaching', headline: 'Maths and science, classes 8 to 12', line: 'Free demo class this Saturday', emoji: '📚' },
  ],
  ticker: [
    'Order 42 is ready at the counter',
    'Happy hour 3 to 5 pm: cold coffee ₹99',
    'Jain bhel on request',
    'Free Wi-Fi: ask at the counter',
    'Diwali mithai boxes: pre-order by 30 October',
  ],
};
