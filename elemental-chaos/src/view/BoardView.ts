import * as Phaser from 'phaser';
import { TIMINGS } from '../config/balance';
import { TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import type { Board } from '../game/board/Board';
import type { ShuffleResult } from '../game/board/shuffle';
import type { Position, Tile, TileId } from '../game/core/types';
import type { WetChange } from '../game/reactions/reactions';
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
  /** Película de água por peça molhada; segue o sprite da peça em `update()`. */
  private readonly wetOverlays = new Map<TileId, Phaser.GameObjects.Image>();
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
    for (const o of this.wetOverlays.values()) o.destroy();
    this.wetOverlays.clear();
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
    const wet: WetChange[] = [];
    for (const p of board.positions()) {
      const t = board.get(p);
      if (t?.wet) wet.push({ id: t.id, wet: t.wet });
    }
    this.applyWet(wet, false);
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

  /** MATCHING: as peças combinadas crescem e brilham. */
  async playMatchPop(step: CascadeStep): Promise<void> {
    const targets = step.cleared.filter((c) => c.cause === 'match').map((c) => this.sprites.get(c.tile.id)).filter((x): x is Phaser.GameObjects.Image => !!x);
    if (targets.length === 0) return;
    for (const t of targets) t.setDepth(this.depth + 0.5);
    await tweenAsync(this.scene, { targets, scale: this.tileScale * 1.18, duration: this.t(TIMINGS.matchPop), ease: 'Quad.easeOut' });
  }

  /** REACTING: vapor e relâmpagos; as peças atingidas tremem antes de desaparecer. */
  async playReactions(step: CascadeStep): Promise<void> {
    if (step.reactions.length === 0) return;
    const hit = step.cleared.filter((c) => c.cause !== 'match').map((c) => this.sprites.get(c.tile.id)).filter((x): x is Phaser.GameObjects.Image => !!x);
    const jobs: Promise<void>[] = [];
    if (hit.length > 0) {
      jobs.push(tweenAsync(this.scene, { targets: hit, scale: this.tileScale * 1.12, angle: { from: -8, to: 8 }, duration: this.t(70), yoyo: true, repeat: 1 }));
    }
    for (const r of step.reactions) {
      if (r.kind === 'steam') {
        const c = this.cellCenter(r.center);
        this.effects.label(c.x, c.y - this.layout.cellSize * 0.6, 'VAPOR!', '#ffe0b0');
        jobs.push(this.effects.steam(c, this.layout.cellSize * 3));
      } else {
        const last = r.path[r.path.length - 1] ?? r.path[0];
        if (last) {
          const c = this.cellCenter(last);
          this.effects.label(c.x, c.y - this.layout.cellSize * 0.6, 'CORRENTE!', '#fff6a0');
        }
        jobs.push(
          this.effects.lightning(
            r.links.map(([a, b]) => [this.cellCenter(a), this.cellCenter(b)] as const),
            r.path.map((q) => this.cellCenter(q)),
          ),
        );
      }
    }
    await Promise.all(jobs);
  }

  /** CLEARING: desaparecimento sincronizado com partículas. */
  async playVanish(step: CascadeStep): Promise<void> {
    const targets: Phaser.GameObjects.Image[] = [];
    for (const c of step.cleared) {
      const s = this.sprites.get(c.tile.id);
      if (s) targets.push(s.setDepth(this.depth + 0.5));
    }
    if (targets.length === 0) return;
    const intensity = Math.min(1.6, 1 + step.index * 0.15);
    for (const c of step.cleared) {
      const { x, y } = this.cellCenter(c.at);
      this.effects.burst(c.tile.element, x, y, c.cause === 'match' ? intensity : 0.6);
    }
    if (step.cleared.length >= 6 || step.index >= 2) this.effects.shake(step.index >= 3 ? 1.5 : 1);
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
      this.removeWet(c.tile.id, false);
    }
  }

  /** Estado Wet: cria, renova, enfraquece ou remove a película de água. */
  applyWet(changes: readonly WetChange[], splash: boolean): void {
    for (const ch of changes) {
      if (ch.wet <= 0) {
        this.removeWet(ch.id, true);
        continue;
      }
      const sprite = this.sprites.get(ch.id);
      if (!sprite) continue;
      let overlay = this.wetOverlays.get(ch.id);
      let fadingIn = false;
      if (!overlay) {
        overlay = this.scene.add.image(sprite.x, sprite.y, TEXTURE_KEYS.wet).setDepth(this.depth + 0.7);
        this.wetOverlays.set(ch.id, overlay);
        if (splash) {
          overlay.setAlpha(0);
          fadingIn = true;
          this.scene.tweens.add({ targets: overlay, alpha: 1, duration: this.t(200) });
          this.effects.burst('water', sprite.x, sprite.y, 0.4);
        }
      }
      // Última jogada molhada: película mais ténue para avisar que vai secar.
      overlay.setData('wet', ch.wet);
      if (!fadingIn) overlay.setAlpha(ch.wet >= 2 ? 1 : 0.55);
    }
  }

  private removeWet(id: TileId, fade: boolean): void {
    const o = this.wetOverlays.get(id);
    if (!o) return;
    this.wetOverlays.delete(id);
    if (!fade) {
      o.destroy();
      return;
    }
    this.scene.tweens.add({ targets: o, alpha: 0, duration: this.t(250), onComplete: () => o.destroy() });
  }

  /** Chamado todos os frames: películas seguem as peças (máximo 64 objetos, custo mínimo). */
  update(time: number): void {
    if (this.wetOverlays.size === 0) return;
    const pulse = 1 + Math.sin(time / 260) * 0.03;
    for (const [id, o] of this.wetOverlays) {
      const s = this.sprites.get(id);
      if (!s || !s.visible) continue;
      o.setPosition(s.x, s.y).setScale(s.scaleX * 1.08 * pulse, s.scaleY * 1.08 * pulse).setAngle(s.angle);
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
    for (const o of this.wetOverlays.values()) o.destroy();
    this.wetOverlays.clear();
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
    const pad = Math.round(cellSize * 0.16);
    const radius = Math.round(cellSize * 0.3);
    const x = board.x - pad;
    const y = board.y - pad;
    const w = board.width + pad * 2;
    const h = board.height + pad * 2;
    g.clear();
    g.fillStyle(0x1a0640, 0.35);
    g.fillRoundedRect(x, y + cellSize * 0.1, w, h, radius);
    g.fillStyle(UI_COLORS.boardBg, 0.72);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(Math.max(3, cellSize * 0.05), 0xffffff, 0.85);
    g.strokeRoundedRect(x, y, w, h, radius);
    g.lineStyle(Math.max(2, cellSize * 0.025), UI_COLORS.violetLight, 0.9);
    g.strokeRoundedRect(x + cellSize * 0.05, y + cellSize * 0.05, w - cellSize * 0.1, h - cellSize * 0.1, radius * 0.8);
    // Células em xadrez azul, ligeiramente translúcidas.
    const inset = cellSize * 0.03;
    for (let row = 0; row < board.height / cellSize; row++) {
      for (let col = 0; col < board.width / cellSize; col++) {
        g.fillStyle((row + col) % 2 === 0 ? UI_COLORS.cellA : UI_COLORS.cellB, 0.55);
        g.fillRoundedRect(board.x + col * cellSize + inset, board.y + row * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.14);
      }
    }
  }
}
