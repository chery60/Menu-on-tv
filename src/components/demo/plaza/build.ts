import * as THREE from 'three';
import type { Restaurant } from '@/features/screen/types';
import type { Look } from './people';
import { awningCanvas, pavingCanvas, signCanvas, TV_SIZE, type TvFonts } from './textures';

/** The site's palette, in the world: paper, ink and chilli, with wood, steel and leaves to make it a place. */
export const COLORS = {
  paper: '#f2f0ea',
  wall: '#f7f4ed',
  stone: '#d8d1c2',
  ink: '#1d1c19',
  night: '#0f0e0d',
  chilli: '#f24a14',
  wood: '#cdb48f',
  woodDark: '#a98a63',
  steel: '#b8b4ab',
  leaf: '#3b8a57',
  leafDeep: '#0f7a40',
  trunk: '#6b5440',
  glow: '#ffb35c',
} as const;

/** Where the TV stands and which way it faces (yaw from +z), for the camera's TV view. */
export const TV = { x: -2.75, z: 3.75, yaw: 0.42, centreY: 2.25, width: 2.48 } as const;

const SHIRTS = ['#2f6f8f', '#e3b23c', '#9a4f2c', '#5c5a55', '#0f7a40', '#d97a52', '#3b4a6b', '#b8476b', '#7a8f3f', '#e9e4d8', '#4f6d7a', '#c2803d'];
const TROUSERS = ['#2b2a27', '#3d4352', '#5b4d3c', '#4a5b6e', '#6b6458'];
const SKIN = ['#8d5524', '#c68642', '#e0ac69', '#a86a3d', '#6b4226'];
const HAIR = ['#1b1714', '#2e221b', '#4a3426', '#14110f'];
const JARS = [COLORS.chilli, COLORS.leafDeep, COLORS.wall, COLORS.glow];

/** A different look for each person, from a few muted colours. */
export function lookFor(i: number): Look {
  return { shirt: SHIRTS[i % SHIRTS.length], trousers: TROUSERS[(i * 3) % TROUSERS.length], skin: SKIN[(i * 7) % SKIN.length], hair: HAIR[(i * 5) % HAIR.length] };
}

export const SERVER_LOOK: Look = { shirt: '#2b2a27', trousers: '#2b2a27', skin: '#a86a3d', hair: '#14110f' };

type Paint = (color: string) => THREE.MeshStandardMaterial;

function painter(): Paint {
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  return (color) => {
    const found = cache.get(color);
    if (found) return found;
    const made = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    cache.set(color, made);
    return made;
  };
}

function canvasTexture(canvas: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

function solid(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: readonly [number, number, number], parent: THREE.Object3D): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...at);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const block = (paint: Paint, size: readonly [number, number, number], color: string, at: readonly [number, number, number], parent: THREE.Object3D) =>
  solid(new THREE.BoxGeometry(...size), paint(color), at, parent);

function ground(anisotropy: number, parent: THREE.Object3D, paint: Paint): void {
  const map = canvasTexture(pavingCanvas(), anisotropy);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(26, 26);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(34, 72).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map, roughness: 1 }));
  floor.receiveShadow = true;
  parent.add(floor);
  // A kerb round the café, so the square reads as a square.
  const kerb = new THREE.Mesh(new THREE.RingGeometry(6.6, 6.95, 72).rotateX(-Math.PI / 2), paint(COLORS.stone));
  kerb.position.y = 0.01;
  kerb.receiveShadow = true;
  parent.add(kerb);
}

