import * as Phaser from 'phaser';
import { INPUT_CONFIG } from '../config/balance';
import { isAdjacent, samePos } from '../game/core/position';
import type { Position, Swap } from '../game/core/types';
import type { GameLayout } from '../view/layout';
import { pointToCell, swipeDirection } from './gestures';

export interface BoardInputHandlers {
  /** Chamado para saber se o input é aceite (estado IDLE e sem pausa). */
  canInteract(): boolean;
  onSelect(cell: Position | null): void;
  onSwap(swap: Swap): void;
}

/**
 * Traduz toque, arrasto e rato em intenções de jogo:
 * - arrastar uma peça numa direção → troca com a vizinha;
 * - tocar numa peça e depois numa adjacente → troca;
 * - tocar novamente na mesma peça → anula a seleção.
 */
export class BoardInput {
  private selected: Position | null = null;
  private dragStart: { cell: Position; x: number; y: number; pointerId: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private layout: GameLayout,
    private readonly rows: number,
    private readonly cols: number,
    private readonly handlers: BoardInputHandlers,
  ) {
    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.handleDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.handleMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.handleUp, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp, this);
  }

  setLayout(layout: GameLayout): void {
    this.layout = layout;
  }

  clearSelection(): void {
    this.dragStart = null;
    if (this.selected) {
      this.selected = null;
      this.handlers.onSelect(null);
    }
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.handleDown, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.handleMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.handleUp, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp, this);
  }

  private cellAt(pointer: Phaser.Input.Pointer): Position | null {
    return pointToCell(pointer.x, pointer.y, this.layout.board, this.layout.cellSize, this.rows, this.cols);
  }

  private handleDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    // Toques em botões (objetos interativos) não contam como jogadas.
    if (over.length > 0 || !this.handlers.canInteract()) return;
    const cell = this.cellAt(pointer);
    if (!cell) {
      this.clearSelection();
      return;
    }
    if (this.selected && isAdjacent(this.selected, cell)) {
      const swap = { a: this.selected, b: cell };
      this.clearSelection();
      this.handlers.onSwap(swap);
      return;
    }
    if (this.selected && samePos(this.selected, cell)) {
      this.clearSelection();
      return;
    }
    this.selected = cell;
    this.handlers.onSelect(cell);
    this.dragStart = { cell, x: pointer.x, y: pointer.y, pointerId: pointer.id };
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    const drag = this.dragStart;
    if (!drag || pointer.id !== drag.pointerId || !pointer.isDown) return;
    if (!this.handlers.canInteract()) return;
    const dir = swipeDirection(pointer.x - drag.x, pointer.y - drag.y, this.layout.cellSize * INPUT_CONFIG.swipeThreshold);
    if (!dir) return;
    const target = { row: drag.cell.row + dir.row, col: drag.cell.col + dir.col };
    this.dragStart = null;
    if (target.row < 0 || target.row >= this.rows || target.col < 0 || target.col >= this.cols) return;
    this.clearSelection();
    this.handlers.onSwap({ a: drag.cell, b: target });
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (this.dragStart?.pointerId === pointer.id) this.dragStart = null;
  }
}
