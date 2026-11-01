/**
 * @file frontend/site/js/scenes/scene3_stress.js
 * @description Scene 3: Stress Test (003) – Thousands of particles raining into
 * 3D histogram bins computed from the Monte Carlo engine. Glowing budget limit plane.
 */

import { getStressDistribution, DEMO_PLAN_INPUTS } from '../engineBridge.js';

export class Scene3Stress {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.binBars = [];
    this.rainParticles = null;
    this.budgetPlane = null;
    this.particleCount = 1800;
  }

  init(scene) {
    const { THREE, registry } = this;
    const stressData = getStressDistribution(DEMO_PLAN_INPUTS);

    // 1. Build 3D Histogram Bins
    const binCount = stressData.bins.length;
    const barWidth = 1.2;
    const barSpacing = 1.6;
    const startX = -((binCount * barSpacing) / 2);

    stressData.bins.forEach((val, idx) => {
      const height = Math.max(0.6, (val / 100) * 8);
      const barGeo = new THREE.BoxGeometry(barWidth, height, barWidth);
      const isOverrun = idx >= stressData.budgetThresholdBin;
      const color = isOverrun ? 0xef4444 : 0x06b6d4;

      const barMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.65,
        wireframe: false,
      });

      registry.track(barGeo);
      registry.track(barMat);

      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.position.set(startX + idx * barSpacing, height / 2 - 4, 0);

      this.binBars.push({ mesh: barMesh, targetHeight: height, baseIdx: idx });
      this.group.add(barMesh);
    });

    // 2. Glowing Vertical Budget Limit Plane
    const planeGeo = new THREE.PlaneGeometry(0.08, 12);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    registry.track(planeGeo);
    registry.track(planeMat);

    this.budgetPlane = new THREE.Mesh(planeGeo, planeMat);
    const thresholdX = startX + (stressData.budgetThresholdBin - 0.5) * barSpacing;
    this.budgetPlane.position.set(thresholdX, 2, 0.5);
    this.group.add(this.budgetPlane);

    // 3. Instanced Raining Particles
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = Math.random() * 18 - 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.16,
      color: 0x5eead4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    registry.track(pGeo);
    registry.track(pMat);

    this.rainParticles = new THREE.Points(pGeo, pMat);
    this.group.add(this.rainParticles);

    this.group.position.set(0, 0, -20);
    scene.add(this.group);
  }

  update(localT, dt, state) {
    // Rain falling effect
    if (this.rainParticles) {
      const positions = this.rainParticles.geometry.attributes.position.array;
      const speed = dt * 0.015;
      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3 + 1] -= speed;
        if (positions[i * 3 + 1] < -4) {
          positions[i * 3 + 1] = 12 + Math.random() * 4;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Dynamic scale as user scrolls into the section
    const popT = Math.max(0, Math.min(1, (localT + 0.3) * 1.6));
    this.binBars.forEach(({ mesh, targetHeight }) => {
      mesh.scale.y = popT;
      mesh.position.y = (targetHeight * popT) / 2 - 4;
    });

    this.group.rotation.y = Math.sin(state.progress * 3) * 0.12;
    this.group.visible = localT > -0.3 && localT < 1.3;
  }

  setQuality(tier) {
    if (this.rainParticles) {
      this.rainParticles.material.size = tier === 'high' ? 0.18 : 0.12;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