function cafe(fonts: TvFonts, restaurant: Restaurant, anisotropy: number, parent: THREE.Object3D, paint: Paint): void {
  const g = new THREE.Group();
  parent.add(g);
  block(paint, [7.2, 0.16, 5.2], COLORS.stone, [0, 0.08, 0], g);
  // Walls, with a wide serving window in the front one.
  block(paint, [6.6, 3, 0.22], COLORS.wall, [0, 1.66, -2.25], g);
  block(paint, [0.22, 3, 4.5], COLORS.wall, [-3.19, 1.66, 0], g);
  block(paint, [0.22, 3, 4.5], COLORS.wall, [3.19, 1.66, 0], g);
  block(paint, [0.8, 3, 0.22], COLORS.wall, [-2.9, 1.66, 2.15], g);
  block(paint, [0.8, 3, 0.22], COLORS.wall, [2.9, 1.66, 2.15], g);
  block(paint, [6.6, 0.62, 0.22], COLORS.wall, [0, 2.85, 2.15], g);
  // The counter: an ink front and a wooden top the guests lean on.
  block(paint, [5, 1, 0.22], COLORS.ink, [0, 0.66, 2.15], g);
  block(paint, [5.3, 0.08, 0.8], COLORS.wood, [0, 1.2, 2.2], g);
  block(paint, [7.6, 0.24, 5.6], COLORS.ink, [0, 3.28, 0], g);
  // Inside: a back counter with a chai urn and cups, and two shelves of jars.
  block(paint, [5.4, 0.95, 0.55], COLORS.woodDark, [0, 0.63, -1.75], g);
  solid(new THREE.CylinderGeometry(0.22, 0.24, 0.55, 16), paint(COLORS.steel), [-1.6, 1.38, -1.75], g);
  for (let i = 0; i < 5; i += 1) solid(new THREE.CylinderGeometry(0.05, 0.04, 0.11, 10), paint(COLORS.wall), [0.2 + i * 0.22, 1.16, -1.7], g);
  [2.05, 2.5].forEach((y, row) => {
    block(paint, [4.6, 0.05, 0.3], COLORS.woodDark, [0, y, -2.0], g);
    for (let i = 0; i < 7; i += 1) solid(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 10), paint(JARS[(i + row) % JARS.length]), [-1.8 + i * 0.6, y + 0.16, -2.0], g);
  });
  // A short striped awning over the window, high enough to see the person at the counter under it, and the name board on the roof.
  const stripes = new THREE.MeshStandardMaterial({ map: canvasTexture(awningCanvas(), anisotropy), roughness: 0.9 });
  const awning = solid(new THREE.BoxGeometry(5.6, 0.05, 0.85), [paint(COLORS.chilli), paint(COLORS.chilli), stripes, stripes, paint(COLORS.chilli), paint(COLORS.chilli)], [0, 2.95, 2.68], g);
  awning.rotation.x = 0.28;
  const name = new THREE.MeshStandardMaterial({ map: canvasTexture(signCanvas(restaurant.name, fonts), anisotropy), roughness: 0.8 });
  solid(new THREE.BoxGeometry(3.9, 0.66, 0.12), [paint(COLORS.ink), paint(COLORS.ink), paint(COLORS.ink), paint(COLORS.ink), name, paint(COLORS.ink)], [0, 3.74, 2.4], g);
  // A warm lamp inside, so the window glows.
  const lamp = new THREE.PointLight(COLORS.glow, 38, 8, 2);
  lamp.position.set(0, 2.35, 0.9);
  g.add(lamp);
}

/** The TV out front: a night bezel on two posts, its screen a canvas the scene redraws when the menu moves on. */
function television(anisotropy: number, parent: THREE.Object3D, paint: Paint): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const g = new THREE.Group();
  g.position.set(TV.x, 0, TV.z);
  g.rotation.y = TV.yaw;
  parent.add(g);
  for (const x of [-0.95, 0.95]) {
    solid(new THREE.CylinderGeometry(0.05, 0.05, 2.95, 10), paint(COLORS.ink), [x, 1.475, -0.08], g);
    block(paint, [0.5, 0.06, 0.5], COLORS.ink, [x, 0.03, -0.08], g);
  }
  block(paint, [TV.width + 0.14, 1.54, 0.12], COLORS.night, [0, TV.centreY, 0], g);
  const canvas = document.createElement('canvas');
  canvas.width = TV_SIZE.width;
  canvas.height = TV_SIZE.height;
  const texture = canvasTexture(canvas, anisotropy);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(TV.width, (TV.width * TV_SIZE.height) / TV_SIZE.width), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.position.set(0, TV.centreY, 0.061);
  g.add(screen);
  return { canvas, texture };
}

