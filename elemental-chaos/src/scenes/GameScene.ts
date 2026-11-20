import * as Phaser from 'phaser';
import { BOARD_CONFIG, TIMINGS } from '../config/balance';
import { TEXTURE_KEYS } from '../config/theme';
import { Effects } from '../effects/Effects';
import { randomSeed } from '../game/core/rng';
import type { Swap } from '../game/core/types';
import { PhaseMachine } from '../game/resolution/stateMachine';
import type { TurnResult } from '../game/resolution/turnResolver';
import { GameSession } from '../game/session/GameSession';
import { BoardInput } from '../input/BoardInput';
import { settings, type Settings } from '../storage/settings';
import { Footer } from '../ui/Footer';
import { Hud } from '../ui/Hud';
import { PauseOverlay } from '../ui/PauseOverlay';
import { BoardView } from '../view/BoardView';
import { computeLayout, type GameLayout } from '../view/layout';

const DEPTH = { bg: 0, board: 10, fx: 20, hud: 30, overlay: 100 } as const;

interface GameSceneData {
  seed?: number;
}

/**
 * Cena de jogo: liga a lógica (GameSession), a apresentação (BoardView, HUD) e o input.
 * A jogada é resolvida de uma só vez pela lógica; aqui apenas se reproduzem os passos,
 * avançando a máquina de estados para bloquear o input até o tabuleiro estabilizar.
 */
export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private phases!: PhaseMachine;
  private layout!: GameLayout;
  private background!: Phaser.GameObjects.Image;
  private view!: BoardView;
  private effects!: Effects;
  private hud!: Hud;
  private footer!: Footer;
  private pauseOverlay!: PauseOverlay;
  private input2!: BoardInput;
  private ready = false;
  private pendingRelayout = false;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    super('Game');
  }

  create(data: GameSceneData): void {
    // Seed por URL (?seed=123) para reproduzir partidas; senão, aleatória.
    const urlSeed = Number(new URLSearchParams(window.location.search).get('seed'));
    const seed = data.seed ?? (Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : randomSeed());
    this.session = new GameSession({ seed });
    this.phases = new PhaseMachine();
    this.ready = false;
    this.pendingRelayout = false;
    this.layout = this.currentLayout();

    this.background = this.add.image(0, 0, TEXTURE_KEYS.background).setDepth(DEPTH.bg);
    this.effects = new Effects(this, DEPTH.fx);
    this.view = new BoardView(this, this.layout, this.effects, DEPTH.board);
    this.hud = new Hud(this, DEPTH.hud);
    this.hud.setInfo('Nível 1', 'Treino livre · faz combinações de 3+');
    this.hud.setMoves(0);
    this.footer = new Footer(this, DEPTH.hud, () => this.openPause());
    this.pauseOverlay = new PauseOverlay(this, DEPTH.overlay, {
      onResume: () => this.closePause(),
      onRestart: () => this.scene.restart({}),
    });
    this.input2 = new BoardInput(this, this.layout, BOARD_CONFIG.rows, BOARD_CONFIG.cols, {
      canInteract: () => this.ready && this.phases.acceptsInput && !this.pauseOverlay.isOpen,
      onSelect: (cell) => this.view.select(cell),
      onSwap: (swap) => void this.playTurn(swap),
    });

    this.applySettings(settings.value);
    this.unsubscribers.push(settings.onChange((s) => this.applySettings(s)));
    this.applyLayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    if (import.meta.env.DEV) {
      // Ganchos de depuração/testes automáticos (apenas em desenvolvimento).
      (window as unknown as { __ec?: unknown }).__ec = {
        scene: this,
        seed,
        phase: () => this.phases.phase,
        moves: () => this.session.movesMade,
        hint: () => this.session.hint(),
        layout: () => this.layout,
        mismatches: () => this.view.debugMismatches(this.session.board),
      };
    }

    void this.view.build(this.session.board, true).then(() => {
      this.ready = true;
    });
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
    this.input2.setLayout(this.layout);
    if (this.pauseOverlay.isOpen) this.pauseOverlay.relayout(this.layout);
    this.pendingRelayout = false;
  }

  private openPause(): void {
    if (this.pauseOverlay.isOpen) return;
    this.input2.clearSelection();
    this.tweens.pauseAll();
    this.time.paused = true;
    this.pauseOverlay.open(this.layout);
  }

  private closePause(): void {
    this.pauseOverlay.close();
    this.tweens.resumeAll();
    this.time.paused = false;
  }

  /** Reproduz uma jogada completa, passo a passo, seguindo a máquina de estados. */
  private async playTurn(swap: Swap): Promise<void> {
    if (!this.phases.acceptsInput) return;
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

    await this.view.playSwap(swap.a, swap.b, idA, idB);
    this.hud.setMoves(this.session.movesMade);

    for (const step of result.steps) {
      this.phases.transition('MATCHING');
      // (Fase 2: REACTING entra aqui, entre MATCHING e CLEARING.)
      this.phases.transition('CLEARING');
      await this.view.playClear(step);
      this.phases.transition('FALLING');
      this.phases.transition('REFILLING');
      await this.view.playFallAndRefill(step);
      this.phases.transition('CHECKING');
      await this.view.pause(TIMINGS.cascadePause);
    }

    if (result.shuffle) {
      this.phases.transition('SHUFFLING');
      await this.view.playShuffle(result.shuffle);
    }
    this.phases.transition('IDLE');
    this.afterTurn();
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
    this.input2.destroy();
    this.view.destroy();
    this.effects.destroy();
    this.hud.destroy();
    this.footer.destroy();
    this.pauseOverlay.destroy();
    this.time.paused = false;
  }
}
