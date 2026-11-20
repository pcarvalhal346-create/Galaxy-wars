import * as Phaser from 'phaser';
import { FONT_FAMILY, UI_COLORS } from '../config/theme';
import type { IconKind } from '../effects/uiArt';
import { iconButtonTexture, pillTexture } from './textures';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  fontSize: number;
  color?: number;
  onClick: () => void;
}

/** Botão em pílula brilhante com texto. Feedback de pressão sem tweens (funciona em pausa). */
export class Button extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    const key = pillTexture(scene, opts.width, opts.height, opts.color ?? UI_COLORS.orange);
    const img = scene.add.image(0, opts.height * 0.04, key);
    this.text = scene.add
      .text(0, -opts.height * 0.02, opts.label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(opts.fontSize)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: UI_COLORS.stroke,
        strokeThickness: Math.max(2, opts.fontSize * 0.14),
      })
      .setOrigin(0.5);
    this.text.setShadow(0, opts.fontSize * 0.06, 'rgba(40,0,80,0.5)', 0, true, false);
    this.add([img, this.text]);
    this.setSize(opts.width, opts.height);
    makePressable(this, opts.onClick);
    scene.add.existing(this);
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }
}

/** Botão redondo com ícone (pausa, definições, casa, fechar). */
export class IconButton extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, size: number, icon: IconKind, color: number, onClick: () => void) {
    super(scene, x, y, iconButtonTexture(scene, size, color, icon));
    this.setDisplaySize(this.width, this.height);
    makePressable(this, onClick, size);
    scene.add.existing(this);
  }
}

function makePressable(obj: Phaser.GameObjects.Container | Phaser.GameObjects.Image, onClick: () => void, hit?: number): void {
  if (hit !== undefined) {
    const w = obj.width;
    const h = obj.height;
    obj.setInteractive(new Phaser.Geom.Circle(w / 2, h / 2, hit * 0.55), Phaser.Geom.Circle.Contains);
  } else {
    obj.setInteractive({ useHandCursor: true });
  }
  if (obj.input) obj.input.cursor = 'pointer';
  const base = () => obj.getData('baseScale') as number | undefined;
  obj.setData('baseScale', obj.scale);
  let pressed = false;
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
    pressed = true;
    obj.setScale((base() ?? 1) * 0.92);
  });
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
    pressed = false;
    obj.setScale(base() ?? 1);
  });
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
    obj.setScale(base() ?? 1);
    if (!pressed) return;
    pressed = false;
    onClick();
  });
}
