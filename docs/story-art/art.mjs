// Period artwork for the MenuTelly story: illustrations in the style of the time, not originals.
import { writeFileSync } from 'node:fs';

const rough = `<svg width="0" height="0" style="position:absolute"><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="1.8"/></filter></svg>`;
const page = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"><style>${extra}</style></head><body>${rough}${body}</body></html>`;

const items = (rows) => `<ul class="items">${rows.map(([n, p, s]) => `<li${s ? ' class="struck"' : ''}><span>${n}</span><i></i><b>${p}</b>${s ? `<em>${s}</em>` : ''}</li>`).join('')}</ul>`;
const billCss = `
.wrap{position:absolute;inset:44px 46px;display:flex;flex-direction:column;align-items:center;text-align:center}
.items{list-style:none;width:100%;flex:1;display:flex;flex-direction:column;justify-content:center;font-size:25px;line-height:1.95}
.items li{display:flex;align-items:baseline;gap:8px;position:relative}
.items i{flex:1;border-bottom:2px dotted rgb(27 21 16 / .55);transform:translateY(-6px)}
.items b{font-weight:700}
.struck b{text-decoration:line-through;text-decoration-thickness:2px;color:rgb(27 21 16 / .7)}
.struck em{position:absolute;right:78px;top:-24px;font-family:'Reenie Beanie',cursive;font-style:normal;font-size:42px;color:#2b4a86;transform:rotate(-8deg)}
.fine{font-family:'IM Fell English',serif;font-style:italic;font-size:18px;margin-top:auto}
.corner{position:absolute;font-size:26px;color:var(--ink)}
`;
const corners = `<span class="corner" style="top:26px;left:30px">❦</span><span class="corner" style="top:26px;right:30px;transform:scaleX(-1)">❦</span><span class="corner" style="bottom:26px;left:30px;transform:scaleY(-1)">❦</span><span class="corner" style="bottom:26px;right:30px;transform:scale(-1)">❦</span>`;

