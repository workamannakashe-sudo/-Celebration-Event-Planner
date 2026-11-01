/**
 * @file frontend/site/js/scenes/scene2_budget.js
 * @description Scene 2: Budget (002) – 3D Donut ring assembled from extruded segments
 * that fly in and snap together. Interactive with live engine updates.
 */

import { getDonutSegments, DEMO_PLAN_INPUTS } from '../engineBridge.js';

export class Scene2Budget {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.segmentMeshes = [];
    this.scatterOffsets = [];
    this.inputs = { ...DEMO_PLAN_INPUTS };
    this.userRotationY = 0;
    this.userRotationX = 0;
  }

  init(scene) {
    this.rebuildSegments();
    this.group.position.set(0, 0, -18);
    scene.add(this.group);
  }

  rebuildSegments() {
    const { THREE, registry } = this;

    // Clear old meshes
    this.segmentMeshes.forEach((mesh) => {
      this.group.remove(mesh);
    });
    this.segmentMeshes = [];
    this.scatterOffsets = [];

    const segments = getDonutSegments(this.inputs);
    const colors = [
      0x8b5cf6, // Violet (Venue)
      0xec4899, // Pink (Catering)
      0x06b6d4, // Cyan (Decor)
      0xf59e0b, // Amber (Photo)
      0x10b981, // Emerald (Attire)
      0x3b82f6, // Blue (Music)
      0x6366f1, // Indigo (Invites)
      0xf43f5e, // Coral (Logistics)
      0x64748b, // Slate (Contingency)
    ];

    segments.forEach((seg, idx) => {
      const start = seg.startAngle;
      const end = seg.endAngle;
      const span = Math.max(0.04, end - start);

      // Arc curve geometry using CylinderGeometry with thetaStart & thetaLength
      const innerR = 4.2;
      const outerR = 6.0;
      const arcGeo = new THREE.RingGeometry(innerR, outerR, 32, 1, start, span);
      const color = colors[idx % colors.length];

      const arcMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        wireframe: false,
      });

      registry.track(arcGeo);
      registry.track(arcMat);

      const mesh = new THREE.Mesh(arcGeo, arcMat);

      // Random scatter direction
      const midAngle = start + span / 2;
      const scatterDist = 6 + Math.random() * 8;
      const scatterX = Math.cos(midAngle) * scatterDist;
      const scatterY = Math.sin(midAngle) * scatterDist;
      const scatterZ = (Math.random() - 0.5) * 15;

      this.scatterOffsets.push({ scatterX, scatterY, scatterZ });
      this.segmentMeshes.push(mesh);
      this.group.add(mesh);
    });
  }

  update(localT, dt, state) {
    // Assembly progression: 0 = completely scattered, 1 = snapped ring
    const assembleT = Math.max(0, Math.min(1, (localT + 0.2) * 1.5));
    const easeT = Math.sin(assembleT * Math.PI * 0.5); // ease out

    this.segmentMeshes.forEach((mesh, idx) => {
      const off = this.scatterOffsets[idx];
      if (off) {
        mesh.position.x = off.scatterX * (1 - easeT);
        mesh.position.y = off.scatterY * (1 - easeT);
        mesh.position.z = off.scatterZ * (1 - easeT);
      }
    });

    // Idle tilt and user drag rotation
    this.group.rotation.x = 0.35 + Math.sin(state.progress * 3) * 0.08 + this.userRotationX;
    this.group.rotation.y = state.progress * 2 + this.userRotationY;
    this.group.rotation.z = Math.cos(state.progress * 2) * 0.04;

    this.group.visible = localT > -0.3 && localT < 1.4;
  }

  updateInputs(newInputs) {
    Object.assign(this.inputs, newInputs);
    this.rebuildSegments();
  }

  setQuality(tier) {
    this.segmentMeshes.forEach((m) => {
      m.material.opacity = tier === 'high' ? 0.9 : 0.75;
    });
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
