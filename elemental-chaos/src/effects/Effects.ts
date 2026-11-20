import * as Phaser from 'phaser';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
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
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly glitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly ice: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bolts: Phaser.GameObjects.Graphics;
  private reduced = false;
  private cellSize = 100;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {
    // Cada elemento tem partículas próprias (forma, movimento e cor).
    const configs: Record<ElementType, [string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig]> = {
      // Fogo: chamas que sobem.
      fire: [TEXTURE_KEYS.particle('flame'), {
        lifespan: { min: 380, max: 700 }, speed: { min: 60, max: 220 }, angle: { min: 235, max: 305 },
        gravityY: -420, scale: { start: 1.1, end: 0.1 }, alpha: { start: 1, end: 0 },
        tint: [0xfff3a0, 0xffb02e, 0xff5a1f, 0xd6260b], blendMode: Phaser.BlendModes.ADD,
      }],
      // Água: gotas que saltam e caem.
      water: [TEXTURE_KEYS.particle('drop'), {
        lifespan: { min: 450, max: 750 }, speed: { min: 180, max: 420 }, angle: { min: 200, max: 340 },
        gravityY: 1300, scale: { start: 0.75, end: 0.35 }, alpha: { start: 1, end: 0.2 },
        tint: [0xc9f5ff, 0x5fd6ff, 0x1fa8ff],
      }],
      // Raio: faíscas rápidas e muito brilhantes.
      lightning: [TEXTURE_KEYS.spark, {
        lifespan: { min: 120, max: 300 }, speed: { min: 380, max: 820 },
        scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 },
        tint: [0xffffff, 0xfff6a0, 0xffd000, 0xb48cff], blendMode: Phaser.BlendModes.ADD,
      }],
      // Terra: lascas de pedra a rodar que caem.
      earth: [TEXTURE_KEYS.particle('shard'), {
        lifespan: { min: 600, max: 950 }, speed: { min: 140, max: 360 }, angle: { min: 210, max: 330 },
        gravityY: 1600, rotate: { min: 0, max: 360 }, scale: { start: 0.85, end: 0.5 }, alpha: { start: 1, end: 0.3 },
        tint: [0x27cc5e, 0x0b7433, 0x8a6a3a, 0x5c4a2a],
      }],
      // Ar: redemoinhos que rodam e se espalham.
      air: [TEXTURE_KEYS.particle('wisp'), {
        lifespan: { min: 500, max: 850 }, speed: { min: 90, max: 240 },
        rotate: { start: 0, end: 540 }, scale: { start: 0.5, end: 1.3 }, alpha: { start: 0.95, end: 0 },
        tint: [0xf2fffc, 0xb2fff0, 0x55ecd0], blendMode: Phaser.BlendModes.ADD,
      }],
    };
    for (const element of ELEMENTS) {
      const [texture, cfg] = configs[element];
      const emitter = scene.add.particles(0, 0, texture, { ...cfg, emitting: false, maxAliveParticles: 220, reserve: 40 });
      emitter.setDepth(depth);
      this.emitters.set(element, emitter);
    }
    this.sparks = scene.add.particles(0, 0, TEXTURE_KEYS.spark, {
      emitting: false, lifespan: { min: 250, max: 500 }, speed: { min: 200, max: 600 },
      scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xfff3a0],
      blendMode: Phaser.BlendModes.ADD, maxAliveParticles: 200, reserve: 40,
    });
    this.sparks.setDepth(depth + 1);
    // Estrelinhas brilhantes que acompanham todas as explosões (toque "doce").
    this.glitter = scene.add.particles(0, 0, TEXTURE_KEYS.star, {
      emitting: false, lifespan: { min: 400, max: 750 }, speed: { min: 60, max: 260 },
      scale: { start: 0.9, end: 0 }, rotate: { start: 0, end: 180 }, alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfff3a0, 0xffd0f0], blendMode: Phaser.BlendModes.ADD, maxAliveParticles: 160, reserve: 30,
    });
    this.glitter.setDepth(depth + 1);
    this.ice = scene.add.particles(0, 0, TEXTURE_KEYS.particle('shard'), {
      emitting: false, lifespan: { min: 500, max: 850 }, speed: { min: 160, max: 380 }, angle: { min: 200, max: 340 },
      gravityY: 1500, rotate: { min: 0, max: 360 }, scale: { start: 0.8, end: 0.4 }, alpha: { start: 1, end: 0.2 },
      tint: [0xffffff, 0xdff6ff, 0x9fdcff], maxAliveParticles: 160, reserve: 30,
    });
    this.ice.setDepth(depth + 1);
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
    this.sparks.setScale(k);
    this.glitter.setScale(k);
    this.ice.setScale(k);
  }

  /** Explosão de partículas na posição (coordenadas de mundo). */
  burst(element: ElementType, x: number, y: number, intensity = 1): void {
    const emitter = this.emitters.get(element);
    if (!emitter) return;
    const count = Math.round((this.reduced ? 4 : 14) * intensity);
    emitter.explode(count, x / emitter.scaleX, y / emitter.scaleY);
    if (!this.reduced) this.glitter.explode(Math.round(3 * intensity), x / this.glitter.scaleX, y / this.glitter.scaleY);
  }

  /** Clarão colorido rápido atrás de uma peça que rebenta. */
  flash(x: number, y: number, color: number): void {
    if (this.reduced) return;
    const f = this.scene.add.image(x, y, TEXTURE_KEYS.spark).setDepth(this.depth - 1).setBlendMode(Phaser.BlendModes.ADD).setTint(color);
    const base = (this.cellSize * 1.1) / f.width;
    f.setScale(base * 0.4).setAlpha(0.95);
    this.scene.tweens.add({ targets: f, scale: base * 1.6, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => f.destroy() });
  }

  /** Pequena nuvem de vapor num ponto (peça a vaporizar). */
  puff(x: number, y: number, count = 3): void {
    this.smoke.explode(this.reduced ? 1 : count, x / this.smoke.scaleX, y / this.smoke.scaleY);
  }

  /** Estilhaços de gelo (lascas azul-claras a cair). */
  iceShatter(x: number, y: number): void {
    const e = this.ice;
    e.explode(this.reduced ? 3 : 9, x / e.scaleX, y / e.scaleY);
    this.spark(x, y, 4);
  }

  /** Faíscas brancas/douradas num ponto. */
  spark(x: number, y: number, count = 8): void {
    this.sparks.explode(this.reduced ? Math.ceil(count / 3) : count, x / this.sparks.scaleX, y / this.sparks.scaleY);
  }

  /** Lança: raio de luz a varrer a linha ou a coluna, a partir do cristal. */
  async beam(from: Point, horizontal: boolean, length: number, color: number): Promise<void> {
    const g = this.scene.add.graphics().setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD);
    const w = this.cellSize * 0.8;
    const state = { t: 0 };
    this.shake(0.8);
    await tweenAsync(this.scene, {
      targets: state,
      t: 1,
      duration: 260,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        const reach = length * state.t;
        const a = 1 - state.t * 0.4;
        for (const [width, col, alpha] of [[w, color, 0.35 * a], [w * 0.45, 0xffffff, 0.8 * a], [w * 0.15, 0xffffff, a]] as const) {
          g.fillStyle(col, alpha);
          if (horizontal) g.fillRect(from.x - reach, from.y - width / 2, reach * 2, width);
          else g.fillRect(from.x - width / 2, from.y - reach, width, reach * 2);
        }
      },
    });
    await tweenAsync(this.scene, { targets: g, alpha: 0, duration: 140 });
    g.destroy();
  }

  /** Núcleo: onda de choque em anel + clarão dourado. */
  async shockwave(center: Point, radius: number, color: number): Promise<void> {
    const ring = this.scene.add.graphics().setDepth(this.depth + 2).setPosition(center.x, center.y).setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(this.cellSize * 0.18, color, 0.9).strokeCircle(0, 0, radius);
    ring.lineStyle(this.cellSize * 0.06, 0xffffff, 1).strokeCircle(0, 0, radius);
    ring.setScale(0.15);
    const flash = this.scene.add.image(center.x, center.y, TEXTURE_KEYS.spark).setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe27a);
    flash.setScale(0.5);
    this.spark(center.x, center.y, 16);
    this.shake(1.4);
    await Promise.all([
      tweenAsync(this.scene, { targets: ring, scale: 1.1, alpha: 0, duration: 380, ease: 'Cubic.easeOut' }),
      tweenAsync(this.scene, { targets: flash, scale: (radius * 3) / flash.width, alpha: 0, duration: 380, ease: 'Cubic.easeOut' }),
    ]);
    ring.destroy();
    flash.destroy();
  }

  /** Orbe do Caos: raios multicolores do Orbe para cada alvo. */
  async orbRays(from: Point, targets: readonly Point[]): Promise<void> {
    this.shake(1.6);
    await this.lightning(targets.map((t) => [from, t] as const), targets, [0xff8a3c, 0x5fd6ff, 0xffe84a, 0x5cf08c, 0xb2fff0]);
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
  async lightning(links: readonly (readonly [Point, Point])[], hits: readonly Point[], colors?: readonly number[]): Promise<void> {
    const g = this.bolts;
    const flickers = this.reduced ? 2 : 4;
    for (let f = 0; f < flickers; f++) {
      g.clear();
      links.forEach(([a, b], i) => this.drawBolt(g, a, b, colors?.[i % colors.length]));
      g.setAlpha(1);
      await tweenAsync(this.scene, { targets: g, alpha: 0.35, duration: 55 });
    }
    for (const h of hits) this.burst('lightning', h.x, h.y, 0.8);
    await tweenAsync(this.scene, { targets: g, alpha: 0, duration: 120 });
    g.clear();
  }

  private drawBolt(g: Phaser.GameObjects.Graphics, a: Point, b: Point, color = 0xffe84a): void {
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
    stroke(this.cellSize * 0.09, color, 0.95);
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
        fontStyle: 'normal',
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
        fontStyle: 'normal',
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
        fontStyle: 'normal',
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
    this.sparks.destroy();
    this.glitter.destroy();
    this.ice.destroy();
    this.bolts.destroy();
  }
}
