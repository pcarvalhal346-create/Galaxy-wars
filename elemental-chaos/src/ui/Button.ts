import * as Phaser from 'phaser';
import { FONT_FAMILY } from '../config/theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  fontSize: number;
  fill?: number;
  edge?: number;
  textColor?: string;
  onClick: () => void;
}

/** Botão arredondado com feedback de pressão. Usado em todos os menus. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private opts: ButtonOptions;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    this.opts = opts;
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, opts.label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(opts.fontSize)}px`,
        fontStyle: 'bold',
        color: opts.textColor ?? '#ffffff',
      })
      .setOrigin(0.5);
    this.add([this.bg, this.text]);
    this.redraw();
    this.setSize(opts.width, opts.height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.setScale(0.95));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setScale(1));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.setScale(1);
      this.opts.onClick();
    });
    scene.add.existing(this);
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  private redraw(): void {
    const { width: w, height: h } = this.opts;
    const r = Math.min(h / 2, 40);
    const g = this.bg;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2, -h / 2 + h * 0.08, w, h, r);
    g.fillStyle(this.opts.fill ?? 0x5b3fd6, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0xffffff, 0.14);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.45, { tl: r - 4, tr: r - 4, bl: 6, br: 6 });
    g.lineStyle(3, this.opts.edge ?? 0xb7a6ff, 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }
}
