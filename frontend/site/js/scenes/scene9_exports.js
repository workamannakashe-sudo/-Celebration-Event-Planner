/**
 * @file frontend/site/js/scenes/scene9_exports.js
 * @description Scene 9: Exports (009) – Sheets sliding in and folding into an Excel/PDF/Share stack.
 */

export class Scene9Exports {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.sheets = [];
  }

  init(scene) {
    const { THREE, registry } = this;

    const sheetData = [
      { color: 0x10b981, offsetX: -12, targetY: 0.8, targetZ: 0 },  // Excel Sheet
      { color: 0xef4444, offsetX: 12,  targetY: 0.0, targetZ: 1.2 }, // PDF Document
      { color: 0x3b82f6, offsetX: 0,   targetY: -0.8, targetZ: 2.4 }, // Share Link
    ];

    sheetData.forEach((sd) => {
      const sheetGeo = new THREE.PlaneGeometry(6.0, 4.2);
      const sheetMat = new THREE.MeshBasicMaterial({
        color: sd.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });

      registry.track(sheetGeo);
      registry.track(sheetMat);

      const mesh = new THREE.Mesh(sheetGeo, sheetMat);
      mesh.position.set(sd.offsetX, sd.targetY, -10);
      mesh.rotation.x = -0.3;

      this.sheets.push({ mesh, targetX: 0, targetY: sd.targetY, targetZ: sd.targetZ, initialX: sd.offsetX });
      this.group.add(mesh);
    });

    this.group.position.set(0, 0, -18);
    scene.add(this.group);
  }

  update(localT, dt, state) {
    // Fold together as localT progresses
    const foldT = Math.max(0, Math.min(1, (localT + 0.3) * 1.5));

    this.sheets.forEach(({ mesh, initialX, targetY, targetZ }) => {
      mesh.position.x = initialX * (1 - foldT);
      mesh.position.y = targetY;
      mesh.position.z = targetZ * foldT;
      mesh.rotation.z = Math.sin(state.progress * 4) * 0.05;
    });

    this.group.rotation.y = Math.cos(state.progress * 3) * 0.1;
    this.group.visible = localT > -0.3 && localT < 1.3;
  }

  setQuality(tier) {
    this.sheets.forEach(({ mesh }) => {
      mesh.material.opacity = tier === 'high' ? 0.8 : 0.6;
    });
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