const art = [
  { name: 'bill-coffee-house', w: 600, h: 840, html: page(`<div class="frame"></div>${corners}<div class="wrap ink">
    <p style="font-family:'Playfair Display';font-style:italic;font-weight:700;font-size:30px">Bill of fare</p>
    <h1 style="font-family:Ultra;font-weight:400;font-size:54px;line-height:1;margin-top:6px">The Copper Kettle</h1>
    <p style="font-style:italic;font-size:21px;margin-top:8px">Coffee house &amp; chop room</p>
    <div class="rule">❦</div>
    ${items([['A dish of coffee', '1d'], ['A dish of chocolate', '2d'], ['Muffins &amp; butter', '2d'], ['Pea soup', '3d'], ['Welsh rabbit', '6d'], ['Mutton chop &amp; bread', '8d'], ['Plum pudding', '4d']])}
    <div class="rule">✶</div>
    <p class="fine">Fires kept, newspapers taken in.<br>Prices as the market allows.</p></div>`, billCss) },
  { name: 'bill-refreshment-room', w: 600, h: 840, html: page(`<div class="frame" style="border-color:var(--blue)"></div>${corners}<div class="wrap ink" style="color:var(--blue)">
    <p style="font-family:'IM Fell English';font-style:italic;font-size:24px">Junction station</p>
    <h1 style="font-family:'Abril Fatface';font-weight:400;font-size:56px;line-height:1;margin-top:4px">Refreshment room</h1>
    <p style="font-size:21px;margin-top:10px;letter-spacing:.04em">Tariff for passengers</p>
    <div class="rule" style="color:var(--blue)">✶</div>
    ${items([['Tea, per cup', '1 anna'], ['Coffee, per cup', '1 anna'], ['Bread &amp; butter', '2 annas'], ['Curry &amp; rice', '4 annas'], ['Mutton cutlets', '6 annas'], ['Soda water', '2 annas']])}
    <div class="rule" style="color:var(--blue)">❦</div>
    <p class="fine">Passengers are requested to pay<br>at the counter before the bell.</p></div>`, billCss) },
  { name: 'bill-table-dhote', w: 600, h: 840, html: page(`<div class="frame" style="border-color:var(--gilt)"></div>${corners}<div class="wrap ink">
    <p style="font-family:'Playfair Display';font-weight:900;font-size:24px;color:var(--gilt)">The Grand Hotel</p>
    <h1 style="font-family:'Playfair Display';font-style:italic;font-weight:700;font-size:64px;line-height:1;margin-top:8px">Table d'hôte</h1>
    <p style="font-size:21px;margin-top:10px">Dinner at seven o'clock</p>
    <div class="rule">❦</div>
    <ul class="items" style="text-align:center;font-size:23px;line-height:1.75;list-style:none">
      <li style="justify-content:center">Potage à la reine</li><li style="justify-content:center">Turbot, sauce hollandaise</li>
      <li style="justify-content:center">Saddle of mutton, red currant jelly</li><li style="justify-content:center">Roast pheasant</li>
      <li style="justify-content:center">Pouding diplomate</li><li style="justify-content:center">Ices &amp; dessert</li></ul>
    <div class="rule">✶</div>
    <p style="font-family:Ultra;font-size:30px">Five shillings</p>
    <p class="fine">Gentlemen are requested to dress.</p></div>`, billCss) },
  { name: 'bill-tiffin-room', w: 600, h: 840, html: page(`<div class="frame" style="border-color:var(--red)"></div>${corners}<div class="wrap ink">
    <p style="font-family:'IM Fell English';font-style:italic;font-size:24px;color:var(--red)">Pure vegetarian</p>
    <h1 style="font-family:Rye;font-weight:400;font-size:46px;line-height:1.05;margin-top:6px">The Brass Lantern<br>Tiffin Room</h1>
    <p style="font-size:21px;margin-top:10px">Fresh from six in the morning</p>
    <div class="rule" style="color:var(--red)">✶</div>
    ${items([['Idli, two', '1 anna'], ['Medu vada', '1 anna'], ['Upma', '1 anna'], ['Masala dosa', '2 annas'], ['Kesari bath', '1 anna'], ['Filter coffee', '1 anna']])}
    <div class="rule" style="color:var(--red)">❦</div>
    <p class="fine">Hands washed at the tap by the door.</p></div>`, billCss) },
  { name: 'bill-yesterday', w: 600, h: 840, html: page(`<div class="frame"></div>${corners}<div class="wrap ink">
    <p style="font-family:'Playfair Display';font-style:italic;font-weight:700;font-size:28px">Bill of fare for</p>
    <h1 style="font-family:Ultra;font-weight:400;font-size:62px;line-height:1;margin-top:4px">Monday</h1>
    <div class="rule">❦</div>
    ${items([['Mutton chop', '8d', '10d!'], ['Pea soup', '3d'], ['Steak pudding', '9d', 'off'], ['Welsh rabbit', '6d', '7d'], ['Plum pudding', '4d'], ['Coffee', '1d', '1½d']])}
    <div class="rule">✶</div>
    <p style="font-family:'Reenie Beanie';font-size:40px;color:#2b4a86;transform:rotate(-4deg);margin:6px 0 22px">Reprint for Tuesday!!</p>
    <p class="fine">Printed by the week. Wrong by the day.</p></div>`, billCss) },
];

const poster = (name, inner, paper = '#ecdfbf', extra = '') => ({ name, w: 600, h: 900, html: page(`<div class="frame"></div><div class="wrap ink">${inner}</div>`, `body{--paper:${paper}}.wrap{position:absolute;inset:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px}${extra}`) });

