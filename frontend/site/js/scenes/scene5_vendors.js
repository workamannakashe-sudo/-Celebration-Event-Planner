/**
 * @file frontend/site/js/scenes/scene5_vendors.js
 * @description Scene 5: Vendors (005) – Floating 3D quote cards re-ordering by score.
 */

export class Scene5Vendors {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.cardMeshes = [];
  }

  init(scene) {
    const { THREE, registry } = this;
    const cardData = [
      { name: 'Heritage Lawn', price: '₹2,30,000', rank: 1, color: 0x10b981 }, // Best
      { name: 'Regal Palace',   price: '₹2,80,000', rank: 2, color: 0x3b82f6 },
      { name: 'Crystal Hall',   price: '₹3,40,000', rank: 3, color: 0xef4444 }, // Over budget
    ];

    cardData.forEach((cd, idx) => {
      const cardGeo = new THREE.PlaneGeometry(5.2, 3.2);
      const cardMat = new THREE.MeshBasicMaterial({
        color: cd.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });

      registry.track(cardGeo);
      registry.track(cardMat);

      const mesh = new THREE.Mesh(cardGeo, cardMat);
      mesh.position.set((idx - 1) * 6.5, 0, (idx - 1) * 2);
      this.cardMeshes.push({ mesh, rank: cd.rank, baseIdx: idx });
      this.group.add(mesh);
    });

    this.group.position.set(0, 0, -18);
    scene.add(this.group);
  }

  update(localT, dt, state) {
    // Re-ordering animation on scroll
    const orderT = Math.max(0, Math.min(1, (localT + 0.2) * 2));
    this.cardMeshes.forEach(({ mesh, rank, baseIdx }) => {
      const targetX = (rank - 2) * 5.8;
      const initialX = (baseIdx - 1) * 6.5;
      mesh.position.x = initialX + (targetX - initialX) * orderT;
      mesh.rotation.y = Math.sin(state.progress * 4 + baseIdx) * 0.15;
    });

    this.group.position.z = -18 + localT * 6;
    this.group.visible = localT > -0.3 && localT < 1.3;
  }

  setQuality(tier) {
    this.cardMeshes.forEach(({ mesh }) => {
      mesh.material.opacity = tier === 'high' ? 0.75 : 0.6;
    });
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
