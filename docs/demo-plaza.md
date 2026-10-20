# Live demo: the café on the plaza

The nav's live demo used to open `/screen/demo`: the TV player, full screen, with no way back to the site. It is now a site page, `/demo`, with the header and footer around a three.js scene: a small café at the centre of a plaza, its menu on a big TV in front of it.

## What is in the scene

- **The café**: walls, a serving window with a counter, a chilli and paper awning, and the demo café's name on a sign.
- **The TV**: a 16:9 display on two posts, in front of the café and turned towards the queue. It plays the demo café's menu in the Paper theme, drawn on a canvas from the same loop real TVs run (`paginateMenu`, `mainSlides('split')`, `sideLoop` and `slideAt` in `features/screen/loop.ts`). So it is in step with `/screen/demo`, and the sold-out kathi roll and the chai and samosa combo show up as they do on a real TV.
- **The counter**: one person behind it, taking the order of whoever is at the front: writing while they order, handing over a cup when they leave.
- **The queue**: three guests in a line. Every 8 seconds the front guest takes their cup and walks off, the line steps up, and someone new walks in from the edge of the plaza. The fog hides where they appear and disappear.
- **The plaza**: paving, a few trees, benches and lamps, and nine people walking loops around it.

## How it is built

- Plain three.js (`three@0.186`, WebGLRenderer), no React Three Fiber. It is loaded only on `/demo`, in the browser, after the page is up.
- Pure, tested logic in `src/features/plaza`: where each queue guest and walker is at time `t` (`crowd.ts`), and what the TV shows at time `t` (`tv-frame.ts`). The scene code in `src/components/demo/plaza` only draws what they return.
- Camera: a perspective view from the front right, with orbit controls (no pan, no going under the ground, limited zoom). A button moves the camera to the front of the TV and back.
- Light: a sky light and a sun with soft shadows. The TV is unlit, so its colours match the real screen.
- Cost: the loop runs only while the scene is on screen and the tab is visible. Pixel ratio is capped (2 on desktop, 1.5 on phones), and the shadow map is smaller on phones.
- Reduced motion: the crowd stands still and the camera jumps instead of gliding. You can still turn the scene.
- No WebGL: the scene area says so, and links to the TV screen.

## What changed around it

- Nav: "Live demo" goes to `/demo`.
- `/screen/demo` gets a "Back to the site" link that shows when the pointer moves, so the full-screen screen is no longer a dead end. Real TVs play `/s/<token>`, which does not show it.
- Not in scope: sound, guests ordering what the TV shows, or a 3D model of a real shop.