art.push(
  poster('poster-hot-pies', `
    <p style="font-family:'IM Fell English';font-style:italic;font-size:30px">This day &amp; every day</p>
    <h1 style="font-family:Ultra;font-weight:400;font-size:150px;line-height:.9;color:var(--red)">Hot</h1>
    <h1 style="font-family:Ultra;font-weight:400;font-size:128px;line-height:.9">pies!</h1>
    <div class="rule">✶</div>
    <p style="font-family:'Abril Fatface';font-size:40px">Mutton, pork &amp; eel</p>
    <p style="font-size:26px;font-style:italic">fresh from the oven every hour</p>
    <div class="rule">❦</div>
    <p style="font-size:24px">at the sign of the</p>
    <p style="font-family:Rye;font-size:52px;line-height:1">Copper Kettle</p>
    <p style="font-family:'IM Fell English';font-size:22px;margin-top:8px">☞ By the market cross</p>`),
  poster('poster-chai', `
    <p style="font-family:'Playfair Display';font-weight:900;font-size:34px;color:var(--blue)">Garam! Garam!</p>
    <h1 style="font-family:'Abril Fatface';font-weight:400;font-size:190px;line-height:.9;color:var(--red)">Chai</h1>
    <div class="rule">✶</div>
    <p style="font-family:Ultra;font-size:46px;color:var(--blue)">Two pice</p>
    <p style="font-size:30px;font-style:italic">the cup</p>
    <div class="rule">❦</div>
    <p style="font-family:Rye;font-size:40px;line-height:1.1">Day &amp; night<br>at the station gate</p>`, '#e6d3a8'),
  poster('poster-oysters', `
    <p style="font-family:'IM Fell English';font-size:30px;font-style:italic">Grand opening of the</p>
    <h1 style="font-family:Sancreek;font-weight:400;font-size:108px;line-height:.95;color:var(--blue)">Oyster rooms</h1>
    <div class="rule">❦</div>
    <p style="font-family:'Abril Fatface';font-size:44px">This evening at six</p>
    <p style="font-size:28px;font-style:italic;margin-top:8px">Natives, stout &amp; brown bread</p>
    <div class="rule">✶</div>
    <p style="font-family:Ultra;font-size:40px;color:var(--red)">Ladies' room upstairs</p>`, '#efe5cc'),
  poster('poster-ices', `
    <h1 style="font-family:Ultra;font-weight:400;font-size:160px;line-height:.9;color:var(--blue)">Ices!</h1>
    <div class="rule">✶</div>
    <p style="font-family:'Abril Fatface';font-size:52px;line-height:1.05">Kulfi, sherbet<br>&amp; ice cream</p>
    <p style="font-size:28px;font-style:italic;margin-top:10px">kept cold on real ice</p>
    <div class="rule">❦</div>
    <p style="font-family:Rye;font-size:44px;color:var(--red)">By the sea front</p>
    <p style="font-family:'IM Fell English';font-size:24px">from noon till the lamps are lit</p>`, '#e9dcbf'),
  poster('poster-sandwich-men', `
    <h1 style="font-family:'Abril Fatface';font-weight:400;font-size:120px;line-height:.9;color:var(--red)">Wanted.</h1>
    <div class="rule">✶</div>
    <p style="font-family:Ultra;font-size:58px;line-height:1">Six stout<br>sandwich men</p>
    <p style="font-size:28px;font-style:italic;margin-top:12px">to walk the boards for the<br>Copper Kettle pie shop</p>
    <div class="rule">❦</div>
    <p style="font-family:Rye;font-size:38px">Boards supplied</p>
    <p style="font-size:26px">One shilling a day &amp; dinner</p>`, '#eadcb9'),
  poster('poster-electric', `
    <p style="font-family:'Playfair Display';font-style:italic;font-weight:700;font-size:34px">Dine by</p>
    <h1 style="font-family:Sancreek;font-weight:400;font-size:118px;line-height:.95;color:var(--red)">Electric light!</h1>
    <div class="rule">✶</div>
    <p style="font-family:Ultra;font-size:44px;line-height:1.05">The New<br>Electric Café</p>
    <p style="font-size:28px;font-style:italic;margin-top:10px">Open till midnight</p>
    <div class="rule">❦</div>
    <p style="font-family:'IM Fell English';font-size:26px">No smoke, no soot, no gas</p>`, '#e7dcc2'),
  poster('poster-dosa', `
    <p style="font-family:'IM Fell English';font-style:italic;font-size:32px">Now serving</p>
    <h1 style="font-family:Rye;font-weight:400;font-size:112px;line-height:.95;color:var(--red)">Masala dosa</h1>
    <div class="rule">✶</div>
    <p style="font-family:Ultra;font-size:56px;color:var(--blue)">Crisp! Hot!</p>
    <p style="font-family:'Abril Fatface';font-size:44px">Two annas</p>
    <div class="rule">❦</div>
    <p style="font-size:28px;font-style:italic">at the Brass Lantern Tiffin Room</p>`, '#ecdcb4'),
  poster('poster-post-no-bills', `
    <h1 style="font-family:Ultra;font-weight:400;font-size:112px;line-height:.92">Post<br>no bills</h1>
    <div class="rule">✶</div>
    <p style="font-family:'Abril Fatface';font-size:44px;line-height:1.1;color:var(--red)">Bill stickers will<br>be prosecuted</p>
    <div class="rule">❦</div>
    <p style="font-family:'IM Fell English';font-style:italic;font-size:26px">By order</p>`, '#f0e6cf'),
);

for (const a of art) writeFileSync(`${a.name}.html`, a.html);
writeFileSync('list.txt', art.map((a) => `${a.name} ${a.w} ${a.h}`).join('\n') + '\n');
console.log(art.length, 'pages');
