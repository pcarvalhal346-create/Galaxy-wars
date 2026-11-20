import * as Phaser from 'phaser';
import { FONT_FAMILY, UI_COLORS } from '../config/theme';
import type { GameLayout } from '../view/layout';

/** Zona inferior: botão de pausa e espaços reservados para boosters futuros. */
export class Footer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly pauseHit: Phaser.GameObjects.Zone;
  private readonly hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, depth: number, onPause: () => void) {
    this.g = scene.add.graphics().setDepth(depth);
    this.pauseHit = scene.add.zone(0, 0, 10, 10).setDepth(depth + 1).setInteractive({ useHandCursor: true });
    this.pauseHit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onPause);
    this.hint = scene.add
      .text(0, 0, 'Boosters — em breve', { fontFamily: FONT_FAMILY, fontSize: '22px', color: UI_COLORS.textDim })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(depth + 1);
  }

  relayout(layout: GameLayout): void {
    const s = layout.uiScale;
    const { footer } = layout;
    const g = this.g;
    g.clear();
    const cy = footer.y + footer.height * 0.45;
    const r = 56 * s;
    const px = footer.x + 40 * s + r;

    // Botão de pausa (círculo com duas barras).
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(px, cy + 5 * s, r);
    g.fillStyle(UI_COLORS.violet, 1);
    g.fillCircle(px, cy, r);
    g.lineStyle(Math.max(2, 4 * s), 0xd9ceff, 0.9);
    g.strokeCircle(px, cy, r);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(px - r * 0.34, cy - r * 0.38, r * 0.22, r * 0.76, r * 0.08);
    g.fillRoundedRect(px + r * 0.12, cy - r * 0.38, r * 0.22, r * 0.76, r * 0.08);
    this.pauseHit.setPosition(px, cy).setSize(r * 2.4, r * 2.4);
    // Zone precisa de atualizar a área de toque quando muda de tamanho.
    this.pauseHit.input?.hitArea.setTo(0, 0, r * 2.4, r * 2.4);

    // Três espaços de booster bloqueados.
    const slotR = 44 * s;
    const startX = px + r + 90 * s;
    for (let i = 0; i < 3; i++) {
      const x = startX + i * slotR * 2.6;
      g.fillStyle(UI_COLORS.panel, 0.7);
      g.fillCircle(x, cy, slotR);
      g.lineStyle(Math.max(2, 3 * s), UI_COLORS.panelEdge, 0.3);
      g.strokeCircle(x, cy, slotR);
    }
    this.hint.setFontSize(Math.round(22 * s)).setPosition(startX + slotR * 2.6, cy + slotR + 26 * s);
  }

  destroy(): void {
    this.g.destroy();
    this.pauseHit.destroy();
    this.hint.destroy();
  }
}
