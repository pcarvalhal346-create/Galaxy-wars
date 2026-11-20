import * as Phaser from 'phaser';
import { ELEMENT_STYLE, FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { ELEMENTS, type ElementType } from '../game/core/types';
import { tweenAsync } from '../utils/async';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Efeitos visuais reutilizáveis: emissores de partículas criados uma vez e disparados
 * com `explode` (sem lixo por match), relâmpagos, flashes e textos flutuantes.
 */
export class Effects {
  private readonly emitters = new Map<ElementType, Phaser.GameObjects.Particles.ParticleEmitter>();
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bolts: Phaser.GameObjects.Graphics;
  private reduced = false;
  private cellSize = 100;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {
    for (const element of ELEMENTS) {
      const style = ELEMENT_STYLE[element];
      const emitter = scene.add.particles(0, 0, TEXTURE_KEYS.spark, {
        emitting: false,
        lifespan: { min: 300, max: 560 },
        speed: { min: 140, max: 460 },
        scale: { start: 0.95, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 300,
        tint: [style.glow, style.light, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        maxAliveParticles: 260,
        reserve: 60,
      });
      emitter.setDepth(depth);
      this.emitters.set(element, emitter);
    }
    this.smoke = scene.add.particles(0, 0, TEXTURE_KEYS.smoke, {
      emitting: false,
      lifespan: { min: 500, max: 850 },
      speed: { min: 60, max: 260 },
      scale: { start: 0.6, end: 2.2 },
      alpha: { start: 0.85, end: 0 },
      gravityY: -160,
      rotate: { min: 0, max: 360 },
      tint: [0xffffff, 0xfff0e0, 0xe8f4ff],
      maxAliveParticles: 120,
      reserve: 30,
    });
    this.smoke.setDepth(depth + 1);
    this.bolts = scene.add.graphics().setDepth(depth + 2).setBlendMode(Phaser.BlendModes.ADD);
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
  }

  setCellSize(cellSize: number): void {
    this.cellSize = cellSize;
    const k = cellSize / 125;
    for (const e of this.emitters.values()) e.setScale(k);
    this.smoke.setScale(k);
  }

  /** Explosão de partículas na posição (coordenadas de mundo). */
  burst(element: ElementType, x: number, y: number, intensity = 1): void {
    const emitter = this.emitters.get(element);
    if (!emitter) return;
    const count = Math.round((this.reduced ? 4 : 12) * intensity);
    emitter.explode(count, x / emitter.scaleX, y / emitter.scaleY);
  }

  /** Vapor: nuvens a expandir, clarão laranja e anel de choque. */
  async steam(center: Point, areaSize: number): Promise<void> {
    this.smoke.explode(this.reduced ? 5 : 14, center.x / this.smoke.scaleX, center.y / this.smoke.scaleY);
    const flash = this.scene.add.image(center.x, center.y, TEXTURE_KEYS.spark).setDepth(this.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
    flash.setTint(0xffb347).setScale(0.5).setAlpha(0.95);
    const ring = this.scene.add.graphics().setDepth(this.depth + 1).setPosition(center.x, center.y);
    ring.lineStyle(this.cellSize * 0.12, 0xffffff, 0.9).strokeCircle(0, 0, areaSize * 0.3);
    ring.setScale(0.4);
    this.shake(1.3);
    await Promise.all([
      tweenAsync(this.scene, { targets: flash, scale: (areaSize / flash.width) * 2.2, alpha: 0, duration: 320, ease: 'Cubic.easeOut' }),
      tweenAsync(this.scene, { targets: ring, scale: 1.6, alpha: 0, duration: 320, ease: 'Cubic.easeOut' }),
    ]);
    flash.destroy();
    ring.destroy();
  }

  /** Relâmpagos em ziguezague entre pares de pontos, a piscar. */
  async lightning(links: readonly (readonly [Point, Point])[], hits: readonly Point[]): Promise<void> {
    const g = this.bolts;
    const flickers = this.reduced ? 2 : 4;
    for (let f = 0; f < flickers; f++) {
      g.clear();
      for (const [a, b] of links) this.drawBolt(g, a, b);
      g.setAlpha(1);
      await tweenAsync(this.scene, { targets: g, alpha: 0.35, duration: 55 });
    }
    for (const h of hits) this.burst('lightning', h.x, h.y, 0.8);
    await tweenAsync(this.scene, { targets: g, alpha: 0, duration: 120 });
    g.clear();
  }

  private drawBolt(g: Phaser.GameObjects.Graphics, a: Point, b: Point): void {
    const segments = 6;
    const pts: Point[] = [a];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const off = (Math.random() - 0.5) * this.cellSize * 0.35;
      pts.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
    }
    pts.push(b);
    const stroke = (width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(a.x, a.y);
      for (const p of pts) g.lineTo(p.x, p.y);
      g.strokePath();
    };
    stroke(this.cellSize * 0.2, 0x9a5cff, 0.45);
    stroke(this.cellSize * 0.09, 0xffe84a, 0.95);
    stroke(this.cellSize * 0.035, 0xffffff, 1);
  }

  /** Pequeno abanão de câmara para impactos fortes (desligado em efeitos reduzidos). */
  shake(strength = 1): void {
    if (this.reduced) return;
    this.scene.cameras.main.shake(120, 0.004 * strength * (this.cellSize / 125));
  }

  /** Pontos a flutuar a partir de um ponto. */
  floatingScore(x: number, y: number, points: number, color: number): void {
    const t = this.scene.add
      .text(x, y, `+${points}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(this.cellSize * 0.42)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: `#${color.toString(16).padStart(6, '0')}`,
        strokeThickness: Math.round(this.cellSize * 0.08),
      })
      .setOrigin(0.5)
      .setDepth(this.depth + 5);
    this.scene.tweens.add({ targets: t, y: y - this.cellSize * 0.8, alpha: { from: 1, to: 0 }, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** Rótulo curto sobre o tabuleiro (ex.: nome da reação). */
  label(x: number, y: number, text: string, color: string): void {
    // Mantém o rótulo dentro do ecrã (reações junto às margens).
    const margin = this.cellSize * 1.6;
    x = Math.min(Math.max(x, margin), this.scene.scale.width - margin);
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(this.cellSize * 0.4)}px`,
        fontStyle: 'bold',
        color,
        stroke: UI_COLORS.stroke,
        strokeThickness: Math.round(this.cellSize * 0.09),
      })
      .setOrigin(0.5)
      .setDepth(this.depth + 5)
      .setScale(0.3);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, y: y - this.cellSize * 0.5, delay: 600, duration: 300, onComplete: () => t.destroy() });
  }

  /** Grande mensagem de elogio no centro (GOOD!, GREAT!, AMAZING!, ELEMENTAL CHAOS!). */
  async feedback(x: number, y: number, text: string, big: boolean): Promise<void> {
    const size = this.cellSize * (big ? 0.95 : 0.8);
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(size)}px`,
        fontStyle: 'bold',
        color: '#fff3a0',
        stroke: UI_COLORS.stroke,
        strokeThickness: Math.round(size * 0.2),
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(this.depth + 6)
      .setScale(0.2)
      .setAngle(-6);
    t.setShadow(0, size * 0.08, 'rgba(255, 90, 200, 0.9)', size * 0.15, true, true);
    if (big && !this.reduced) {
      for (const e of ELEMENTS) this.burst(e, x + (Math.random() - 0.5) * this.cellSize * 3, y, 1.2);
    }
    await tweenAsync(this.scene, { targets: t, scale: 1, angle: 0, duration: 260, ease: 'Back.easeOut' });
    await tweenAsync(this.scene, { targets: t, scale: 1.08, alpha: 0, delay: 380, duration: 260, ease: 'Cubic.easeIn' });
    t.destroy();
  }

  /** Mini-cristal a voar do tabuleiro até ao ícone de objetivo do HUD. */
  flyTo(texture: string, from: Point, to: Point, size: number, delay: number): Promise<void> {
    const img = this.scene.add.image(from.x, from.y, texture).setDepth(this.depth + 4);
    img.setDisplaySize(size, size);
    const midX = (from.x + to.x) / 2 + (Math.random() - 0.5) * size * 3;
    const midY = Math.min(from.y, to.y) - size;
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2(midX, midY), new Phaser.Math.Vector2(to.x, to.y));
    const state = { t: 0 };
    return tweenAsync(this.scene, {
      targets: state,
      t: 1,
      delay,
      duration: 520,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const p = curve.getPoint(state.t);
        img.setPosition(p.x, p.y);
        img.setScale(img.scaleX * 0.995);
      },
    }).then(() => {
      img.destroy();
    });
  }

  destroy(): void {
    for (const e of this.emitters.values()) e.destroy();
    this.emitters.clear();
    this.smoke.destroy();
    this.bolts.destroy();
  }
}
