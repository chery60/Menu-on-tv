# Menu photo golden set (tracker MT-19)

Real photos of real menus, and what each one says, so the photo reader is measured before it changes (docs/architecture.md, "Evals"). The bar: 95% of prices read exactly.

## Adding a photo

Put the photo and its answer side by side, with the same name:

```
evals/menu-photos/
  udupi-flex-board.jpg
  udupi-flex-board.json
```

The answer lists every dish with its prices in rupees, in the order printed (half before full):

```json
{ "dishes": [{ "name": "Masala dosa", "prices": [70] }, { "name": "Chicken biryani", "prices": [180, 320] }] }
```

Aim for 30 photos across handwritten boards, flex prints, laminated cards, glare, low light and two-column menus. Use photos the owner has agreed to share, and crop out faces and phone numbers.

## Running it

It calls the real model, so it costs money and needs `ANTHROPIC_API_KEY`:

```bash
MENU_PHOTO_EVAL=1 npx vitest run src/features/menu/photo-eval.test.ts
```

It prints each photo's score and the prices it missed, and fails under 95%.
