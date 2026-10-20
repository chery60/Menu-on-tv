import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { counterAt, QUEUE_POOL, queueAt, WALK_LOOPS, walkerAt } from '@/features/plaza/crowd';
import { tvFrame } from '@/features/plaza/tv-frame';
import type { Restaurant } from '@/features/screen/types';
import { buildWorld, COLORS, lookFor, SERVER_LOOK, TV } from './build';
import { createPerson, createPersonKit, pose, type Person } from './people';
import { drawTv, type TvFonts } from './textures';

export type PlazaView = 'plaza' | 'tv';

export interface PlazaOptions {
  readonly restaurant: Restaurant;
  readonly fonts: TvFonts;
  readonly reducedMotion: boolean;
  /** A phone or tablet: a lighter shadow map and pixel ratio. */
  readonly coarse: boolean;
}

export interface Plaza {
  setView(view: PlazaView): void;
  dispose(): void;
}

/** The crowd is already busy when the page opens, and stands still here under reduced motion. */
const START_S = 40;
const STILL_S = START_S + 2;
const GLIDE_MS = 1400;
const FOV = 30;

const ease = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

/** Where the camera sits for a view, far enough back that the subject fits the canvas's width. */
function viewFor(view: PlazaView, aspect: number): { position: THREE.Vector3; target: THREE.Vector3 } {
  if (view === 'tv') {
    const target = new THREE.Vector3(TV.x, TV.centreY, TV.z);
    const facing = new THREE.Vector3(Math.sin(TV.yaw), 0.06, Math.cos(TV.yaw)).normalize();
    return { target, position: target.clone().addScaledVector(facing, Math.max(4.2, 5.8 / aspect)) };
  }
  const target = new THREE.Vector3(-0.4, 1.2, 1.8);
  const from = new THREE.Vector3(0.55, 0.36, 0.75).normalize();
  return { target, position: target.clone().addScaledVector(from, Math.min(34, Math.max(21, 27 / aspect))) };
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}

/**
 * The demo café on its square, drawn into `container`. Throws when the browser cannot make a WebGL
 * context, so the caller can show its fallback. Runs only while on screen and while the tab is visible.
 */
export function createPlaza(container: HTMLElement, options: PlazaOptions): Plaza {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.coarse ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.className = 'mtv-plaza-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.paper);
  scene.fog = new THREE.Fog(COLORS.paper, 26, 54);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 140);

  scene.add(new THREE.HemisphereLight('#fffaf0', '#d6cdbb', 1.7));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.3);
  sun.position.set(10, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(options.coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 50 });
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0002;
  scene.add(sun);

  const world = buildWorld(options.fonts, options.restaurant, renderer.capabilities.getMaxAnisotropy());
  scene.add(world.root);

  const kit = createPersonKit();
  const people = new THREE.Group();
  scene.add(people);
  const queueBodies: Person[] = Array.from({ length: QUEUE_POOL }, (_, i) => createPerson(kit, lookFor(i)));
  const walkers = WALK_LOOPS.map((loop, i) => ({ loop, person: createPerson(kit, lookFor(i + QUEUE_POOL)), offset: i * 0.37 }));
  const server = createPerson(kit, SERVER_LOOK, { apron: COLORS.chilli, pad: true });
  server.root.position.set(0.6, 0.16, 1.58);
  for (const person of [...queueBodies, ...walkers.map((w) => w.person), server]) people.add(person.root);

  function placeCrowd(t: number): void {
    for (const body of queueBodies) body.root.visible = false;
    for (const guest of queueAt(t)) {
      const body = queueBodies[guest.pool];
      body.root.visible = true;
      body.root.position.set(guest.x, 0, guest.z);
      body.root.rotation.y = guest.heading;
      pose(body, { walking: guest.walking, t, offset: guest.pool * 0.23, holding: guest.holding, ordering: guest.ordering });
    }
    for (const walker of walkers) {
      const at = walkerAt(walker.loop, t);
      walker.person.root.position.set(at.x, 0, at.z);
      walker.person.root.rotation.y = at.heading;
      pose(walker.person, { walking: true, t, offset: walker.offset });
    }
    pose(server, { walking: false, t, offset: 0, counter: counterAt(t) });
  }

  let tvKey = '';
  /** Redraws the TV only when the real loop moves to another page or slide. */
  function updateTv(): boolean {
    const frame = tvFrame(options.restaurant, Date.now());
    if (frame.key === tvKey) return false;
    tvKey = frame.key;
    drawTv(world.tvCanvas, frame, options.restaurant, options.fonts);
    world.tvTexture.needsUpdate = true;
    return true;
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !options.reducedMotion;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 36;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.38;

  let dirty = true;
  controls.addEventListener('change', () => {
    dirty = true;
  });

  let glide: { from: { position: THREE.Vector3; target: THREE.Vector3 }; to: { position: THREE.Vector3; target: THREE.Vector3 }; start: number } | null = null;
  function jumpTo(view: PlazaView): void {
    const next = viewFor(view, camera.aspect);
    camera.position.copy(next.position);
    controls.target.copy(next.target);
    controls.update();
    dirty = true;
  }

  function stepGlide(now: number): boolean {
    if (!glide) return false;
    const k = ease(Math.min(1, (now - glide.start) / GLIDE_MS));
    camera.position.lerpVectors(glide.from.position, glide.to.position, k);
    controls.target.lerpVectors(glide.from.target, glide.to.target, k);
    if (k >= 1) {
      glide = null;
      controls.enabled = true;
    }
    return true;
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  if (options.reducedMotion) placeCrowd(STILL_S);

  function frame(): void {
    timer.update();
    const tvChanged = updateTv();
    const gliding = stepGlide(performance.now());
    const moved = controls.update();
    if (options.reducedMotion && !dirty && !tvChanged && !gliding && !moved) return;
    if (!options.reducedMotion) placeCrowd(START_S + timer.getElapsed());
    renderer.render(scene, camera);
    dirty = false;
  }

  let onScreen = true;
  let pageVisible = !document.hidden;
  let running = false;
  const sync = (): void => {
    const should = onScreen && pageVisible;
    if (should === running) return;
    running = should;
    renderer.setAnimationLoop(should ? frame : null);
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  io.observe(container);
  const onVisibility = (): void => {
    pageVisible = !document.hidden;
    sync();
  };
  document.addEventListener('visibilitychange', onVisibility);

  let placed = false;
  const resize = (): void => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!placed) {
      placed = true;
      jumpTo('plaza');
    }
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  sync();

  return {
    setView(view) {
      if (options.reducedMotion) {
        jumpTo(view);
        return;
      }
      glide = { from: { position: camera.position.clone(), target: controls.target.clone() }, to: viewFor(view, camera.aspect), start: performance.now() };
      controls.enabled = false;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      timer.dispose();
      disposeTree(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
