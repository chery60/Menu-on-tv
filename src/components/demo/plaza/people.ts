import * as THREE from 'three';

/** Shared geometry for every person on the plaza: one set, many bodies. Feet at y = 0, facing +z. */
export interface PersonKit {
  readonly leg: THREE.BufferGeometry;
  readonly arm: THREE.BufferGeometry;
  readonly torso: THREE.BufferGeometry;
  readonly head: THREE.BufferGeometry;
  readonly hair: THREE.BufferGeometry;
  readonly cup: THREE.BufferGeometry;
  readonly apron: THREE.BufferGeometry;
  readonly pad: THREE.BufferGeometry;
  material(color: string): THREE.MeshStandardMaterial;
}

export interface Look {
  readonly shirt: string;
  readonly trousers: string;
  readonly skin: string;
  readonly hair: string;
}

export interface Person {
  readonly root: THREE.Group;
  readonly body: THREE.Group;
  readonly legs: readonly [THREE.Object3D, THREE.Object3D];
  readonly arms: readonly [THREE.Object3D, THREE.Object3D];
  readonly head: THREE.Mesh;
  readonly cup: THREE.Mesh;
  readonly pad: THREE.Mesh | null;
}

const HIP = 0.86;
const SHOULDER = 1.42;

export function createPersonKit(): PersonKit {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  return {
    leg: new THREE.BoxGeometry(0.14, 0.84, 0.16).translate(0, -0.42, 0),
    arm: new THREE.BoxGeometry(0.09, 0.6, 0.1).translate(0, -0.3, 0),
    torso: new THREE.CylinderGeometry(0.17, 0.21, 0.6, 8).translate(0, HIP + 0.3, 0),
    head: new THREE.SphereGeometry(0.12, 14, 10).translate(0, 1.6, 0),
    hair: new THREE.SphereGeometry(0.125, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.62, -0.01),
    cup: new THREE.CylinderGeometry(0.045, 0.035, 0.11, 10).translate(0, -0.64, 0.05),
    apron: new THREE.BoxGeometry(0.34, 0.5, 0.03).translate(0, HIP + 0.22, 0.2),
    pad: new THREE.BoxGeometry(0.14, 0.02, 0.18).translate(0, -0.6, 0.08),
    material(color) {
      const found = materials.get(color);
      if (found) return found;
      const made = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
      materials.set(color, made);
      return made;
    },
  };
}

function limb(kit: PersonKit, geometry: THREE.BufferGeometry, color: string, x: number, y: number): THREE.Object3D {
  const pivot = new THREE.Object3D();
  pivot.position.set(x, y, 0);
  const mesh = new THREE.Mesh(geometry, kit.material(color));
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

/** A low-poly person: legs, a torso, arms, a head with hair, and a cup they carry once they have ordered. */
export function createPerson(kit: PersonKit, look: Look, options: { readonly apron?: string; readonly pad?: boolean } = {}): Person {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legs = [limb(kit, kit.leg, look.trousers, -0.09, HIP), limb(kit, kit.leg, look.trousers, 0.09, HIP)] as const;
  const arms = [limb(kit, kit.arm, look.shirt, -0.25, SHOULDER), limb(kit, kit.arm, look.shirt, 0.25, SHOULDER)] as const;
  const torso = new THREE.Mesh(kit.torso, kit.material(look.shirt));
  const head = new THREE.Mesh(kit.head, kit.material(look.skin));
  const hair = new THREE.Mesh(kit.hair, kit.material(look.hair));
  for (const mesh of [torso, head, hair]) mesh.castShadow = true;
  body.add(...legs, ...arms, torso, head, hair);
  if (options.apron) body.add(new THREE.Mesh(kit.apron, kit.material(options.apron)));

  const cup = new THREE.Mesh(kit.cup, kit.material('#fbfaf7'));
  cup.visible = false;
  arms[1].add(cup);
  let pad: THREE.Mesh | null = null;
  if (options.pad) {
    pad = new THREE.Mesh(kit.pad, kit.material('#fbfaf7'));
    arms[0].add(pad);
  }
  return { root, body, legs, arms, head, cup, pad };
}

export interface Gesture {
  readonly walking: boolean;
  /** Seconds, for the stride and small movements. */
  readonly t: number;
  /** Puts this person's stride out of step with everyone else's. */
  readonly offset: number;
  readonly holding?: boolean;
  /** At the front of the line: now and then points at the TV while ordering. */
  readonly ordering?: boolean;
  /** Behind the counter. */
  readonly counter?: 'taking' | 'handing' | 'waiting';
}

const STRIDE_HZ = 1.7;

/** Poses a person for one frame. Rotations about x swing a limb forward when negative. */
export function pose(person: Person, gesture: Gesture): void {
  const { legs, arms, body, head } = person;
  const phase = (gesture.t + gesture.offset) * STRIDE_HZ * Math.PI * 2;
  const swing = gesture.walking ? Math.sin(phase) * 0.55 : 0;
  legs[0].rotation.x = swing;
  legs[1].rotation.x = -swing;
  arms[0].rotation.x = -swing * 0.7;
  arms[1].rotation.x = swing * 0.7;
  arms[0].rotation.z = 0.06;
  arms[1].rotation.z = -0.06;
  body.position.y = gesture.walking ? Math.abs(Math.sin(phase)) * 0.035 : Math.sin((gesture.t + gesture.offset) * 1.3) * 0.006;
  head.rotation.set(0, 0, 0);
  person.cup.visible = Boolean(gesture.holding) || gesture.counter === 'handing';

  if (gesture.holding) arms[1].rotation.x = -0.95;
  if (gesture.ordering && Math.sin((gesture.t + gesture.offset) * 0.9) > 0.35) {
    // Pointing up and to the left, at the TV.
    arms[1].rotation.x = -1.9;
    arms[1].rotation.z = 0.5;
  }
  if (gesture.counter === 'taking') {
    arms[0].rotation.x = -1.0;
    arms[1].rotation.x = -1.05 + Math.sin(gesture.t * 9) * 0.06;
    arms[1].rotation.z = 0.25;
    head.rotation.x = 0.08;
  } else if (gesture.counter === 'handing') {
    arms[1].rotation.x = -1.45;
  } else if (gesture.counter === 'waiting') {
    head.rotation.y = Math.sin(gesture.t * 0.7) * 0.35;
  }
}
