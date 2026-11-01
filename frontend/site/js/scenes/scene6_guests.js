/**
 * @file frontend/site/js/scenes/scene6_guests.js
 * @description Scene 6: Guests (006) – Instanced dot cloud morphing into table clusters
 * with translucent RSVP forecast shell.
 */

export class Scene6Guests {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.dots = null;
    this.shellMesh = null;
    this.guestCount = 300;
    this.scatterPos = [];
    this.clusterPos = [];
  }

  init(scene) {
    const { THREE, registry } = this;

    // 1. Instanced Guest Dots
    const dotGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.guestCount * 3);

    // Compute 6 table centers
    const tableCenters = [
      [-6, 2, 0], [0, 2, 0], [6, 2, 0],
      [-6, -3, 0], [0, -3, 0], [6, -3, 0],
    ];

    for (let i = 0; i < this.guestCount; i++) {
      // Scatter state
      const sx = (Math.random() - 0.5) * 30;
      const sy = (Math.random() - 0.5) * 20;
      const sz = (Math.random() - 0.5) * 15;
      this.scatterPos.push({ x: sx, y: sy, z: sz });

      // Table cluster state (50 guests per table)
      const table = tableCenters[i % tableCenters.length];
      const angle = (i % 50) * ((Math.PI * 2) / 50);
      const r = 1.4 + Math.random() * 0.4;
      const cx = table[0] + Math.cos(angle) * r;
      const cy = table[1] + Math.sin(angle) * r;
      const cz = table[2] + (Math.random() - 0.5) * 0.5;
      this.clusterPos.push({ x: cx, y: cy, z: cz });

      pos[i * 3 + 0] = sx;
      pos[i * 3 + 1] = sy;
      pos[i * 3 + 2] = sz;
    }

    dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const dotMat = new THREE.PointsMaterial({
      size: 0.22,
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.85,
    });

    registry.track(dotGeo);
    registry.track(dotMat);

    this.dots = new THREE.Points(dotGeo, dotMat);
    this.group.add(this.dots);

    // 2. RSVP Forecast Translucent Shell (Sphere surrounding expected turnout)
    const shellGeo = new THREE.SphereGeometry(8.5, 24, 24);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.12,
      wireframe: true,
    });

    registry.track(shellGeo);
    registry.track(shellMat);

    this.shellMesh = new THREE.Mesh(shellGeo, shellMat);
    this.group.add(this.shellMesh);

    this.group.position.set(0, 0, -20);
    scene.add(this.group);
  }

  update(localT, dt, state) {
    const morphT = Math.max(0, Math.min(1, (localT + 0.2) * 1.8));

    if (this.dots) {
      const pos = this.dots.geometry.attributes.position.array;
      for (let i = 0; i < this.guestCount; i++) {
        const s = this.scatterPos[i];
        const c = this.clusterPos[i];
        pos[i * 3 + 0] = s.x + (c.x - s.x) * morphT;
        pos[i * 3 + 1] = s.y + (c.y - s.y) * morphT;
        pos[i * 3 + 2] = s.z + (c.z - s.z) * morphT;
      }
      this.dots.geometry.attributes.position.needsUpdate = true;
    }

    if (this.shellMesh) {
      this.shellMesh.rotation.y += dt * 0.0003;
      this.shellMesh.scale.setScalar(0.7 + morphT * 0.3);
    }

    this.group.rotation.y = Math.sin(state.progress * 3) * 0.15;
    this.group.visible = localT > -0.3 && localT < 1.3;
  }

  setQuality(tier) {
    if (this.dots) {
      this.dots.material.size = tier === 'high' ? 0.24 : 0.18;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
