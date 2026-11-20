import * as Phaser from 'phaser';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { GameLayout } from '../view/layout';
import { IconButton } from './Button';

/** Zona inferior: espaços reservados para boosters (bloqueados) e botão de pausa. */
export class Footer {
  private readonly bubbles: Phaser.GameObjects.Image[] = [];
  private readonly locks: Phaser.GameObjects.Image[] = [];
  private readonly hint: Phaser.GameObjects.Text;
  private pause: IconButton | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number, private readonly onPause: () => void) {
    for (let i = 0; i < 3; i++) {
      this.bubbles.push(scene.add.image(0, 0, TEXTURE_KEYS.node('locked')).setDepth(depth).setAlpha(0.9));
      this.locks.push(scene.add.image(0, 0, TEXTURE_KEYS.iconLock).setDepth(depth + 1));
    }
    this.hint = scene.add
      .text(0, 0, 'Poderes — em breve', { fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: UI_COLORS.stroke, strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(depth + 1);
  }

  relayout(layout: GameLayout): void {
    const s = layout.uiScale;
    const { footer } = layout;
    const cy = footer.y + footer.height * 0.44;
    const r = 58 * s;
    const startX = footer.x + 40 * s + r;
    this.bubbles.forEach((b, i) => {
      const x = startX + i * r * 2.3;
      b.setPosition(x, cy).setDisplaySize(r * 2, r * 2);
      this.locks[i]?.setPosition(x, cy).setDisplaySize(r * 0.9, r * 0.9);
    });
    this.hint.setFontSize(Math.round(22 * s)).setStroke(UI_COLORS.stroke, 5 * s).setPosition(startX + r * 2.3, cy + r + 24 * s);
    this.pause?.destroy();
    const size = 120 * s;
    this.pause = new IconButton(this.scene, footer.x + footer.width - 40 * s - size / 2, cy, size, 'pause', UI_COLORS.violet, this.onPause);
    this.pause.setDepth(this.depth + 1);
  }

  destroy(): void {
    [...this.bubbles, ...this.locks, this.hint].forEach((o) => o.destroy());
    this.pause?.destroy();
  }
}
