import * as Phaser from 'phaser';
import { BOARD_CONFIG, TIMINGS } from '../config/balance';
import { ELEMENT_STYLE, TEXTURE_KEYS } from '../config/theme';
import { Effects } from '../effects/Effects';
import { createLandscapeCanvas } from '../effects/sceneryArt';
import { chooseGreedyMove } from '../game/ai/greedyBot';
import { randomSeed } from '../game/core/rng';
import type { Swap } from '../game/core/types';
import { getLevel, LEVEL_COUNT, LEVELS } from '../game/levels/catalog';
import { presetCells } from '../game/levels/levelParser';
import { LevelRun, objectiveDelta, type ObjectiveProgress } from '../game/levels/LevelRun';
import type { LevelDefinition } from '../game/levels/types';
import { PhaseMachine } from '../game/resolution/stateMachine';
import type { CascadeStep, TurnResult } from '../game/resolution/turnResolver';
import { FEEDBACK_TEXT } from '../game/scoring/scoring';
import { GameSession } from '../game/session/GameSession';
import { BoardInput } from '../input/BoardInput';
import { progress } from '../storage/progress';
import { settings, type Settings } from '../storage/settings';
import { Footer } from '../ui/Footer';
import { Hud, objectiveIcon } from '../ui/Hud';
import { showLevelCard } from '../ui/LevelCard';
import type { Modal } from '../ui/Modal';
import { PauseOverlay } from '../ui/PauseOverlay';
import { showResult } from '../ui/ResultOverlay';
import { ensureTexture } from '../ui/textures';
import { wait } from '../utils/async';
import { BoardView } from '../view/BoardView';
import { computeLayout, type GameLayout } from '../view/layout';
import { fadeIn, goTo, SCENES, type GameSceneData } from './keys';

const DEPTH = { bg: 0, board: 10, fx: 20, hud: 30, overlay: 100 } as const;

/**
 * Cena de jogo: liga a lógica (GameSession + LevelRun), a apresentação (BoardView, HUD) e o input.
 * Cada jogada é resolvida de uma só vez pela lógica; aqui apenas se reproduzem os passos,
 * avançando a máquina de estados para bloquear o input até o tabuleiro estabilizar.
 */
