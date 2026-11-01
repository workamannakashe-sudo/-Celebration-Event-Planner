/**
 * @file frontend/site/js/scenes/scene7_money.js
 * @description Scene 7: Money (007) – Cash-flow curve as 3D ribbon with payment milestone beads.
 */

export class Scene7Money {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.curveMesh = null;
    this.beadMeshes = [];
  }

  init(scene) {
    const { THREE, registry } = this;

    // Cash flow curve points: represents cumulative payment schedule
    const points = [];
    const count = 30;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = (t - 0.5) * 26;
      // Exponential rise towards event week
      const y = -4 + Math.pow(t, 2) * 8;
      const z = Math.sin(t * Math.PI) * 4;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 60, 0.18, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xfdba74,
      transparent: true,
      opacity: 0.8,
    });

    registry.track(tubeGeo);
    registry.track(tubeMat);

    this.curveMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.group.add(this.curveMesh);

    // Milestone Payment Beads
    const paymentFractions = [0.1, 0.35, 0.6, 0.85, 1.0];
    paymentFractions.forEach((frac) => {
      const beadGeo = new THREE.SphereGeometry(0.48, 16, 16);
      const beadMat = new THREE.MeshBasicMaterial({
        color: 0xffedd5,
        transparent: true,
        opacity: 0.95,
      });

      registry.track(beadGeo);
      registry.track(beadMat);

      const beadMesh = new THREE.Mesh(beadGeo, beadMat);
      beadMesh.position.copy(curve.getPointAt(frac));
      this.beadMeshes.push(beadMesh);
      this.group.add(beadMesh);
    });

    this.group.position.set(0, 0, -18);
    scene.add(this.group);
  }

  update(localT, dt, state) {
    this.group.position.z = -18 + localT * 8;
    this.group.rotation.y = Math.sin(state.progress * 3) * 0.12;
    this.group.visible = localT > -0.3 && localT < 1.3;
  }

  setQuality(tier) {
    if (this.curveMesh) {
      this.curveMesh.material.opacity = tier === 'high' ? 0.85 : 0.65;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
