import * as Phaser from 'phaser';
import { FONT_FAMILY, UI_COLORS } from '../config/theme';
import { settings } from '../storage/settings';
import type { GameLayout } from '../view/layout';
import { Button } from './Button';

export interface PauseActions {
  onResume(): void;
  onRestart(): void;
}

/** Painel de pausa: continuar, reiniciar e preferência de efeitos reduzidos. */
export class PauseOverlay {
  private readonly root: Phaser.GameObjects.Container;
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private effectsButton: Button | null = null;

  constructor(private readonly scene: Phaser.Scene, depth: number, private readonly actions: PauseActions) {
    this.shade = scene.add.rectangle(0, 0, 10, 10, 0x05030f, 0.72).setOrigin(0).setInteractive();
    this.panel = scene.add.graphics();
    this.title = scene.add
      .text(0, 0, 'PAUSA', { fontFamily: FONT_FAMILY, fontSize: '64px', fontStyle: 'bold', color: UI_COLORS.accent })
      .setOrigin(0.5)
      .setStroke('#3a1b6b', 10);
    this.root = scene.add.container(0, 0, [this.shade, this.panel, this.title]).setDepth(depth).setVisible(false);
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  open(layout: GameLayout): void {
    this.relayout(layout);
    // Sem tween: o gestor de tweens fica em pausa enquanto o painel está aberto.
    this.root.setVisible(true).setAlpha(1);
  }

  close(): void {
    this.root.setVisible(false);
  }

  relayout(layout: GameLayout): void {
    const s = layout.uiScale;
    this.shade.setSize(layout.width, layout.height);
    this.shade.input?.hitArea.setTo(0, 0, layout.width, layout.height);
    const w = Math.min(layout.width - 60 * s, 760 * s);
    const h = 620 * s;
    const cx = layout.width / 2;
    const cy = layout.height / 2;
    const g = this.panel;
    g.clear();
    g.fillStyle(UI_COLORS.panel, 0.97);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 40 * s);
    g.lineStyle(Math.max(2, 4 * s), UI_COLORS.panelEdge, 0.8);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 40 * s);
    this.title.setFontSize(Math.round(64 * s)).setPosition(cx, cy - h / 2 + 80 * s);

    for (const b of this.buttons) b.destroy();
    const bw = w * 0.78;
    const bh = 112 * s;
    const fs = 40 * s;
    const mk = (y: number, label: string, onClick: () => void, fill?: number) =>
      new Button(this.scene, cx, y, { width: bw, height: bh, label, fontSize: fs, ...(fill !== undefined ? { fill } : {}), onClick });
    this.effectsButton = mk(cy + 215 * s, this.effectsLabel(), () => {
      settings.update({ reducedEffects: !settings.value.reducedEffects });
      this.effectsButton?.setLabel(this.effectsLabel());
    }, 0x2d356e);
    this.buttons = [
      mk(cy - 55 * s, 'Continuar', () => this.actions.onResume()),
      mk(cy + 80 * s, 'Reiniciar', () => this.actions.onRestart(), 0x8a3fbf),
      this.effectsButton,
    ];
    this.root.add(this.buttons);
  }

  private effectsLabel(): string {
    return `Efeitos reduzidos: ${settings.value.reducedEffects ? 'SIM' : 'NÃO'}`;
  }

  destroy(): void {
    this.root.destroy();
  }
}
