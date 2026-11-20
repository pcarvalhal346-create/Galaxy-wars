import * as Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { ELEMENTS } from '../game/core/types';
import { progress } from '../storage/progress';
import { Button, IconButton } from '../ui/Button';
import { book, showElementBook } from '../ui/ElementBook';
import { Modal } from '../ui/Modal';
import { settingsButtons } from '../ui/SettingsButtons';
import { createSpeechBubble } from '../ui/SpeechBubble';
import { fadeIn, goTo, SCENES } from './keys';

/** Ecrã inicial: cenário, logótipo, botão JOGAR e definições. */
export class TitleScene extends Phaser.Scene {

  constructor() {
    super(SCENES.title);
  }

  create(): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 1080, height / 1920 * 1.15);
    fadeIn(this);
    audio.setMusic('menu');

    const bg = this.add.image(width / 2, height / 2, TEXTURE_KEYS.title);
    bg.setScale(Math.max(width / bg.width, height / bg.height));

    // Cristais a flutuar lentamente no céu.
    // Junto às margens, para não competir com o logótipo, a Lumi e o botão.
    for (let i = 0; i < 6; i++) {
      const e = ELEMENTS[i % ELEMENTS.length] ?? 'fire';
      const size = (70 + (i % 3) * 22) * s;
      const left = i % 2 === 0;
      const x = left ? width * (0.07 + (i % 3) * 0.03) : width * (0.93 - (i % 3) * 0.03);
      const y = height * (0.12 + i * 0.1);
      const c = this.add.image(x, y, TEXTURE_KEYS.tile(e)).setDisplaySize(size, size).setAlpha(0.85);
      this.tweens.add({ targets: c, y: y - 40 * s, angle: { from: -10, to: 10 }, duration: 2200 + i * 230, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const logo = this.add.image(width / 2, height * 0.2, TEXTURE_KEYS.logo);
    const logoScale = Math.min((width * 0.9) / logo.width, (height * 0.26) / logo.height);
    logo.setScale(logoScale);
    this.tweens.add({ targets: logo, y: logo.y + 14 * s, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(width / 2, height * 0.355, 'Combina. Molha. Eletrifica. Rebenta!', {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(38 * s)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: UI_COLORS.stroke,
        strokeThickness: Math.round(8 * s),
      })
      .setOrigin(0.5);

    this.addLumi(width, height, s);

    const play = new Button(this, width / 2, height * 0.77, {
      width: 560 * s,
      height: 170 * s,
      label: 'JOGAR',
      fontSize: 80 * s,
      color: UI_COLORS.orange,
      onClick: () => goTo(this, SCENES.map),
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const stars = progress.totalStars();
    if (stars > 0) {
      this.add
        .text(width / 2, height * 0.77 + 130 * s, `★ ${stars} estrelas conquistadas`, {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(32 * s)}px`,
          fontStyle: 'bold',
          color: UI_COLORS.accent,
          stroke: UI_COLORS.stroke,
          strokeThickness: Math.round(7 * s),
        })
        .setOrigin(0.5);
    }

    new IconButton(this, 110 * s, height - 120 * s, 130 * s, 'gear', UI_COLORS.violet, () => this.openSettings(s));
    new IconButton(this, 260 * s, height - 120 * s, 130 * s, 'book', UI_COLORS.blue, () => {
      showElementBook(this, 100, s, () => book.current?.close());
    });
    this.add
      .text(width - 30 * s, height - 30 * s, 'v0.4.0', { fontFamily: FONT_FAMILY, fontSize: `${Math.round(24 * s)}px`, color: '#ffffff', stroke: UI_COLORS.stroke, strokeThickness: 4 })
      .setOrigin(1, 1);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.restartOnResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.restartOnResize, this));
  }

  /** A Lumi em grande: a mascote do jogo. Toca nela para a ver reagir. */
  private addLumi(width: number, height: number, s: number): void {
    const size = Math.min(width * 0.62, height * 0.3);
    const x = width / 2;
    const y = height * 0.555;
    const glow = this.add.image(x, y + size * 0.05, TEXTURE_KEYS.spark).setTint(0xfff3c0).setAlpha(0.55);
    glow.setDisplaySize(size * 1.4, size * 1.4);
    this.tweens.add({ targets: glow, alpha: 0.25, scale: glow.scale * 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const lumi = this.add.image(x, y, TEXTURE_KEYS.lumi('happy')).setDisplaySize(size, size);
    const base = lumi.scale;
    this.tweens.add({ targets: lumi, y: y - 22 * s, scaleY: base * 1.03, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const lines = ['Olá! Eu sou a Lumi!', 'Vamos despertar os cristais?', 'Molha, eletrifica, rebenta!', 'Hihi, isso faz cócegas!', 'Estou pronta! E tu?'];
    let line = 0;
    let bubble = createSpeechBubble(this, x + size * 0.42, y - size * 0.55, lines[0] as string, s, { width: 300, fontSize: 34, tail: 'down' });
    bubble.setScale(0);
    this.tweens.add({ targets: bubble, scale: 1, delay: 600, duration: 320, ease: 'Back.easeOut' });

    lumi.setInteractive({ useHandCursor: true });
    lumi.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      audio.play('sparkle');
      lumi.setTexture(TEXTURE_KEYS.lumi('wow'));
      this.tweens.add({ targets: lumi, angle: { from: -10, to: 10 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => {
        lumi.setAngle(0).setTexture(TEXTURE_KEYS.lumi('happy'));
      } });
      line = (line + 1) % lines.length;
      bubble.destroy();
      bubble = createSpeechBubble(this, x + size * 0.42, y - size * 0.55, lines[line] as string, s, { width: 300, fontSize: 34, tail: 'down' });
      bubble.setScale(0.3);
      this.tweens.add({ targets: bubble, scale: 1, duration: 220, ease: 'Back.easeOut' });
    });
  }

  private restartOnResize(): void {
    this.scene.restart();
  }

  private openSettings(s: number): void {
    const w = Math.min(this.scale.width - 60 * s, 760 * s);
    const m: Modal = new Modal(this, 100, { title: 'Definições', width: w, height: 820 * s, scale: s, onClose: () => m.close() });
    m.add(settingsButtons(this, -250 * s, w * 0.8, 100 * s, 34 * s, s));
    let confirm = false;
    const reset: Button = new Button(this, 0, 150 * s, { width: w * 0.8, height: 100 * s, label: 'Apagar progresso', fontSize: 34 * s, color: 0xe0405a, onClick: () => {
      if (!confirm) {
        confirm = true;
        reset.setLabel('Tens a certeza? Toca outra vez');
        return;
      }
      progress.reset();
      m.close();
      this.scene.restart();
    } });
    m.add(reset);
    m.text(0, 290 * s, 'No iPhone, o som só toca com o interruptor de silêncio desligado.', 24, '#efe6ff', w * 0.8);
  }
}
