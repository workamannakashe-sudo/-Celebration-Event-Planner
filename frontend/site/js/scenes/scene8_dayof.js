/**
 * @file frontend/site/js/scenes/scene8_dayof.js
 * @description Scene 8: Day-Of (008) – Rotating clock ring with orbiting run-sheet schedule blocks.
 */

export class Scene8DayOf {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.clockRing = null;
    this.orbitBlocks = [];
  }

  init(scene) {
    const { THREE, registry } = this;

    // 1. Clock Ring Geometry
    const ringGeo = new THREE.RingGeometry(5.2, 5.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc4b5fd,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });

    registry.track(ringGeo);
    registry.track(ringMat);

    this.clockRing = new THREE.Mesh(ringGeo, ringMat);
    this.group.add(this.clockRing);

    // 2. Orbiting Schedule Blocks (Haldi, Baraat, Muhurat, Feast, Sangeet)
    const blockCount = 6;
    for (let i = 0; i < blockCount; i++) {
      const angle = (i / blockCount) * Math.PI * 2;
      const blockGeo = new THREE.BoxGeometry(1.6, 0.8, 0.3);
      const blockMat = new THREE.MeshBasicMaterial({
        color: i === 2 ? 0x10b981 : 0xe8d5b5, // Accent for Muhurat
        transparent: true,
        opacity: 0.85,
      });

      registry.track(blockGeo);
      registry.track(blockMat);

      const blockMesh = new THREE.Mesh(blockGeo, blockMat);
      const r = 5.35;
      blockMesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      blockMesh.rotation.z = angle + Math.PI / 2;

      this.orbitBlocks.push({ mesh: blockMesh, baseAngle: angle });
      this.group.add(blockMesh);
    }

    this.group.position.set(0, 0, -18);
    scene.add(this.group);
  }

  update(localT, dt, state) {
    const rotSpeed = dt * 0.0003;
    if (this.clockRing) {
      this.clockRing.rotation.z += rotSpeed;
    }

    this.orbitBlocks.forEach(({ mesh, baseAngle }) => {
      baseAngle += rotSpeed;
      const r = 5.35;
      mesh.position.set(Math.cos(baseAngle) * r, Math.sin(baseAngle) * r, 0);
      mesh.rotation.z = baseAngle + Math.PI / 2;
    });

    // Tilt towards camera
    this.group.rotation.x = 0.4 + Math.sin(state.progress * 4) * 0.06;
    this.group.rotation.y = Math.cos(state.progress * 3) * 0.1;
    this.group.visible = localT > -0.3 && localT < 1.3;
  }

  setQuality(tier) {
    if (this.clockRing) {
      this.clockRing.material.opacity = tier === 'high' ? 0.7 : 0.5;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
