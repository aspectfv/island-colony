import {
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from "three";

interface CloudDef {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  speed: number;
}

export class CloudLayer {
  readonly group = new Group();
  private clouds: CloudDef[] = [];
  private instancedMesh: InstancedMesh;
  private readonly radius: number;
  private readonly clusterPuffs: Vector3[] = [
    new Vector3(0, 0, 0),
    new Vector3(2.5, -0.4, 0.8),
    new Vector3(-2.2, -0.5, -0.5),
    new Vector3(1.2, 0.8, -0.6),
    new Vector3(-1.4, 0.6, 0.7),
    new Vector3(3.6, -0.8, -0.4),
    new Vector3(-3.4, -0.7, 0.6),
  ];

  constructor(radius = 160, cloudCount = 12) {
    this.radius = radius;
    this.group.name = "clouds";

    // Low-poly soft cloud puff geometry
    const puffGeometry = new DodecahedronGeometry(2.8, 1);
    const puffMaterial = new MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      flatShading: true,
    });

    const totalInstances = cloudCount * this.clusterPuffs.length;
    this.instancedMesh = new InstancedMesh(puffGeometry, puffMaterial, totalInstances);
    this.instancedMesh.receiveShadow = false;
    this.instancedMesh.castShadow = false; // Kept off so it's super lightweight

    // Deterministic distribution of floating clouds
    for (let i = 0; i < cloudCount; i++) {
      const angle = (i / cloudCount) * Math.PI * 2 + (i % 3) * 0.2;
      const dist = radius * (0.65 + (i % 4) * 0.12);
      this.clouds.push({
        x: Math.cos(angle) * dist,
        y: 28 + (i % 5) * 4.5,
        z: Math.sin(angle) * dist,
        scaleX: 1.0 + (i % 3) * 0.25,
        scaleY: 0.7 + (i % 2) * 0.2,
        scaleZ: 1.0 + ((i + 1) % 3) * 0.25,
        speed: 1.8 + (i % 4) * 0.8,
      });
    }

    this.group.add(this.instancedMesh);
    this.update(0);
  }

  update(deltaSeconds: number): void {
    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    let instanceIdx = 0;
    const boundary = this.radius * 1.35;

    let cloudIdx = 0;
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * deltaSeconds;
      if (cloud.x > boundary) {
        cloud.x = -boundary;
      }

      for (let j = 0; j < this.clusterPuffs.length; j++) {
        const offset = this.clusterPuffs[j];
        if (!offset) continue;
        position.set(
          cloud.x + offset.x * cloud.scaleX,
          cloud.y + offset.y * cloud.scaleY,
          cloud.z + offset.z * cloud.scaleZ,
        );
        const puffScale = j === 0 ? 1.3 : 0.85 + 0.15 * Math.sin(cloudIdx * 1.5 + j);
        scale.set(cloud.scaleX * puffScale, cloud.scaleY * puffScale, cloud.scaleZ * puffScale);

        matrix.compose(position, quaternion, scale);
        this.instancedMesh.setMatrixAt(instanceIdx, matrix);
        instanceIdx++;
      }
      cloudIdx++;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
