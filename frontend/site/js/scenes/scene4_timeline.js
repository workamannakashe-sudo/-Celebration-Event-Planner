/**
 * @file frontend/site/js/scenes/scene4_timeline.js
 * @description Scene 4: Timeline (004) – Luminous 3D ribbon path with milestone nodes
 * flying past the camera. Critical path glows.
 */

import { getTimelineNodes, DEMO_PLAN_INPUTS } from '../engineBridge.js';

export class Scene4Timeline {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.ribbonMesh = null;
    this.nodeMeshes = [];
    this.leadWeeks = 26;
  }

  init(scene) {
    this.rebuildTimeline();
    this.group.position.set(0, 0, -16);
    scene.add(this.group);
  }

  rebuildTimeline() {
    const { THREE, registry } = this;

    // Remove old meshes
    if (this.ribbonMesh) this.group.remove(this.ribbonMesh);
    this.nodeMeshes.forEach((m) => this.group.remove(m));
    this.nodeMeshes = [];

    // 1. Create 3D Curved Ribbon Path
    const points = [];
    const stepCount = 50;
    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      const x = (t - 0.5) * 28;
      const y = Math.sin(t * Math.PI * 2.5) * 3;
      const z = Math.cos(t * Math.PI * 1.5) * 6;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.16, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65,
    });

    registry.track(tubeGeo);
    registry.track(tubeMat);

    this.ribbonMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.group.add(this.ribbonMesh);

    // 2. Milestone Spheres along the curve
    const timelineData = getTimelineNodes(DEMO_PLAN_INPUTS.date, this.leadWeeks);
    const milestones = timelineData.milestones.slice(0, 8);

    milestones.forEach((ms, idx) => {
      const frac = idx / (milestones.length - 1);
      const pos = curve.getPointAt(frac);

      const isCritical = idx === 0 || idx === milestones.length - 1 || ms.task.toLowerCase().includes('venue');
      const radius = isCritical ? 0.55 : 0.38;
      const color = isCritical ? 0x10b981 : 0xe8d5b5;

      const nodeGeo = new THREE.SphereGeometry(radius, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      });

      registry.track(nodeGeo);
      registry.track(nodeMat);

      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      this.nodeMeshes.push(nodeMesh);
      this.group.add(nodeMesh);
    });
  }

  update(localT, dt, state) {
    // Flying camera push along timeline
    this.group.position.x = -localT * 8;
    this.group.position.z = -16 + localT * 10;
    this.group.rotation.y = 0.2 + Math.sin(state.progress * 4) * 0.1;

    this.group.visible = localT > -0.3 && localT < 1.3;
  }

  updateLeadWeeks(weeks) {
    this.leadWeeks = weeks;
    this.rebuildTimeline();
  }

  setQuality(tier) {
    if (this.ribbonMesh) {
      this.ribbonMesh.material.opacity = tier === 'high' ? 0.75 : 0.55;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
