import type Phaser from 'phaser';
import { UI_COLORS } from '../config/theme';
import type { GameLayout } from '../view/layout';
import { Button } from './Button';
import { Modal } from './Modal';
import { settingsButtons } from './SettingsButtons';

export interface PauseActions {
  onResume(): void;
  onRestart(): void;
  onMap(): void;
  onBook(): void;
}

/** Painel de pausa: continuar, reiniciar, mapa e efeitos reduzidos. */
export class PauseOverlay {
  private modal: Modal | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number, private readonly actions: PauseActions) {}

  get isOpen(): boolean {
    return this.modal !== null && !this.modal.isClosed;
  }

  open(layout: GameLayout): void {
    this.close();
    const s = layout.uiScale;
    const w = Math.min(layout.width - 60 * s, 760 * s);
    const m = new Modal(this.scene, this.depth, { title: 'Pausa', width: w, height: 1060 * s, scale: s, animate: false, onClose: () => this.actions.onResume() });
    const bw = w * 0.74;
    const bh = 118 * s;
    const fs = 42 * s;
    m.add([
      new Button(this.scene, 0, -360 * s, { width: bw, height: bh, label: 'Continuar', fontSize: fs, color: UI_COLORS.green, onClick: () => this.actions.onResume() }),
      new Button(this.scene, 0, -220 * s, { width: bw, height: bh, label: 'Reiniciar', fontSize: fs, color: UI_COLORS.orange, onClick: () => this.actions.onRestart() }),
      new Button(this.scene, 0, -80 * s, { width: bw, height: bh, label: 'Mapa', fontSize: fs, color: UI_COLORS.pink, onClick: () => this.actions.onMap() }),
      new Button(this.scene, 0, 60 * s, { width: bw, height: bh, label: 'Livro dos Elementos', fontSize: fs * 0.85, color: UI_COLORS.violet, onClick: () => this.actions.onBook() }),
      ...settingsButtons(this.scene, 190 * s, bw, bh * 0.78, fs * 0.72, s),
    ]);
    this.modal = m;
  }

  close(): void {
    this.modal?.close();
    this.modal = null;
  }

  destroy(): void {
    this.close();
  }
}
