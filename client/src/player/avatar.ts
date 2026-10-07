import {
  BoxGeometry,
  CapsuleGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from "three";

// One color per lobby slot; slot 0 is the host.
const SLOT_COLORS = [0xe4572e, 0x2e86ab, 0xf3a712, 0x8e44ad, 0x29bf12];

const bodyGeometry = new CapsuleGeometry(0.34, 0.7, 2, 8);
const headGeometry = new IcosahedronGeometry(0.3, 0);
const eyeGeometry = new BoxGeometry(0.08, 0.1, 0.06);
const skin = new MeshLambertMaterial({ color: 0xf1c9a5, flatShading: true });
const eyes = new MeshLambertMaterial({ color: 0x222222, flatShading: true });

const WALK_STEPS_PER_SECOND = 1.6;
const BOB_HEIGHT = 0.08;
const SWAY = 0.06;

// Origin at the feet, facing -Z so object.rotation.y = yaw matches the contract. The visible parts
// sit in a "rig" child so animation never fights the position set by movement.
export function createAvatar(slot: number): Group {
  const color = SLOT_COLORS[slot % SLOT_COLORS.length];
  const rig = new Group();
  rig.name = "rig";

  const body = new Mesh(bodyGeometry, new MeshLambertMaterial({ color, flatShading: true }));
  body.position.y = 0.7;
  const head = new Mesh(headGeometry, skin);
  head.position.y = 1.45;
  const leftEye = new Mesh(eyeGeometry, eyes);
  leftEye.position.set(-0.11, 1.5, -0.27);
  const rightEye = new Mesh(eyeGeometry, eyes);
  rightEye.position.set(0.11, 1.5, -0.27);
  rig.add(body, head, leftEye, rightEye);
  rig.traverse((part) => (part.castShadow = true));

  const avatar = new Group();
  avatar.name = `avatar-${slot}`;
  avatar.add(rig);
  return avatar;
}

// Bobs and sways the rig while walking and settles it when idle. seconds is any running clock.
export function animateAvatar(avatar: Object3D, animation: string, seconds: number): void {
  const rig = avatar.getObjectByName("rig");
  if (!rig) return;
  if (animation === "walk") {
    const phase = seconds * WALK_STEPS_PER_SECOND * Math.PI * 2;
    rig.position.y = Math.abs(Math.sin(phase)) * BOB_HEIGHT;
    rig.rotation.z = Math.sin(phase) * SWAY;
  } else {
    rig.position.y = 0;
    rig.rotation.z = 0;
  }
}