function tree(paint: Paint, parent: THREE.Object3D, x: number, z: number, size: number): void {
  solid(new THREE.CylinderGeometry(0.12 * size, 0.16 * size, 1.7 * size, 8), paint(COLORS.trunk), [x, 0.85 * size, z], parent);
  const crown = new THREE.MeshStandardMaterial({ color: COLORS.leaf, roughness: 0.9, flatShading: true });
  solid(new THREE.IcosahedronGeometry(1.15 * size, 0), crown, [x, 2.3 * size, z], parent);
  solid(new THREE.IcosahedronGeometry(0.8 * size, 0), paint(COLORS.leafDeep), [x + 0.35 * size, 2.95 * size, z - 0.2 * size], parent);
}

function bench(paint: Paint, parent: THREE.Object3D, x: number, z: number, yaw: number): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  parent.add(g);
  block(paint, [1.7, 0.07, 0.45], COLORS.wood, [0, 0.46, 0], g);
  block(paint, [1.7, 0.4, 0.06], COLORS.wood, [0, 0.72, -0.2], g);
  for (const lx of [-0.7, 0.7]) block(paint, [0.07, 0.44, 0.4], COLORS.ink, [lx, 0.22, 0], g);
}

function lampPost(paint: Paint, parent: THREE.Object3D, x: number, z: number): void {
  solid(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8), paint(COLORS.ink), [x, 1.7, z], parent);
  const light = new THREE.MeshStandardMaterial({ color: COLORS.glow, emissive: COLORS.glow, emissiveIntensity: 0.6 });
  solid(new THREE.SphereGeometry(0.18, 12, 8), light, [x, 3.5, z], parent);
}

/** Two small tables with stools beside the café, and planters at its corners, so it reads as a place to stop. */
function seating(paint: Paint, parent: THREE.Object3D): void {
  for (const [x, z] of [[5.1, -1.4], [5.5, 1.1]] as const) {
    solid(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), paint(COLORS.wall), [x, 0.74, z], parent);
    solid(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8), paint(COLORS.ink), [x, 0.36, z], parent);
    for (const dx of [-0.7, 0.7]) solid(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 12), paint(COLORS.chilli), [x + dx, 0.225, z], parent);
  }
  const shrub = new THREE.MeshStandardMaterial({ color: COLORS.leaf, flatShading: true, roughness: 0.9 });
  for (const [x, z] of [[-4.1, 1.4], [4.1, 2.7]] as const) {
    block(paint, [0.9, 0.5, 0.9], COLORS.stone, [x, 0.25, z], parent);
    solid(new THREE.IcosahedronGeometry(0.45, 0), shrub, [x, 0.78, z], parent);
  }
}

export interface World {
  readonly root: THREE.Group;
  readonly tvCanvas: HTMLCanvasElement;
  readonly tvTexture: THREE.CanvasTexture;
}

/** Everything that stands still: the square, the café, the TV, and the trees, benches and lamps round it. */
export function buildWorld(fonts: TvFonts, restaurant: Restaurant, anisotropy: number): World {
  const root = new THREE.Group();
  const paint = painter();
  ground(anisotropy, root, paint);
  cafe(fonts, restaurant, anisotropy, root, paint);
  const tv = television(anisotropy, root, paint);
  seating(paint, root);
  // Trees, benches and lamps sit outside the walkers' loops, and away from the way the queue comes and goes.
  for (const [x, z, size] of [[16.5, -6, 1.1], [-17, -7, 1.2], [8, -17, 1], [-9, -16.5, 1.15], [0.5, -19.5, 1.3], [-19.5, 2, 1]] as const) tree(paint, root, x, z, size);
  for (const [x, z, yaw] of [[12.5, -12, -0.8], [-13, -11.5, 0.8], [-17, -1.5, 1.57]] as const) bench(paint, root, x, z, yaw);
  for (const [x, z] of [[17, -1.5], [-16.5, 6], [4.5, -16.5], [-4.5, -17]] as const) lampPost(paint, root, x, z);
  return { root, tvCanvas: tv.canvas, tvTexture: tv.texture };
}