export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private session!: GameSession;
  private run!: LevelRun;
  private phases!: PhaseMachine;
  private layout!: GameLayout;
  private background!: Phaser.GameObjects.Image;
  private view!: BoardView;
  private effects!: Effects;
  private hud!: Hud;
  private footer!: Footer;
  private pauseOverlay!: PauseOverlay;
  private boardInput!: BoardInput;
  private modal: Modal | null = null;
  private ready = false;
  private ended = false;
  private pendingRelayout = false;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    super(SCENES.game);
  }

  create(data: GameSceneData): void {
    this.level = getLevel(data.levelId ?? 1) ?? (LEVELS[0] as LevelDefinition);
    // Seed: do nível, do URL (?seed=123, para reproduzir) ou aleatória.
    const urlSeed = Number(new URLSearchParams(window.location.search).get('seed'));
    const seed = this.level.seed ?? (Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : randomSeed());
    this.session = new GameSession({
      seed,
      elements: this.level.elements,
      mechanics: this.level.mechanics,
      shape: this.level.shape,
      ...(this.level.preset ? { preset: presetCells(this.level.preset) } : {}),
    });
    this.run = new LevelRun(this.level);
    this.phases = new PhaseMachine();
    this.ready = false;
    this.ended = false;
    this.pendingRelayout = false;
    this.modal = null;
    this.layout = this.currentLayout();
    fadeIn(this);

    const bgKey = ensureTexture(this, TEXTURE_KEYS.background(this.level.theme), () => createLandscapeCanvas(this.level.theme, 540, 960));
    this.background = this.add.image(0, 0, bgKey).setDepth(DEPTH.bg);
    this.effects = new Effects(this, DEPTH.fx);
    this.view = new BoardView(this, this.layout, this.effects, DEPTH.board);
    this.hud = new Hud(this, DEPTH.hud);
    this.hud.setLevel(this.level);
    this.footer = new Footer(this, DEPTH.hud, () => this.openPause());
    this.pauseOverlay = new PauseOverlay(this, DEPTH.overlay, {
      onResume: () => this.closePause(),
      onRestart: () => this.restartLevel(),
      onMap: () => this.toMap(),
    });
    this.boardInput = new BoardInput(this, this.layout, BOARD_CONFIG.rows, BOARD_CONFIG.cols, {
      canInteract: () => this.ready && !this.ended && !this.modal && this.phases.acceptsInput && !this.pauseOverlay.isOpen,
      onSelect: (cell) => this.view.select(cell),
      onSwap: (swap) => void this.playTurn(swap),
    });

    this.applySettings(settings.value);
    this.unsubscribers.push(settings.onChange((s) => this.applySettings(s)));
    this.applyLayout();
    this.refreshHud(this.run.progress, 0);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    if (import.meta.env.DEV) {
      // Ganchos de depuração/testes automáticos (apenas em desenvolvimento).
      (window as unknown as { __ec?: unknown }).__ec = {
        scene: this,
        seed,
        level: () => this.level.id,
        phase: () => this.phases.phase,
        moves: () => this.session.movesMade,
        run: () => ({ status: this.run.status, movesLeft: this.run.movesLeft, score: this.run.score, progress: this.run.progress }),
        hint: () => this.session.hint(),
        bestMove: () => chooseGreedyMove(this.session, this.run),
        layout: () => this.layout,
        mismatches: () => this.view.debugMismatches(this.session.board),
        ready: () => this.ready && !this.modal,
      };
    }

    void this.view.build(this.session.board, true).then(() => {
      this.ready = true;
      if (data.showIntro) this.showIntro();
    });
  }

  override update(time: number): void {
    this.view.update(time);
  }

  private showIntro(): void {
    const stars = progress.value.levels[this.level.id]?.stars ?? 0;
    const close = () => {
      this.modal?.close();
      this.modal = null;
    };
    this.modal = showLevelCard(this, DEPTH.overlay, this.layout.uiScale, this.level, stars, close, close);
  }

  private currentLayout(): GameLayout {
    return computeLayout(this.scale.width, this.scale.height, BOARD_CONFIG.rows, BOARD_CONFIG.cols);
  }

  private applySettings(s: Settings): void {
    this.effects.setReduced(s.reducedEffects);
    this.view.setReducedMotion(s.reducedEffects);
  }

  private handleResize(): void {
    this.layout = this.currentLayout();
    // Durante animações não se mexe nos sprites; aplica-se quando voltar a IDLE.
    if (this.phases.acceptsInput && this.ready) this.applyLayout();
    else this.pendingRelayout = true;
  }

  private applyLayout(): void {
    const { width, height } = this.layout;
    const bgScale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setPosition(width / 2, height / 2).setScale(bgScale);
    this.view.relayout(this.layout, this.session.board);
    this.effects.setCellSize(this.layout.cellSize);
    this.hud.relayout(this.layout);
    this.footer.relayout(this.layout);
    this.boardInput.setLayout(this.layout);
    if (this.pauseOverlay.isOpen) this.pauseOverlay.open(this.layout);
    this.pendingRelayout = false;
  }

  private refreshHud(prog: readonly ObjectiveProgress[], score: number): void {
    this.hud.setMoves(this.run.movesLeft);
    this.hud.setScore(score);
    this.hud.setObjectives(prog);
  }

  private openPause(): void {
    if (this.pauseOverlay.isOpen || this.ended || this.modal) return;
    this.boardInput.clearSelection();
    this.tweens.pauseAll();
    this.time.paused = true;
    this.pauseOverlay.open(this.layout);
  }

  private closePause(): void {
    this.pauseOverlay.close();
    this.tweens.resumeAll();
    this.time.paused = false;
  }

  private restartLevel(): void {
    this.closePause();
    const data: GameSceneData = { levelId: this.level.id, showIntro: false };
    goTo(this, SCENES.game, data);
  }

  private toMap(): void {
    this.closePause();
    goTo(this, SCENES.map);
  }

  /** Reproduz uma jogada completa, passo a passo, seguindo a máquina de estados. */
  private async playTurn(swap: Swap): Promise<void> {
    if (!this.phases.acceptsInput || this.ended) return;
    const before = this.session.board;
    const idA = before.get(swap.a)?.id;
    const idB = before.get(swap.b)?.id;
    if (idA === undefined || idB === undefined) return;

    this.phases.transition('SWAPPING');
    const result: TurnResult = this.session.trySwap(swap);

    if (result.kind === 'invalid') {
      await this.view.playInvalidSwap(swap.a, swap.b, idA, idB);
      this.phases.transition('IDLE');
      this.afterTurn();
      return;
    }

    // A lógica do nível é aplicada já; o HUD acompanha a animação passo a passo.
    const displayed = this.run.progress.map((p) => ({ ...p }));
    let shownScore = this.run.score;
    const summary = this.run.applyTurn(result);
    this.hud.setMoves(this.run.movesLeft);

    await this.view.playSwap(swap.a, swap.b, idA, idB);

    for (const [i, step] of result.steps.entries()) {
      this.phases.transition('MATCHING');
      await this.view.playMatchPop(step);
      if (step.reactions.length > 0) {
        this.phases.transition('REACTING');
        await this.view.playReactions(step);
      }
      this.phases.transition('CLEARING');
      this.flyCollected(step, displayed);
      this.showStepScore(step, summary.stepScores[i] ?? 0);
      await this.view.playVanish(step);
      this.view.applyWet(step.wetApplied, true);

      shownScore += summary.stepScores[i] ?? 0;
      displayed.forEach((d, k) => {
        const o = d.objective;
        const current = o.type === 'score' ? shownScore : d.current + objectiveDelta(o, step);
        displayed[k] = { objective: o, current: Math.min(current, o.target), done: current >= o.target };
      });
      this.refreshHud(displayed, shownScore);

      this.phases.transition('FALLING');
      this.phases.transition('REFILLING');
      await this.view.playFallAndRefill(step);
      this.phases.transition('CHECKING');
      await this.view.pause(TIMINGS.cascadePause);
    }

    this.view.applyWet(result.wetTicks, false);
    if (result.shuffle) {
      this.phases.transition('SHUFFLING');
      this.effects.label(this.layout.width / 2, this.layout.board.y + this.layout.board.height / 2, 'A baralhar…', '#ffffff');
      await this.view.playShuffle(result.shuffle);
    }
    this.phases.transition('IDLE');
    this.refreshHud(this.run.progress, this.run.score - summary.winBonus);

    if (summary.feedback) {
      const { board } = this.layout;
      void this.effects.feedback(board.x + board.width / 2, board.y + board.height / 2, FEEDBACK_TEXT[summary.feedback], summary.feedback === 'ELEMENTAL_CHAOS');
    }
    this.afterTurn();
    if (summary.status !== 'playing') await this.finish(summary.winBonus);
  }

  /** Cristais recolhidos voam até ao ícone do objetivo correspondente. */
  private flyCollected(step: CascadeStep, displayed: readonly ObjectiveProgress[]): void {
    const size = this.layout.cellSize * 0.6;
    this.level.objectives.forEach((o, k) => {
      if (o.type !== 'collect' || displayed[k]?.done) return;
      const target = this.hud.objectiveTarget(k);
      if (!target) return;
      step.cleared
        .filter((c) => c.tile.element === o.element)
        .slice(0, settings.value.reducedEffects ? 2 : 6)
        .forEach((c, n) => void this.effects.flyTo(objectiveIcon(o), this.view.cellCenter(c.at), target, size, n * 40));
    });
  }

  private showStepScore(step: CascadeStep, points: number): void {
    if (points <= 0 || step.cleared.length === 0) return;
    let x = 0;
    let y = 0;
    for (const c of step.cleared) {
      const p = this.view.cellCenter(c.at);
      x += p.x;
      y += p.y;
    }
    const element = step.matches[0]?.element ?? step.cleared[0]?.tile.element ?? 'fire';
    this.effects.floatingScore(x / step.cleared.length, y / step.cleared.length, points, ELEMENT_STYLE[element].dark);
  }

  private async finish(winBonus: number): Promise<void> {
    this.ended = true;
    this.boardInput.clearSelection();
    const won = this.run.status === 'won';
    const { board } = this.layout;
    if (won) {
      progress.recordWin(this.level.id, this.run.stars, this.run.score, LEVEL_COUNT);
      if (winBonus > 0) this.effects.label(board.x + board.width / 2, board.y + board.height * 0.35, `Bónus +${winBonus}`, '#fff3a0');
      this.hud.setScore(this.run.score);
    }
    await wait(this, won ? 1100 : 500);
    const nextId = this.level.id + 1;
    this.modal = showResult(
      this,
      DEPTH.overlay,
      this.layout.uiScale,
      {
        won,
        levelId: this.level.id,
        stars: this.run.stars,
        score: this.run.score,
        winBonus,
        progress: this.run.progress,
        hasNext: nextId <= LEVEL_COUNT,
        reducedEffects: settings.value.reducedEffects,
      },
      {
        onNext: () => goTo(this, SCENES.game, { levelId: nextId, showIntro: true } satisfies GameSceneData),
        onRetry: () => goTo(this, SCENES.game, { levelId: this.level.id, showIntro: false } satisfies GameSceneData),
        onMap: () => goTo(this, SCENES.map),
      },
    );
  }

  private afterTurn(): void {
    if (this.pendingRelayout) this.applyLayout();
    if (import.meta.env.DEV) {
      const problems = this.view.debugMismatches(this.session.board);
      if (problems.length > 0) console.error('[Elemental Chaos] vista desalinhada da lógica:', problems);
    }
  }

  private cleanup(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    this.boardInput.destroy();
    this.view.destroy();
    this.effects.destroy();
    this.hud.destroy();
    this.footer.destroy();
    this.pauseOverlay.destroy();
    this.modal?.close();
    this.time.paused = false;
    this.tweens.resumeAll();
  }
}
