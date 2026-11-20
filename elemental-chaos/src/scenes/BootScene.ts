import * as Phaser from 'phaser';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { ELEMENTS } from '../game/core/types';
import { createCrystalCanvas, createOrbCanvas, createParticleCanvas, createRingCanvas, createSmokeCanvas, createSparkCanvas, createSpecialCrystalCanvas, createWetCanvas } from '../effects/crystalArt';
import { createLandscapeCanvas } from '../effects/sceneryArt';
import {
  createLightningIconCanvas,
  createLockCanvas,
  createLogoCanvas,
  createNodeCanvas,
  createStarCanvas,
  createSteamIconCanvas,
} from '../effects/uiArt';
import { createHandCanvas, createLumiCanvas } from '../effects/mascotArt';
import { SCENES } from './keys';

/**
 * Arranque: gera as texturas originais (sem assets externos) com barra de progresso.
 * Os fundos de cada tema são gerados quando são precisos (ver ensureTexture).
 * Quando existirem sprites finais, este é o sítio para os carregar com `this.load`.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 1080, height / 1920);
    this.cameras.main.setBackgroundColor('#5a2bb8');
    this.add
      .text(width / 2, height / 2 - 60 * s, 'ELEMENTAL CHAOS', {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(72 * s)}px`,
        fontStyle: 'bold',
        color: UI_COLORS.accent,
        stroke: UI_COLORS.stroke,
        strokeThickness: 12 * s,
      })
      .setOrigin(0.5);
    const barW = 520 * s;
    const barH = 22 * s;
    const track = this.add.graphics();
    track.fillStyle(0x2a0f5a, 0.8).fillRoundedRect(width / 2 - barW / 2, height / 2 + 40 * s, barW, barH, barH / 2);
    const bar = this.add.graphics();

    const jobs: [string, () => HTMLCanvasElement][] = [
      [TEXTURE_KEYS.spark, () => createSparkCanvas()],
      [TEXTURE_KEYS.ring, () => createRingCanvas()],
      [TEXTURE_KEYS.wet, () => createWetCanvas()],
      [TEXTURE_KEYS.smoke, () => createSmokeCanvas()],
      ...ELEMENTS.map((e): [string, () => HTMLCanvasElement] => [TEXTURE_KEYS.tile(e), () => createCrystalCanvas(e)]),
      ...ELEMENTS.flatMap((e) =>
        (['lance-h', 'lance-v', 'core'] as const).map((k): [string, () => HTMLCanvasElement] => [TEXTURE_KEYS.special(e, k), () => createSpecialCrystalCanvas(e, k)]),
      ),
      [TEXTURE_KEYS.orb, () => createOrbCanvas()],
      ...(['flame', 'drop', 'shard', 'wisp'] as const).map((k): [string, () => HTMLCanvasElement] => [TEXTURE_KEYS.particle(k), () => createParticleCanvas(k)]),
      [TEXTURE_KEYS.lumi('sad'), () => createLumiCanvas(512, 'sad')],
      [TEXTURE_KEYS.logo, () => createLogoCanvas()],
      [TEXTURE_KEYS.starFull, () => createStarCanvas(128, true)],
      [TEXTURE_KEYS.starEmpty, () => createStarCanvas(128, false)],
      [TEXTURE_KEYS.node('open'), () => createNodeCanvas(200, 'open')],
      [TEXTURE_KEYS.node('done'), () => createNodeCanvas(200, 'done')],
      [TEXTURE_KEYS.node('locked'), () => createNodeCanvas(200, 'locked')],
      [TEXTURE_KEYS.iconLock, () => createLockCanvas(96)],
      [TEXTURE_KEYS.iconSteam, () => createSteamIconCanvas(128)],
      [TEXTURE_KEYS.iconLightning, () => createLightningIconCanvas(128)],
      [TEXTURE_KEYS.title, () => createLandscapeCanvas('title', 540, 960)],
      [TEXTURE_KEYS.lumi('happy'), () => createLumiCanvas(512, 'happy')],
      [TEXTURE_KEYS.lumi('wow'), () => createLumiCanvas(512, 'wow')],
      [TEXTURE_KEYS.hand, () => createHandCanvas(160)],
    ];
    let done = 0;
    // Um trabalho por frame: a barra de progresso avança de forma visível.
    const step = () => {
      const job = jobs[done];
      if (job && !this.textures.exists(job[0])) this.textures.addCanvas(job[0], job[1]());
      done++;
      bar.clear();
      bar.fillStyle(UI_COLORS.accentNum, 1).fillRoundedRect(width / 2 - barW / 2, height / 2 + 40 * s, (barW * done) / jobs.length, barH, barH / 2);
      if (done < jobs.length) this.time.delayedCall(0, step);
      else this.time.delayedCall(120, () => this.scene.start(SCENES.title));
    };
    step();
  }
}
