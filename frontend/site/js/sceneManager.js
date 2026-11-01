/**
 * @file frontend/site/js/sceneManager.js
 * @description Main Three.js Scene Manager for Utsav 3D landing world.
 * Controls WebGL renderer, perspective camera flight, pointer parallax,
 * disposal registry (zero memory leaks), and delegates updates to Scene 0–9 modules.
 */

import { Scene0Intro } from './scenes/scene0_intro.js';
import { Scene1About } from './scenes/scene1_about.js';
import { Scene2Budget } from './scenes/scene2_budget.js';
import { Scene3Stress } from './scenes/scene3_stress.js';
import { Scene4Timeline } from './scenes/scene4_timeline.js';
import { Scene5Vendors } from './scenes/scene5_vendors.js';
import { Scene6Guests } from './scenes/scene6_guests.js';
import { Scene7Money } from './scenes/scene7_money.js';
import { Scene8DayOf } from './scenes/scene8_dayof.js';
import { Scene9Exports } from './scenes/scene9_exports.js';
import { getPaletteAt } from './palette.js';

export class DisposalRegistry {
  constructor() {
    this.items = new Set();
  }

  track(resource) {
    if (resource && typeof resource.dispose === 'function') {
      this.items.add(resource);
    }
    return resource;
  }

  disposeAll() {
    for (const item of this.items) {
      try {
        item.dispose();
      } catch {
        // ignore already disposed items
      }
    }
    this.items.clear();
  }
}

export class SceneManager {
  constructor(canvas, qualityManager) {
    this.canvas = canvas;
    this.qualityManager = qualityManager;
    this.registry = new DisposalRegistry();

    this.THREE = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.scenes = [];
    this.sceneBudget = null;
    this.sceneTimeline = null;

    this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.scrollState = { progress: 0, velocity: 0, activeSectionIndex: 0, localT: 0 };

    this.isPaused = false;
    this.isVisible = true;
    this.rafId = null;
    this.lastTime = performance.now();

    this.onResize = this.onResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.renderLoop = this.renderLoop.bind(this);
  }

  /**
   * Lazily loads Three.js from the whitelisted vendor route and boots the engine.
   */
  async init() {
    try {
      // Dynamic import of Three.js from whitelisted static vendor route
      const THREE = await import('/vendor/three/build/three.module.js');
      this.THREE = THREE;

      // 1. Scene & Camera
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x09090b, 0.035);

      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 1000);
      this.camera.position.set(0, 0, 10);

      // 2. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: this.qualityManager.tier === 'high',
        powerPreference: 'high-performance',
      });

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(this.qualityManager.dpr);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      // 3. Initialize Scene Modules
      const sc0 = new Scene0Intro(THREE, this.registry);
      const sc1 = new Scene1About(THREE, this.registry);
      const sc2 = new Scene2Budget(THREE, this.registry);
      const sc3 = new Scene3Stress(THREE, this.registry);
      const sc4 = new Scene4Timeline(THREE, this.registry);
      const sc5 = new Scene5Vendors(THREE, this.registry);
      const sc6 = new Scene6Guests(THREE, this.registry);
      const sc7 = new Scene7Money(THREE, this.registry);
      const sc8 = new Scene8DayOf(THREE, this.registry);
      const sc9 = new Scene9Exports(THREE, this.registry);

      this.scenes = [sc0, sc1, sc2, sc3, sc4, sc5, sc6, sc7, sc8, sc9];
      this.sceneBudget = sc2;
      this.sceneTimeline = sc4;

      this.scenes.forEach((sc) => sc.init(this.scene, this.camera));

      // 4. Attach Listeners
      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibilityChange);

      // 5. Start Render Loop
      this.rafId = requestAnimationFrame(this.renderLoop);
      return true;
    } catch (err) {
      console.warn('Three.js failed to initialize, using 2.5D fallback:', err);
      return false;
    }
  }

  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.qualityManager.dpr);
  }

  onPointerMove(e) {
    this.pointer.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  onVisibilityChange() {
    this.isVisible = document.visibilityState === 'visible';
  }

  updateScrollState(state) {
    this.scrollState = state;
  }

  setPaused(paused) {
    this.isPaused = paused;
  }

  renderLoop(now) {
    const dt = Math.max(1, Math.min(100, now - this.lastTime));
    this.lastTime = now;

    // Track frame time for dynamic quality degradation
    this.qualityManager.recordFrame(dt);

    if (this.isVisible && !this.isPaused && this.renderer && this.scene && this.camera) {
      // 1. Damped Pointer Parallax
      this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.05;
      this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.05;

      // 2. Camera Flight & Idle Breathing
      const idleTime = now * 0.001;
      const breathY = Math.sin(idleTime * 1.2) * 0.12;
      const breathX = Math.cos(idleTime * 0.8) * 0.08;

      this.camera.position.x = breathX + this.pointer.x * 0.6;
      this.camera.position.y = breathY + this.pointer.y * 0.4;

      // Subtle Velocity FOV kick (clamped between 46 and 54 degrees)
      const fovKick = Math.min(6, Math.abs(this.scrollState.velocity) * 12);
      this.camera.fov = 48 + fovKick;
      this.camera.updateProjectionMatrix();

      // 3. Dynamic Palette Fog Sync
      const palette = getPaletteAt(this.scrollState.progress);
      if (this.scene.fog) {
        this.scene.fog.color.set(palette.fog);
      }

      // 4. Update each scene module with local progress
      const progressPerScene = 1 / Math.max(1, this.scenes.length - 1);
      this.scenes.forEach((sc, idx) => {
        const sceneStart = idx * progressPerScene;
        const localT = (this.scrollState.progress - sceneStart) / progressPerScene;
        sc.update(localT, dt, this.scrollState);
      });

      this.renderer.render(this.scene, this.camera);
    }

    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.scenes.forEach((sc) => sc.dispose());
    this.registry.disposeAll();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
