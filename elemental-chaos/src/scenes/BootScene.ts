import * as Phaser from 'phaser';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { ELEMENTS } from '../game/core/types';
import { createBackgroundCanvas, createCrystalCanvas, createRingCanvas, createSparkCanvas } from '../effects/crystalArt';

/**
 * Arranque: gera as texturas temporárias (sem assets externos) com indicação de progresso.
 * Quando existirem sprites finais, este é o sítio para os carregar com `this.load`.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 1080, height / 1920);
    this.cameras.main.setBackgroundColor(UI_COLORS.bgTop);
    this.add
      .text(width / 2, height / 2 - 60 * s, 'ELEMENTAL CHAOS', {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(72 * s)}px`,
        fontStyle: 'bold',
        color: UI_COLORS.accent,
      })
      .setOrigin(0.5)
      .setStroke('#3a1b6b', 12 * s);
    const barW = 520 * s;
    const barH = 18 * s;
    const track = this.add.graphics();
    track.fillStyle(0xffffff, 0.12).fillRoundedRect(width / 2 - barW / 2, height / 2 + 40 * s, barW, barH, barH / 2);
    const bar = this.add.graphics();

    const jobs: (() => void)[] = [
      () => this.addCanvas(TEXTURE_KEYS.background, createBackgroundCanvas()),
      () => this.addCanvas(TEXTURE_KEYS.spark, createSparkCanvas()),
      () => this.addCanvas(TEXTURE_KEYS.ring, createRingCanvas()),
      ...ELEMENTS.map((e) => () => this.addCanvas(TEXTURE_KEYS.tile(e), createCrystalCanvas(e))),
    ];
    let done = 0;
    // Um trabalho por frame: a barra de progresso é atualizada de forma visível.
    const step = () => {
      jobs[done]?.();
      done++;
      bar.clear();
      bar.fillStyle(UI_COLORS.accentNum, 1).fillRoundedRect(width / 2 - barW / 2, height / 2 + 40 * s, (barW * done) / jobs.length, barH, barH / 2);
      if (done < jobs.length) this.time.delayedCall(0, step);
      else this.time.delayedCall(150, () => this.scene.start('Game'));
    };
    step();
  }

  private addCanvas(key: string, canvas: HTMLCanvasElement): void {
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }
}
