/**
 * @file frontend/site/js/scenes/scene1_about.js
 * @description Scene 1: About (001) – field of drifting translucent tiles the camera pushes through.
 */

export class Scene1About {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.instancedTiles = null;
    this.tileCount = 72;
    this.initialPositions = [];
  }

  init(scene) {
    const { THREE, registry } = this;

    const tileGeo = new THREE.PlaneGeometry(2.4, 1.4);
    const tileMat = new THREE.MeshBasicMaterial({
      color: 0xe8d5b5,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    registry.track(tileGeo);
    registry.track(tileMat);

    this.instancedTiles = new THREE.InstancedMesh(tileGeo, tileMat, this.tileCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.tileCount; i++) {
      const x = (Math.random() - 0.5) * 36;
      const y = (Math.random() - 0.5) * 24;
      const z = -10 - Math.random() * 60;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.2);
      dummy.updateMatrix();
      this.instancedTiles.setMatrixAt(i, dummy.matrix);
      this.initialPositions.push({ x, y, z, rx: dummy.rotation.x, ry: dummy.rotation.y });
    }

    this.instancedTiles.instanceMatrix.needsUpdate = true;
    registry.track(this.instancedTiles);

    this.group.add(this.instancedTiles);
    this.group.position.z = -15;
    scene.add(this.group);
  }

  update(localT, dt, state) {
    // Fly through the tile field
    const pushZ = localT * 45;
    this.group.position.z = -15 + pushZ;

    // Subtle drift
    this.group.rotation.y = Math.sin(state.progress * 4) * 0.08;
    this.group.rotation.x = Math.cos(state.progress * 3) * 0.04;

    this.group.visible = localT > -0.2 && localT < 1.3;
  }

  setQuality(tier) {
    if (this.instancedTiles) {
      this.instancedTiles.material.opacity = tier === 'high' ? 0.2 : 0.14;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
