import * as Phaser from 'phaser';
import { TIMINGS } from '../config/balance';
import { ELEMENT_STYLE, TEXTURE_KEYS, tileTexture, UI_COLORS } from '../config/theme';
import type { Board } from '../game/board/Board';
import type { ShuffleResult } from '../game/board/shuffle';
import type { ElementType, Position, Tile, TileId } from '../game/core/types';
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
  /** Forma do tabuleiro (buracos), para desenhar só as células jogáveis. */
  private shape: Board | null = null;
  /** Blocos de gelo por célula (posKey → imagem). */
  private readonly iceImages = new Map<number, Phaser.GameObjects.Image>();

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
    this.shape = board;
    this.drawFrame();
    for (const p of board.positions()) {
      const tile = board.get(p);
      const sprite = tile ? this.sprites.get(tile.id) : undefined;
      if (!sprite) continue;
      const { x, y } = this.cellCenter(p);
      sprite.setPosition(x, y).setScale(this.tileScale);
    }
    this.selection.setScale((layout.cellSize * 1.02) / TILE_TEXTURE_SIZE);
    this.syncIce(board);
  }

  /** Cria/atualiza os blocos de gelo a partir do tabuleiro lógico. */
  syncIce(board: Board): void {
    for (const p of board.positions()) {
      const k = p.row * 1000 + p.col;
      const layers = board.getIce(p);
      let img = this.iceImages.get(k);
      if (layers <= 0) {
        img?.destroy();
        this.iceImages.delete(k);
        continue;
      }
      const { x, y } = this.cellCenter(p);
      if (!img) {
        img = this.scene.add.image(x, y, TEXTURE_KEYS.ice(2)).setDepth(this.depth + 0.65);
        this.iceImages.set(k, img);
      }
      img.setTexture(TEXTURE_KEYS.ice(layers >= 2 ? 2 : 1)).setPosition(x, y).setScale((this.layout.cellSize * 0.98) / TILE_TEXTURE_SIZE);
    }
  }

  /** Gelo partido: estilhaços e o bloco racha ou desaparece. */
  playIce(step: CascadeStep): void {
    for (const b of step.iceBroken) {
      const k = b.at.row * 1000 + b.at.col;
      const img = this.iceImages.get(k);
      if (!img) continue;
      const { x, y } = this.cellCenter(b.at);
      this.effects.iceShatter(x, y);
      if (b.remaining > 0) {
        img.setTexture(TEXTURE_KEYS.ice(1));
        this.scene.tweens.add({ targets: img, scale: { from: img.scale * 1.15, to: img.scale }, duration: this.t(160) });
      } else {
        this.iceImages.delete(k);
        this.scene.tweens.add({ targets: img, scale: img.scale * 1.3, alpha: 0, duration: this.t(220), onComplete: () => img.destroy() });
      }
    }
  }

  /** Cria os sprites a partir do estado lógico (início de partida). */
  build(board: Board, animateIn = true): Promise<void> {
    if (!this.shape) {
      this.shape = board;
      this.drawFrame();
    }
    this.syncIce(board);
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

  /**
   * REACTING: vapor e relâmpagos.
   * Vapor: as peças atingidas ficam brancas, sobem e evaporam em fumo.
   * Corrente: as peças levam choque (piscam, tremem), ficam queimadas e rebentam em faíscas.
   */
  async playReactions(step: CascadeStep): Promise<void> {
    if (step.reactions.length === 0) return;
    const jobs: Promise<void>[] = [];
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
    for (const c of step.cleared) {
      const s = this.sprites.get(c.tile.id);
      if (!s) continue;
      if (c.cause === 'steam') jobs.push(this.vaporize(s, c.at));
      if (c.cause === 'lightning') jobs.push(this.shock(s));
    }
    await Promise.all(jobs);
  }

  /** Peça a evaporar: embranquece, incha um pouco, sobe e desaparece em fumo. */
  private async vaporize(s: Phaser.GameObjects.Image, at: Position): Promise<void> {
    s.setDepth(this.depth + 0.6);
    const base = this.tileScale;
    const { x, y } = this.cellCenter(at);
    await tweenAsync(this.scene, { targets: s, scale: base * 1.12, duration: this.t(90), ease: 'Quad.easeOut' });
    s.setTint(0xffffff).setTintMode(Phaser.TintModes.ADD).setAlpha(0.95);
    this.effects.puff(x, y, 3);
    await tweenAsync(this.scene, {
      targets: s,
      y: y - this.layout.cellSize * 0.55,
      scaleX: base * 1.35,
      scaleY: base * 0.6,
      alpha: 0,
      duration: this.t(360),
      ease: 'Cubic.easeOut',
    });
  }

  /** Peça eletrocutada: pisca entre normal e amarelo/branco, treme e fica queimada. */
  private async shock(s: Phaser.GameObjects.Image): Promise<void> {
    s.setDepth(this.depth + 0.6);
    const x0 = s.x;
    const flicks = this.speed < 1 ? 3 : 6;
    for (let i = 0; i < flicks; i++) {
      if (i % 2 === 0) s.setTint(i % 4 === 0 ? 0xfff6a0 : 0xffffff).setTintMode(Phaser.TintModes.ADD);
      else s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      s.setX(x0 + (i % 2 === 0 ? 1 : -1) * this.layout.cellSize * 0.06);
      await wait(this.scene, this.t(45));
    }
    s.setX(x0).setTint(0x3a2a4a).setTintMode(Phaser.TintModes.MULTIPLY);
    this.effects.spark(s.x, s.y, 6);
  }

  /** Ativação dos cristais especiais (Lança, Núcleo, Orbe), por ordem da cadeia. */
  async playActivations(step: CascadeStep): Promise<void> {
    if (step.activations.length === 0) return;
    const jobs: Promise<void>[] = [];
    const { board, cellSize } = this.layout;
    step.activations.forEach((act, i) => {
      jobs.push(
        wait(this.scene, this.t(i * 110)).then(async () => {
          const c = this.cellCenter(act.at);
          const color = ELEMENT_STYLE[act.element].glow;
          // As peças atingidas brilham a branco antes de desaparecerem.
          for (const cell of act.cells) {
            const t = this.spriteAt(step, cell);
            if (t) t.setTint(0xffffff).setTintMode(Phaser.TintModes.ADD);
          }
          if (act.kind === 'lance-h' || act.kind === 'lance-v') {
            const horizontal = act.kind === 'lance-h';
            const length = horizontal ? Math.max(c.x - board.x, board.x + board.width - c.x) : Math.max(c.y - board.y, board.y + board.height - c.y);
            await this.effects.beam(c, horizontal, length + cellSize * 0.5, color);
          } else if (act.kind === 'core') {
            await this.effects.shockwave(c, cellSize * 2.5, color);
          } else {
            this.effects.label(c.x, c.y - cellSize * 0.6, 'CAOS!', '#ffffff');
            await this.effects.orbRays(c, act.cells.map((q) => this.cellCenter(q)));
          }
        }),
      );
    });
    await Promise.all(jobs);
  }

  /** Sprite da peça que estava numa célula neste passo (antes de ser removida). */
  private spriteAt(step: CascadeStep, cell: Position): Phaser.GameObjects.Image | undefined {
    const c = step.cleared.find((x) => x.at.row === cell.row && x.at.col === cell.col);
    return c ? this.sprites.get(c.tile.id) : undefined;
  }

  /**
   * CLEARING: cada elemento desaparece à sua maneira, com partículas próprias.
   * Se o grupo cria um especial, as peças juntam-se primeiro no sítio onde ele nasce.
   */
  async playVanish(step: CascadeStep): Promise<void> {
    const jobs: Promise<void>[] = [];
    const intensity = Math.min(1.6, 1 + step.index * 0.15);
    const cell = this.layout.cellSize;

    // Para onde convergem as peças de um grupo que cria um especial.
    const gather = new Map<TileId, { x: number; y: number }>();
    for (const sc of step.specialsCreated) {
      const group = step.matches.find((g) => g.cells.some((c) => c.row === sc.at.row && c.col === sc.at.col));
      if (!group) continue;
      const target = this.cellCenter(sc.at);
      for (const c of step.cleared) {
        if (c.cause === 'match' && group.cells.some((g) => g.row === c.at.row && g.col === c.at.col)) gather.set(c.tile.id, target);
      }
    }

    for (const c of step.cleared) {
      const s = this.sprites.get(c.tile.id);
      if (!s) continue;
      s.setDepth(this.depth + 0.5);
      const { x, y } = this.cellCenter(c.at);
      const to = gather.get(c.tile.id);
      if (to) {
        jobs.push(tweenAsync(this.scene, { targets: s, x: to.x, y: to.y, scale: this.tileScale * 0.5, alpha: 0.2, duration: this.t(160), ease: 'Cubic.easeIn' }));
        continue;
      }
      if (c.cause === 'steam') continue; // já evaporou
      if (c.cause === 'lightning' || c.cause === 'special') {
        this.effects.spark(x, y, c.cause === 'special' ? 6 : 10);
        this.effects.burst(c.tile.element, x, y, 0.5);
        jobs.push(tweenAsync(this.scene, { targets: s, scale: 0, alpha: 0, duration: this.t(140), ease: 'Back.easeIn' }));
        continue;
      }
      this.effects.burst(c.tile.element, x, y, intensity);
      this.effects.flash(x, y, ELEMENT_STYLE[c.tile.element].glow);
      jobs.push(this.elementVanish(s, c.tile.element, x, y));
    }
    if (step.cleared.length >= 6 || step.index >= 2) this.effects.shake(step.index >= 3 ? 1.5 : 1);
    await Promise.all(jobs);

    // Nascimento dos especiais: a peça transforma-se com um clarão.
    for (const sc of step.specialsCreated) {
      const s = this.sprites.get(sc.id);
      if (!s) continue;
      const { x, y } = this.cellCenter(sc.at);
      s.setTexture(tileTexture({ element: sc.element, special: sc.kind })).setPosition(x, y).setAlpha(1).setAngle(0).clearTint();
      this.effects.spark(x, y, 14);
      void tweenAsync(this.scene, { targets: s, scale: { from: this.tileScale * 1.5, to: this.tileScale }, duration: this.t(260), ease: 'Back.easeOut' });
      this.effects.label(x, y - cell * 0.6, sc.kind === 'orb' ? 'ORBE!' : sc.kind === 'core' ? 'NÚCLEO!' : 'LANÇA!', '#ffffff');
    }

    for (const c of step.cleared) {
      const s = this.sprites.get(c.tile.id);
      if (s) this.release(s);
      this.sprites.delete(c.tile.id);
      this.removeWet(c.tile.id, false);
    }
  }

  /** Animação de desaparecimento própria de cada elemento. */
  private elementVanish(s: Phaser.GameObjects.Image, element: ElementType, x: number, y: number): Promise<void> {
    const base = this.tileScale;
    const cell = this.layout.cellSize;
    const d = this.t(TIMINGS.matchVanish + 60);
    switch (element) {
      case 'fire': // arde: fica laranja, encolhe e sobe como uma chama
        s.setTint(0xffa23a).setTintMode(Phaser.TintModes.ADD);
        return tweenAsync(this.scene, { targets: s, y: y - cell * 0.35, scaleX: base * 0.4, scaleY: base * 1.1, alpha: 0, duration: d, ease: 'Quad.easeIn' });
      case 'water': // splash: espalma-se no chão e escorre
        return tweenAsync(this.scene, { targets: s, scaleX: base * 1.6, scaleY: base * 0.15, y: y + cell * 0.25, alpha: 0, duration: d, ease: 'Cubic.easeOut' });
      case 'lightning': // descarga: treme e pisca
        s.setTint(0xffffff).setTintMode(Phaser.TintModes.ADD);
        return tweenAsync(this.scene, { targets: s, x: { from: x - cell * 0.05, to: x + cell * 0.05 }, scale: 0, duration: d, ease: 'Stepped', easeParams: [5] }).then(() => {
          s.setX(x);
        });
      case 'earth': // racha: treme, cresce um pouco e parte-se
        return tweenAsync(this.scene, { targets: s, angle: { from: -6, to: 6 }, scale: base * 1.1, duration: this.t(70), yoyo: true }).then(() =>
          tweenAsync(this.scene, { targets: s, scale: 0, alpha: 0, angle: 30, duration: this.t(110), ease: 'Back.easeIn' }),
        );
      case 'air': // redemoinho: gira e é levado pelo vento
        return tweenAsync(this.scene, { targets: s, angle: 540, scale: 0, alpha: 0, x: x + cell * 0.3, duration: d, ease: 'Cubic.easeIn' });
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
    const top = this.layout.board.y;
    const fade = this.layout.cellSize * 0.6;
    for (const s of this.sprites.values()) {
      if (s.getData('spawning') === true) s.setAlpha(Phaser.Math.Clamp((s.y - (top - fade * 0.3)) / fade, 0, 1));
    }
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
      s.setY(fromY).setAlpha(0).setData('spawning', true);
      const rows = sp.to.row - sp.fromRow;
      const duration = durationFor(rows);
      // Invisível acima do tabuleiro; aparece ao atravessar a margem superior (ver update()).
      jobs.push(
        this.fallTo(s, to.y, duration, this.t(20)).then(() => {
          s.setData('spawning', false).setAlpha(1);
        }),
      );
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
    for (const o of this.iceImages.values()) o.destroy();
    this.iceImages.clear();
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
    const sprite = this.pool.pop() ?? this.scene.add.image(0, 0, tileTexture(tile));
    sprite
      .setTexture(tileTexture(tile))
      .setPosition(x, y)
      .setScale(this.tileScale)
      .setAlpha(1)
      .setAngle(0)
      .setDepth(this.depth)
      .setVisible(true)
      .setActive(true)
      .setData('spawning', false);
    this.sprites.set(tile.id, sprite);
    return sprite;
  }

  private release(sprite: Phaser.GameObjects.Image): void {
    this.scene.tweens.killTweensOf(sprite);
    sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    sprite.setVisible(false).setActive(false);
    this.pool.push(sprite);
  }

  private drawFrame(): void {
    const { board, cellSize } = this.layout;
    const g = this.frame;
    g.clear();
    const rows = Math.round(board.height / cellSize);
    const cols = Math.round(board.width / cellSize);
    const playable = (r: number, c: number) => (this.shape ? this.shape.isPlayable({ row: r, col: c }) : true);
    const pad = cellSize * 0.16;
    const radius = cellSize * 0.3;
    // Painel desenhado como união das células jogáveis (assim acompanha a forma do nível).
    const layer = (color: number, alpha: number, grow: number, dy: number) => {
      g.fillStyle(color, alpha);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!playable(r, c)) continue;
          g.fillRoundedRect(board.x + c * cellSize - grow, board.y + r * cellSize - grow + dy, cellSize + grow * 2, cellSize + grow * 2, radius);
        }
      }
    };
    layer(0x1a0640, 0.35, pad, cellSize * 0.1);
    layer(0xffffff, 0.9, pad, 0);
    layer(UI_COLORS.violetLight, 1, pad - cellSize * 0.05, 0);
    layer(UI_COLORS.boardBg, 1, pad - cellSize * 0.08, 0);
    // Células em xadrez azul.
    const inset = cellSize * 0.03;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!playable(r, c)) continue;
        g.fillStyle((r + c) % 2 === 0 ? UI_COLORS.cellA : UI_COLORS.cellB, 0.75);
        g.fillRoundedRect(board.x + c * cellSize + inset, board.y + r * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.14);
      }
    }
  }
}
