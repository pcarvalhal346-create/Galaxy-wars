import * as Phaser from 'phaser';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { GameLayout } from '../view/layout';
import { IconButton } from './Button';

/** Zona inferior: poderes (bloqueados), a mascote Lumi e o botão de pausa. */
export class Footer {
  private readonly bubbles: Phaser.GameObjects.Image[] = [];
  private readonly locks: Phaser.GameObjects.Image[] = [];
  private readonly hint: Phaser.GameObjects.Text;
  private readonly lumi: Phaser.GameObjects.Image;
  private lumiBase = { y: 0, scale: 1 };
  private idle: Phaser.Tweens.Tween | null = null;
  private pause: IconButton | null = null;
  private book: IconButton | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
    private readonly onPause: () => void,
    private readonly onBook: () => void,
  ) {
    for (let i = 0; i < 3; i++) {
      this.bubbles.push(scene.add.image(0, 0, TEXTURE_KEYS.node('locked')).setDepth(depth).setAlpha(0.9));
      this.locks.push(scene.add.image(0, 0, TEXTURE_KEYS.iconLock).setDepth(depth + 1));
    }
    this.hint = scene.add
      .text(0, 0, 'Poderes — em breve', { fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: UI_COLORS.stroke, strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(depth + 1);
    this.lumi = scene.add.image(0, 0, TEXTURE_KEYS.lumi('happy')).setDepth(depth + 1);
  }

  relayout(layout: GameLayout): void {
    const s = layout.uiScale;
    const { footer } = layout;
    const r = 52 * s;
    const cy = footer.y + Math.min(footer.height * 0.44, 110 * s);
    const startX = footer.x + 36 * s + r;
    this.bubbles.forEach((b, i) => {
      const x = startX + i * r * 2.25;
      b.setPosition(x, cy).setDisplaySize(r * 2, r * 2);
      this.locks[i]?.setPosition(x, cy).setDisplaySize(r * 0.9, r * 0.9);
    });
    this.hint.setFontSize(Math.round(21 * s)).setStroke(UI_COLORS.stroke, 5 * s).setPosition(startX + r * 2.25, cy + r + 22 * s);

    this.pause?.destroy();
    this.book?.destroy();
    const size = 112 * s;
    const px = footer.x + footer.width - 36 * s - size / 2;
    this.pause = new IconButton(this.scene, px, cy, size, 'pause', UI_COLORS.violet, this.onPause).setDepth(this.depth + 1);
    this.book = new IconButton(this.scene, px - size * 1.1, cy, size * 0.9, 'book', UI_COLORS.blue, this.onBook).setDepth(this.depth + 1);

    // A Lumi ocupa o espaço livre (cresce em ecrãs altos).
    const left = startX + r * 5.5;
    const right = px - size * 1.7;
    const lumiSize = Math.max(120 * s, Math.min(footer.height * 0.95, right - left, 360 * s));
    const lx = (left + right) / 2;
    const ly = footer.y + footer.height - lumiSize * 0.5 - 6 * s;
    this.idle?.stop();
    this.lumi.setPosition(lx, ly).setDisplaySize(lumiSize, lumiSize).setVisible(right - left > 100 * s);
    this.lumiBase = { y: ly, scale: this.lumi.scale };
    this.idle = this.scene.tweens.add({ targets: this.lumi, y: ly - 10 * s, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** A Lumi festeja (salta e faz "uau") numa jogada especial. */
  cheer(strong: boolean): void {
    if (!this.lumi.visible) return;
    this.lumi.setTexture(TEXTURE_KEYS.lumi('wow'));
    const { scale } = this.lumiBase;
    this.scene.tweens.add({
      targets: this.lumi,
      scaleX: scale * (strong ? 1.2 : 1.1),
      scaleY: scale * (strong ? 1.25 : 1.12),
      angle: { from: -6, to: 6 },
      duration: 140,
      yoyo: true,
      repeat: strong ? 2 : 1,
      onComplete: () => {
        this.lumi.setScale(scale).setAngle(0).setTexture(TEXTURE_KEYS.lumi('happy'));
      },
    });
  }

  destroy(): void {
    this.idle?.stop();
    [...this.bubbles, ...this.locks, this.hint, this.lumi].forEach((o) => o.destroy());
    this.pause?.destroy();
    this.book?.destroy();
  }
}
