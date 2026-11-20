import * as Phaser from 'phaser';
import { TEXT_FONT, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { HAND_TIP } from '../effects/mascotArt';
import { ELEMENTS, type ElementType } from '../game/core/types';
import type { GameLayout, Rect } from '../view/layout';
import { Button } from './Button';
import { createSpeechBubble } from './SpeechBubble';

export interface TutorialView {
  text: string;
  /** Zona a realçar (o resto escurece). */
  focus?: Rect | null;
  /** Mão a arrastar de um ponto para outro. */
  drag?: { from: { x: number; y: number }; to: { x: number; y: number } } | null;
  show?: ElementType | 'all';
  /** Botão "Continuar" (passos só de mensagem). */
  onContinue?: (() => void) | null;
  onSkip?: (() => void) | null;
}

/**
 * Camada do tutorial: escurece à volta do alvo, mostra a mão a fazer a jogada
 * e o balão da Lumi com a explicação. Não bloqueia o toque no tabuleiro
 * (só os botões são interativos), para o jogador fazer a jogada indicada.
 */
export class TutorialOverlay {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {}

  get visible(): boolean {
    return this.objects.length > 0;
  }

  hide(): void {
    for (const t of this.tweens) t.stop();
    for (const o of this.objects) o.destroy();
    this.tweens = [];
    this.objects = [];
  }

  show(view: TutorialView, layout: GameLayout): void {
    this.hide();
    const s = layout.uiScale;
    const { width: W, height: H } = layout;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objects.push(o);
      return o;
    };

    // Escurecer à volta do alvo (4 retângulos) + moldura luminosa.
    if (view.focus) {
      const f = view.focus;
      const pad = 10 * s;
      const x0 = Math.max(0, f.x - pad);
      const y0 = Math.max(0, f.y - pad);
      const x1 = Math.min(W, f.x + f.width + pad);
      const y1 = Math.min(H, f.y + f.height + pad);
      const dim = add(this.scene.add.graphics().setDepth(this.depth));
      dim.fillStyle(0x12042a, 0.62);
      dim.fillRect(0, 0, W, y0);
      dim.fillRect(0, y1, W, H - y1);
      dim.fillRect(0, y0, x0, y1 - y0);
      dim.fillRect(x1, y0, W - x1, y1 - y0);
      const glow = add(this.scene.add.graphics().setDepth(this.depth));
      glow.lineStyle(6 * s, 0xfff3a0, 1).strokeRoundedRect(x0, y0, x1 - x0, y1 - y0, 18 * s);
      this.tweens.push(this.scene.tweens.add({ targets: glow, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 }));
    }

    // Mão a demonstrar o arrasto.
    if (view.drag) {
      const size = layout.cellSize * 1.25;
      const hand = add(this.scene.add.image(0, 0, TEXTURE_KEYS.hand).setDepth(this.depth + 3).setDisplaySize(size, size));
      hand.setOrigin(HAND_TIP.x, HAND_TIP.y);
      const { from, to } = view.drag;
      hand.setPosition(from.x, from.y);
      this.tweens.push(
        this.scene.tweens.chain({
          targets: hand,
          loop: -1,
          tweens: [
            { alpha: { from: 0, to: 1 }, scale: { from: hand.scale * 1.15, to: hand.scale }, duration: 220 },
            { x: to.x, y: to.y, duration: 620, ease: 'Sine.easeInOut', delay: 120 },
            { alpha: 0, duration: 220, delay: 180 },
            { x: from.x, y: from.y, duration: 1 },
          ],
        }) as unknown as Phaser.Tweens.Tween,
      );
    }

    // A Lumi fala num balão de banda desenhada. Fica em baixo, a não ser que tape o alvo.
    const lumiSize = Math.min(300 * s, W * 0.3);
    const balloonW = Math.min(W - lumiSize - 40 * s, 700 * s);
    const probe = createSpeechBubble(this.scene, 0, 0, view.text, s, { width: balloonW / s - 120, fontSize: 32, tail: 'left' });
    const bh = probe.height + (view.onContinue ? 110 * s : 40 * s);
    probe.destroy();
    const blockH = Math.max(lumiSize, bh) + 40 * s;
    const focusBottom = view.focus ? view.focus.y + view.focus.height : 0;
    const atTop = !!view.focus && focusBottom > H - blockH - 30 * s;
    const baseY = atTop ? Math.max(30 * s, (view.focus?.y ?? 0) - blockH) : H - blockH - 10 * s;

    const lumiX = 24 * s + lumiSize / 2;
    const lumiY = baseY + blockH - lumiSize / 2 - 20 * s;
    const lumi = add(this.scene.add.image(lumiX, lumiY, TEXTURE_KEYS.lumi(view.onContinue ? 'happy' : 'wow')).setDepth(this.depth + 2));
    lumi.setDisplaySize(lumiSize, lumiSize);
    this.tweens.push(this.scene.tweens.add({ targets: lumi, y: lumiY - 12 * s, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

    const bx = lumiX + lumiSize * 0.55 + balloonW / 2;
    const by = baseY + (blockH - (view.onContinue ? 110 * s : 40 * s)) / 2;
    const balloon = add(createSpeechBubble(this.scene, Math.min(bx, W - balloonW / 2 - 16 * s), by, view.text, s, { width: balloonW / s - 120, fontSize: 32, tail: 'left' }));
    balloon.setDepth(this.depth + 1);
    balloon.setInteractive(); // o balão não deixa tocar no que está por baixo dele
    const textX = balloon.x - balloonW / 2;

    if (view.show) {
      const list = view.show === 'all' ? [...ELEMENTS] : [view.show];
      const size = 86 * s;
      list.forEach((e, i) => {
        const x = textX + size * 0.8 + i * size * 1.1;
        const icon = add(this.scene.add.image(x, balloon.y - balloon.height / 2 - size * 0.45, TEXTURE_KEYS.tile(e)).setDepth(this.depth + 2).setDisplaySize(size, size));
        this.tweens.push(this.scene.tweens.add({ targets: icon, y: icon.y - 10 * s, duration: 600 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      });
    }

    const rowY = balloon.y + balloon.height / 2 + 50 * s;
    if (view.onContinue) {
      const btn = add(new Button(this.scene, Math.min(W - 190 * s, balloon.x + 120 * s), rowY, { width: 320 * s, height: 96 * s, label: 'Continuar', fontSize: 38 * s, color: UI_COLORS.green, onClick: view.onContinue }));
      btn.setDepth(this.depth + 3);
    }
    if (view.onSkip) {
      const skip = add(
        this.scene.add
          .text(balloon.x - 160 * s, rowY, 'Saltar tutorial', {
            fontFamily: TEXT_FONT,
            fontSize: `${Math.round(26 * s)}px`,
            fontStyle: '600',
            color: '#ffffff',
            stroke: UI_COLORS.stroke,
            strokeThickness: Math.round(6 * s),
          })
          .setOrigin(0.5)
          .setDepth(this.depth + 3),
      );
      skip.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, view.onSkip);
    }

    // Entrada suave.
    for (const o of this.objects) {
      const v = o as unknown as Phaser.GameObjects.Components.Alpha;
      if (typeof v.setAlpha === 'function' && o !== lumi) {
        const target = v.alpha;
        v.setAlpha(0);
        this.scene.tweens.add({ targets: o, alpha: target, duration: 200 });
      }
    }
  }

  destroy(): void {
    this.hide();
  }
}
