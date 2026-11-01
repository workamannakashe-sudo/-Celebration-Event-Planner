/**
 * @file frontend/site/js/scenes/scene0_intro.js
 * @description Scene 0: Intro Space – ambient floating particles and refractive glass wordmark plane.
 */

export class Scene0Intro {
  constructor(THREE, registry) {
    this.THREE = THREE;
    this.registry = registry;
    this.group = new THREE.Group();
    this.particles = null;
    this.ringMesh = null;
    this.particleCount = 1200;
  }

  init(scene) {
    const { THREE, registry } = this;

    // Ambient floating star/confetti particles
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.particleCount * 3);
    const col = new Float32Array(this.particleCount * 3);

    const champagne = new THREE.Color(0xe8d5b5);
    const white = new THREE.Color(0xffffff);

    for (let i = 0; i < this.particleCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;

      const c = Math.random() > 0.4 ? champagne : white;
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    registry.track(pGeo);
    registry.track(pMat);

    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);

    // Glowing orbital halo ring
    const ringGeo = new THREE.TorusGeometry(8, 0.04, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe8d5b5,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });

    registry.track(ringGeo);
    registry.track(ringMat);

    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = Math.PI / 3;
    this.group.add(this.ringMesh);

    scene.add(this.group);
  }

  update(localT, dt, _state) {
    if (this.particles) {
      this.particles.rotation.y += dt * 0.00015;
      this.particles.rotation.x += dt * 0.00008;
    }
    if (this.ringMesh) {
      this.ringMesh.rotation.z += dt * 0.0002;
    }

    // Camera push forward as user starts scrolling past intro
    this.group.position.z = -localT * 15;
    this.group.visible = localT < 1.4;
  }

  setQuality(tier) {
    if (this.particles) {
      const size = tier === 'high' ? 0.2 : (tier === 'mid' ? 0.16 : 0.12);
      this.particles.material.size = size;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
