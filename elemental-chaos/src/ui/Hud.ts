import * as Phaser from 'phaser';
import { FONT_FAMILY, UI_COLORS } from '../config/theme';
import type { GameLayout } from '../view/layout';

/**
 * Zona superior: nível, objetivo, jogadas.
 * Na Fase 1 não há objetivos nem limite de jogadas; os campos já existem para a Fase 3.
 */
export class Hud {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly level: Phaser.GameObjects.Text;
  private readonly objective: Phaser.GameObjects.Text;
  private readonly movesLabel: Phaser.GameObjects.Text;
  private readonly movesValue: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene, depth: number) {
    const text = (size: number, color: string, bold = true) =>
      scene.add
        .text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color })
        .setDepth(depth + 1);
    this.panel = scene.add.graphics().setDepth(depth);
    this.title = text(40, UI_COLORS.accent).setOrigin(0.5, 0).setText('ELEMENTAL CHAOS');
    this.title.setStroke('#3a1b6b', 8).setShadow(0, 4, '#000000', 8, true, true);
    this.level = text(34, UI_COLORS.text).setOrigin(0, 0.5);
    this.objective = text(28, UI_COLORS.textDim, false).setOrigin(0, 0.5);
    this.movesLabel = text(24, UI_COLORS.textDim).setOrigin(0.5, 0.5).setText('JOGADAS');
    this.movesValue = text(56, UI_COLORS.text).setOrigin(0.5, 0.5);
  }

  setInfo(level: string, objective: string): void {
    this.level.setText(level);
    this.objective.setText(objective);
  }

  setMoves(moves: number): void {
    if (this.movesValue.text === String(moves)) return;
    this.movesValue.setText(String(moves));
    this.scene.tweens.add({ targets: this.movesValue, scale: { from: 1.25, to: 1 }, duration: 180, ease: 'Back.easeOut' });
  }

  relayout(layout: GameLayout): void {
    const s = layout.uiScale;
    const { hud } = layout;
    const pad = 30 * s;
    const top = hud.y + 22 * s;
    const font = (t: Phaser.GameObjects.Text, px: number) => t.setFontSize(Math.round(px * s));
    font(this.title, 44);
    font(this.level, 36);
    font(this.objective, 28);
    font(this.movesLabel, 17);
    font(this.movesValue, 58);

    this.title.setPosition(hud.x + hud.width / 2, top);
    const panelY = top + 70 * s;
    const panelH = hud.height - (panelY - hud.y) - 10 * s;
    const panelX = hud.x + pad;
    const panelW = hud.width - pad * 2;
    const g = this.panel;
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(panelX, panelY + 6 * s, panelW, panelH, 28 * s);
    g.fillStyle(UI_COLORS.panel, 0.9);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 28 * s);
    g.lineStyle(Math.max(2, 3 * s), UI_COLORS.panelEdge, 0.45);
    g.strokeRoundedRect(panelX, panelY, panelW, panelH, 28 * s);
    // Medalhão das jogadas, à direita.
    const badgeR = panelH * 0.42;
    const badgeX = panelX + panelW - badgeR - 24 * s;
    const badgeY = panelY + panelH / 2;
    g.fillStyle(UI_COLORS.violet, 0.35);
    g.fillCircle(badgeX, badgeY, badgeR);
    g.lineStyle(Math.max(2, 3 * s), UI_COLORS.accentNum, 0.8);
    g.strokeCircle(badgeX, badgeY, badgeR);

    this.level.setPosition(panelX + 30 * s, panelY + panelH * 0.34);
    this.objective.setPosition(panelX + 30 * s, panelY + panelH * 0.7);
    this.movesValue.setPosition(badgeX, badgeY + badgeR * 0.14);
    this.movesLabel.setPosition(badgeX, badgeY - badgeR * 0.55).setVisible(badgeR > 30 * s);
  }

  destroy(): void {
    for (const o of [this.panel, this.title, this.level, this.objective, this.movesLabel, this.movesValue]) o.destroy();
  }
}
