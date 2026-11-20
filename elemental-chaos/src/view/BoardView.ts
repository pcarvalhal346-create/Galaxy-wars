import * as Phaser from 'phaser';
import { TIMINGS } from '../config/balance';
import { TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { Board } from '../game/board/Board';
import type { ShuffleResult } from '../game/board/shuffle';
import type { Position, Tile, TileId } from '../game/core/types';
import type { CascadeStep } from '../game/resolution/turnResolver';
import type { Effects } from '../effects/Effects';
import { TILE_TEXTURE_SIZE } from '../effects/crystalArt';
import { tweenAsync, wait } from '../utils/async';
import type { GameLayout } from './layout';

const TILE_FILL = 0.92; // fração da célula ocupada pelo cristal

/**
 * Representação gráfica do tabuleiro. Não contém regras: recebe passos já resolvidos
 * pela lógica e anima-os. Mantém um sprite por TileId e reutiliza sprites (pool).
 */
export class BoardView {
  private readonly sprites = new Map<TileId, Phaser.GameObjects.Image>();
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly selection: Phaser.GameObjects.Image;
  private selectionTween: Phaser.Tweens.Tween | null = null;
  private layout: GameLayout;
  private speed = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    layout: GameLayout,
    private readonly effects: Effects,
    private readonly depth: number,
  ) {
    this.layout = layout;
    this.frame = scene.add.graphics().setDepth(depth - 1);
    this.selection = scene.add.image(0, 0, TEXTURE_KEYS.ring).setDepth(depth + 1).setVisible(false);
    this.selection.setBlendMode(Phaser.BlendModes.ADD);
    this.drawFrame();
  }

  /** Efeitos reduzidos → animações mais curtas. */
  setReducedMotion(reduced: boolean): void {
    this.speed = reduced ? TIMINGS.reducedMotionFactor : 1;
  }

  private t(ms: number): number {
    return Math.max(1, Math.round(ms * this.speed));
  }

  get tileScale(): number {
    return (this.layout.cellSize * TILE_FILL) / TILE_TEXTURE_SIZE;
  }

  cellCenter(p: Position): { x: number; y: number } {
    const { board, cellSize } = this.layout;
    return { x: board.x + (p.col + 0.5) * cellSize, y: board.y + (p.row + 0.5) * cellSize };
  }

  /** Reposiciona tudo para um novo layout (só chamado quando não há animações). */
  relayout(layout: GameLayout, board: Board): void {
    this.layout = layout;
    this.drawFrame();
    for (const p of board.positions()) {
      const tile = board.get(p);
      const sprite = tile ? this.sprites.get(tile.id) : undefined;
      if (!sprite) continue;
      const { x, y } = this.cellCenter(p);
      sprite.setPosition(x, y).setScale(this.tileScale);
    }
    this.selection.setScale((layout.cellSize * 1.02) / TILE_TEXTURE_SIZE);
  }

  /** Cria os sprites a partir do estado lógico (início de partida). */
  build(board: Board, animateIn = true): Promise<void> {
    for (const s of this.sprites.values()) this.release(s);
    this.sprites.clear();
    const tweens: Promise<void>[] = [];
    for (const p of board.positions()) {
      const tile = board.get(p);
      if (!tile) continue;
      const sprite = this.acquire(tile, p);
      if (animateIn) {
        const targetY = sprite.y;
        sprite.setY(targetY - this.layout.cellSize * 3).setAlpha(0);
        tweens.push(
          tweenAsync(this.scene, {
            targets: sprite,
            y: targetY,
            alpha: 1,
            duration: this.t(380),
            delay: this.t((board.rows - p.row) * 35 + p.col * 12),
            ease: 'Back.easeOut',
          }),
        );
      }
    }
    return Promise.all(tweens).then(() => undefined);
  }

  select(cell: Position | null): void {
    this.selectionTween?.stop();
    this.selectionTween = null;
    if (!cell) {
      this.selection.setVisible(false);
      return;
    }
    const { x, y } = this.cellCenter(cell);
    const base = (this.layout.cellSize * 1.02) / TILE_TEXTURE_SIZE;
    this.selection.setPosition(x, y).setScale(base).setAlpha(1).setVisible(true);
    this.selectionTween = this.scene.tweens.add({
      targets: this.selection,
      scale: base * 1.08,
      alpha: 0.7,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  async playSwap(a: Position, b: Position, idA: TileId, idB: TileId): Promise<void> {
    const sa = this.sprites.get(idA);
    const sb = this.sprites.get(idB);
    if (!sa || !sb) return;
    const pa = this.cellCenter(a);
    const pb = this.cellCenter(b);
    sa.setDepth(this.depth + 0.5);
    // Pequena antecipação: a peça arrastada "respira" antes de trocar.
    await tweenAsync(this.scene, { targets: sa, scale: this.tileScale * 1.1, duration: this.t(60), ease: 'Quad.easeOut' });
    await Promise.all([
      tweenAsync(this.scene, { targets: sa, x: pb.x, y: pb.y, scale: this.tileScale, duration: this.t(TIMINGS.swap), ease: 'Cubic.easeInOut' }),
      tweenAsync(this.scene, { targets: sb, x: pa.x, y: pa.y, duration: this.t(TIMINGS.swap), ease: 'Cubic.easeInOut' }),
    ]);
    sa.setDepth(this.depth);
  }

  async playInvalidSwap(a: Position, b: Position, idA: TileId, idB: TileId): Promise<void> {
    await this.playSwap(a, b, idA, idB);
    const sa = this.sprites.get(idA);
    const sb = this.sprites.get(idB);
    if (!sa || !sb) return;
    const pa = this.cellCenter(a);
    const pb = this.cellCenter(b);
    await Promise.all([
      tweenAsync(this.scene, { targets: sa, x: pa.x, y: pa.y, duration: this.t(TIMINGS.invalidSwap), ease: 'Back.easeOut' }),
      tweenAsync(this.scene, { targets: sb, x: pb.x, y: pb.y, duration: this.t(TIMINGS.invalidSwap), ease: 'Back.easeOut' }),
    ]);
  }

  /** Brilho + crescimento + desaparecimento sincronizado com as partículas. */
  async playClear(step: CascadeStep): Promise<void> {
    const targets: Phaser.GameObjects.Image[] = [];
    for (const c of step.cleared) {
      const s = this.sprites.get(c.tile.id);
      if (s) targets.push(s.setDepth(this.depth + 0.5));
    }
    if (targets.length === 0) return;
    const scale = this.tileScale;
    await tweenAsync(this.scene, {
      targets,
      scale: scale * 1.18,
      duration: this.t(TIMINGS.matchPop),
      ease: 'Quad.easeOut',
    });
    const intensity = Math.min(1.6, 1 + step.index * 0.15);
    for (const c of step.cleared) {
      const { x, y } = this.cellCenter(c.at);
      this.effects.burst(c.tile.element, x, y, intensity);
    }
    if (step.cleared.length >= 5 || step.index >= 2) this.effects.shake(step.index >= 3 ? 1.5 : 1);
    await tweenAsync(this.scene, {
      targets,
      scale: 0,
      alpha: 0,
      angle: 25,
      duration: this.t(TIMINGS.matchVanish),
      ease: 'Back.easeIn',
    });
    for (const c of step.cleared) {
      const s = this.sprites.get(c.tile.id);
      if (s) this.release(s);
      this.sprites.delete(c.tile.id);
    }
  }

  /** Queda com aceleração natural + pequeno efeito de aterragem. Inclui as peças novas. */
  async playFallAndRefill(step: CascadeStep): Promise<void> {
    const cell = this.layout.cellSize;
    const durationFor = (rows: number) =>
      this.t(Math.min(TIMINGS.fallMax, Math.max(TIMINGS.fallMin, TIMINGS.fallMin + rows * TIMINGS.fallPerRow)));
    const jobs: Promise<void>[] = [];

    for (const f of step.falls) {
      const s = this.sprites.get(f.id);
      if (!s) continue;
      const to = this.cellCenter(f.to);
      jobs.push(this.fallTo(s, to.y, durationFor(f.to.row - f.from.row), 0));
    }
    for (const sp of step.spawns) {
      const s = this.acquire(sp.tile, sp.to);
      const to = this.cellCenter(sp.to);
      const fromY = this.layout.board.y + (sp.fromRow + 0.5) * cell;
      s.setY(fromY).setAlpha(0);
      const rows = sp.to.row - sp.fromRow;
      const duration = durationFor(rows);
      // Entra com fade enquanto atravessa a margem superior do tabuleiro.
      this.scene.tweens.add({ targets: s, alpha: 1, duration: Math.min(duration, this.t(160)) });
      jobs.push(this.fallTo(s, to.y, duration, this.t(20)));
    }
    await Promise.all(jobs);
  }

  private async fallTo(s: Phaser.GameObjects.Image, y: number, duration: number, delay: number): Promise<void> {
    await tweenAsync(this.scene, { targets: s, y, duration, delay, ease: 'Quad.easeIn' });
    const base = this.tileScale;
    await tweenAsync(this.scene, {
      targets: s,
      scaleY: base * 0.88,
      scaleX: base * 1.06,
      duration: this.t(TIMINGS.landBounce / 2),
      yoyo: true,
      ease: 'Sine.easeOut',
    });
    s.setScale(base);
  }

  async playShuffle(result: ShuffleResult): Promise<void> {
    if (result.kind === 'regenerated') {
      await tweenAsync(this.scene, { targets: [...this.sprites.values()], scale: 0, alpha: 0, duration: this.t(200) });
      await this.build(result.board, true);
      return;
    }
    const centerX = this.layout.board.x + this.layout.board.width / 2;
    const centerY = this.layout.board.y + this.layout.board.height / 2;
    const all = [...this.sprites.values()];
    await tweenAsync(this.scene, { targets: all, x: centerX, y: centerY, scale: this.tileScale * 0.6, duration: this.t(TIMINGS.shuffle / 2), ease: 'Cubic.easeIn' });
    await Promise.all(
      result.moves.map((m) => {
        const s = this.sprites.get(m.id);
        if (!s) return Promise.resolve();
        const to = this.cellCenter(m.to);
        return tweenAsync(this.scene, { targets: s, x: to.x, y: to.y, scale: this.tileScale, duration: this.t(TIMINGS.shuffle / 2), ease: 'Back.easeOut' });
      }),
    );
  }

  pause(ms: number): Promise<void> {
    return wait(this.scene, this.t(ms));
  }

  /** Verificação de desenvolvimento: sprites coincidem com o estado lógico? */
  debugMismatches(board: Board): string[] {
    const problems: string[] = [];
    let count = 0;
    for (const p of board.positions()) {
      const tile = board.get(p);
      if (!tile) continue;
      count++;
      const s = this.sprites.get(tile.id);
      const c = this.cellCenter(p);
      if (!s) problems.push(`sem sprite para peça ${tile.id}`);
      else if (Math.abs(s.x - c.x) > 1 || Math.abs(s.y - c.y) > 1) problems.push(`peça ${tile.id} fora do sítio`);
    }
    if (count !== this.sprites.size) problems.push(`sprites a mais: ${this.sprites.size} vs ${count}`);
    return problems;
  }

  destroy(): void {
    this.selectionTween?.stop();
    for (const s of this.sprites.values()) s.destroy();
    for (const s of this.pool) s.destroy();
    this.sprites.clear();
    this.pool.length = 0;
    this.frame.destroy();
    this.selection.destroy();
  }

  private acquire(tile: Tile, p: Position): Phaser.GameObjects.Image {
    const { x, y } = this.cellCenter(p);
    const sprite = this.pool.pop() ?? this.scene.add.image(0, 0, TEXTURE_KEYS.tile(tile.element));
    sprite
      .setTexture(TEXTURE_KEYS.tile(tile.element))
      .setPosition(x, y)
      .setScale(this.tileScale)
      .setAlpha(1)
      .setAngle(0)
      .setDepth(this.depth)
      .setVisible(true)
      .setActive(true);
    this.sprites.set(tile.id, sprite);
    return sprite;
  }

  private release(sprite: Phaser.GameObjects.Image): void {
    this.scene.tweens.killTweensOf(sprite);
    sprite.setVisible(false).setActive(false);
    this.pool.push(sprite);
  }

  private drawFrame(): void {
    const { board, cellSize } = this.layout;
    const g = this.frame;
    const pad = Math.round(cellSize * 0.14);
    const radius = Math.round(cellSize * 0.28);
    g.clear();
    // Painel com sombra e aro luminoso.
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(board.x - pad, board.y - pad + cellSize * 0.08, board.width + pad * 2, board.height + pad * 2, radius);
    g.fillStyle(UI_COLORS.panel, 0.88);
    g.fillRoundedRect(board.x - pad, board.y - pad, board.width + pad * 2, board.height + pad * 2, radius);
    g.lineStyle(Math.max(2, cellSize * 0.03), UI_COLORS.panelEdge, 0.55);
    g.strokeRoundedRect(board.x - pad, board.y - pad, board.width + pad * 2, board.height + pad * 2, radius);
    // Células em xadrez subtil.
    const inset = cellSize * 0.04;
    for (let row = 0; row < board.height / cellSize; row++) {
      for (let col = 0; col < board.width / cellSize; col++) {
        g.fillStyle((row + col) % 2 === 0 ? UI_COLORS.cellA : UI_COLORS.cellB, 0.9);
        g.fillRoundedRect(board.x + col * cellSize + inset, board.y + row * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.16);
      }
    }
  }
}
