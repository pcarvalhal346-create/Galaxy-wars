import * as Phaser from 'phaser';
import { ELEMENT_STYLE, TEXTURE_KEYS } from '../config/theme';
import { ELEMENTS, type ElementType } from '../game/core/types';

/**
 * Efeitos de partículas reutilizáveis: um emissor por elemento, criado uma vez
 * e disparado com `explode` (sem criar objetos novos a cada match).
 */
export class Effects {
  private readonly emitters = new Map<ElementType, Phaser.GameObjects.Particles.ParticleEmitter>();
  private reduced = false;
  private cellSize = 100;

  constructor(private readonly scene: Phaser.Scene, depth: number) {
    for (const element of ELEMENTS) {
      const style = ELEMENT_STYLE[element];
      const emitter = scene.add.particles(0, 0, TEXTURE_KEYS.spark, {
        emitting: false,
        lifespan: { min: 280, max: 520 },
        speed: { min: 120, max: 420 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [style.glow, style.light, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        maxAliveParticles: 260,
        reserve: 60,
      });
      emitter.setDepth(depth);
      this.emitters.set(element, emitter);
    }
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
  }

  setCellSize(cellSize: number): void {
    this.cellSize = cellSize;
    const k = cellSize / 125;
    for (const e of this.emitters.values()) e.setScale(k);
  }

  /** Explosão de partículas na posição (coordenadas de mundo). */
  burst(element: ElementType, x: number, y: number, intensity = 1): void {
    const emitter = this.emitters.get(element);
    if (!emitter) return;
    const count = Math.round((this.reduced ? 4 : 11) * intensity);
    // O emissor está escalado; converter coordenadas para o seu espaço local.
    emitter.explode(count, x / emitter.scaleX, y / emitter.scaleY);
  }

  /** Pequeno abanão de câmara para impactos fortes (desligado em efeitos reduzidos). */
  shake(strength = 1): void {
    if (this.reduced) return;
    this.scene.cameras.main.shake(110, 0.0035 * strength * (this.cellSize / 125));
  }

  destroy(): void {
    for (const e of this.emitters.values()) e.destroy();
    this.emitters.clear();
  }
}
