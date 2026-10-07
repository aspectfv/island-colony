import { BufferGeometry, Group, LineBasicMaterial, LineLoop, Vector3 } from "three";
import type { BuildZone, Island } from "../shared/contracts/world";
import { sampleHeight } from "./terrain";

const SEGMENTS = 96;
const LIFT = 0.08;
const outlineMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });

// Outline that follows the ground so it never sinks into a slope.
export function createBuildZoneOutline(zone: BuildZone, island: Island): LineLoop {
  const points: Vector3[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    const x = zone.center.x + Math.cos(angle) * zone.radius;
    const z = zone.center.z + Math.sin(angle) * zone.radius;
    points.push(new Vector3(x, sampleHeight(island, x, z) + LIFT, z));
  }
  const outline = new LineLoop(new BufferGeometry().setFromPoints(points), outlineMaterial);
  outline.name = zone.zoneId;
  return outline;
}

export function createBuildZones(zones: BuildZone[], island: Island): Group {
  const group = new Group();
  group.name = "build-zones";
  for (const zone of zones) group.add(createBuildZoneOutline(zone, island));
  return group;
}
