import { BoxGeometry, CapsuleGeometry, Group, Mesh, MeshLambertMaterial } from "three";

// One color per lobby slot; slot 0 is the host.
const SLOT_COLORS = [0xe4572e, 0x2e86ab, 0xf3a712, 0x8e44ad, 0x29bf12];

const bodyGeometry = new CapsuleGeometry(0.35, 0.9, 2, 8);
const noseGeometry = new BoxGeometry(0.18, 0.18, 0.3);
const noseMaterial = new MeshLambertMaterial({ color: 0x333333, flatShading: true });

// Origin at the feet, facing -Z so object.rotation.y = yaw matches the contract.
export function createAvatar(slot: number): Group {
  const color = SLOT_COLORS[slot % SLOT_COLORS.length];
  const body = new Mesh(bodyGeometry, new MeshLambertMaterial({ color, flatShading: true }));
  body.position.y = 0.8;
  const nose = new Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, 1.25, -0.38);

  const avatar = new Group();
  avatar.name = `avatar-${slot}`;
  avatar.add(body, nose);
  return avatar;
}
