import * as Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { FONT_FAMILY, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { createMapCanvas } from '../effects/sceneryArt';
import { getLevel, LEVEL_COUNT } from '../game/levels/catalog';
import { worldOf, WORLDS } from '../game/levels/worlds';
import { progress } from '../storage/progress';
import { IconButton } from '../ui/Button';
import { book, showElementBook } from '../ui/ElementBook';
import { showLevelCard } from '../ui/LevelCard';
import { pinToScreen, type Modal } from '../ui/Modal';
import { ensureTexture, panelTexture } from '../ui/textures';
import { computeMapGeometry } from '../view/mapLayout';
import { fadeIn, goTo, SCENES, type GameSceneData } from './keys';

/** Nós mostrados no mapa: os níveis jogáveis + alguns "em breve" para mostrar o caminho. */
const VISIBLE_NODES = LEVEL_COUNT + 3;

/** Mapa de níveis com caminho sinuoso, estrelas e níveis bloqueados. Rola na vertical. */
export class MapScene extends Phaser.Scene {
  private dragStartY = 0;
  private scrollStart = 0;
  private dragged = false;
  private card: Modal | null = null;

  constructor() {
    super(SCENES.map);
  }

  create(): void {
    const { width, height } = this.scale;
    const s = Math.min(width / 1080, (height / 1920) * 1.15);
    fadeIn(this);
    audio.setMusic('menu');
    this.card = null;
    const geo = computeMapGeometry(VISIBLE_NODES, width, height, s);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, geo.height);

    // Fundo comprido gerado a meia resolução (suave por natureza).
    // Fundo em pedaços de até 1024 px (a meia resolução), para respeitar os limites de textura dos telemóveis.
    const hw = Math.round(width / 2);
    const hh = Math.round(geo.height / 2);
    const chunk = 1024;
    for (let y0 = 0; y0 < hh; y0 += chunk) {
      const ch = Math.min(chunk, hh - y0);
      const key = ensureTexture(this, `bg-map-${hw}x${hh}-${y0}`, () => createMapCanvas(hw, ch, y0, hh));
      this.add.image(0, y0 * 2, key).setOrigin(0).setDisplaySize(width, ch * 2 + 1);
    }

    // Caminho: curva suave pelos nós, com borda branca e marcas.
    const curve = new Phaser.Curves.Spline(geo.nodes.map((n) => new Phaser.Math.Vector2(n.x, n.y)));
    const pts = curve.getPoints(geo.nodes.length * 24);
    const road = this.add.graphics();
    road.lineStyle(70 * s, 0xffffff, 0.95).strokePoints(pts);
    road.lineStyle(52 * s, 0xffa8d8, 1).strokePoints(pts);
    road.lineStyle(14 * s, 0xffffff, 0.6);
    for (let i = 0; i < pts.length - 1; i += 6) {
      const a = pts[i] as Phaser.Math.Vector2;
      const b = pts[i + 2] as Phaser.Math.Vector2;
      road.lineBetween(a.x, a.y, b.x, b.y);
    }

    const unlocked = progress.value.unlocked;
    let current: { x: number; y: number } | null = null;
    for (const node of geo.nodes) {
      const level = getLevel(node.level);
      const record = progress.value.levels[node.level];
      const available = !!level && node.level <= unlocked;
      const kind = !level || !available ? 'locked' : record && record.stars > 0 ? 'done' : 'open';
      const size = (node.level === unlocked && level ? 170 : 140) * s;
      const img = this.add.image(node.x, node.y, TEXTURE_KEYS.node(kind)).setDisplaySize(size, size);
      if (kind === 'locked') {
        this.add.image(node.x, node.y - 4 * s, TEXTURE_KEYS.iconLock).setDisplaySize(size * 0.42, size * 0.42);
        if (!level) {
          this.add.text(node.x, node.y + size * 0.62, 'Em breve', label(26 * s)).setOrigin(0.5).setAlpha(0.9);
        }
      } else {
        this.add.text(node.x, node.y - 4 * s, String(node.level), label(64 * s)).setOrigin(0.5);
      }
      if (record) {
        for (let i = 0; i < 3; i++) {
          this.add
            .image(node.x + (i - 1) * 46 * s, node.y + size * 0.52 - (i === 1 ? 8 * s : 0), i < record.stars ? TEXTURE_KEYS.starFull : TEXTURE_KEYS.starEmpty)
            .setDisplaySize(52 * s, 52 * s);
        }
      }
      if (level && available) {
        img.setInteractive({ useHandCursor: true });
        img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
          if (this.dragged) return;
          audio.play('tap');
          this.openLevel(node.level, s);
        });
      }
      if (level && node.level === unlocked) current = node;
    }

    // Faixas com o nome de cada mundo, junto ao seu primeiro nível.
    for (const w of WORLDS) {
      const n = geo.nodes[w.first - 1];
      if (!n) continue;
      const bx = n.x < width / 2 ? Math.min(width - 260 * s, n.x + 330 * s) : Math.max(260 * s, n.x - 330 * s);
      const ribbon = this.add.image(bx, n.y + 40 * s, panelTexture(this, 440 * s, 130 * s, 0xff7ac0, 0xd6267f, 46 * s)).setDepth(5);
      ribbon.setAngle(-3);
      this.add.text(bx, n.y + 14 * s, `Mundo ${WORLDS.indexOf(w) + 1}`, label(26 * s, '#ffe7ff')).setOrigin(0.5).setAngle(-3).setDepth(6);
      this.add.text(bx, n.y + 52 * s, w.name, label(36 * s)).setOrigin(0.5).setAngle(-3).setDepth(6);
    }

    // Marcador do nível atual: cristal a saltitar por cima do nó.
    if (current) {
      const ring = this.add.image(current.x, current.y, TEXTURE_KEYS.ring).setDisplaySize(230 * s, 230 * s).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ring, scale: ring.scale * 1.12, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
      const marker = this.add.image(current.x, current.y - 165 * s, TEXTURE_KEYS.lumi('happy')).setDisplaySize(170 * s, 170 * s);
      this.tweens.add({ targets: marker, y: marker.y - 24 * s, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      cam.centerOn(width / 2, current.y - height * 0.1);
    } else {
      cam.scrollY = geo.height - height;
    }

    // Cabeçalho fixo: voltar ao início, nome do mundo e estrelas.
    const headerW = Math.min(width - 40 * s, 1000 * s);
    const header = this.add.image(width / 2, 100 * s, panelTexture(this, headerW, 130 * s, UI_COLORS.panelLight, UI_COLORS.panel, 50 * s));
    const title = this.add.text(width / 2, 100 * s, worldOf(Math.min(unlocked, LEVEL_COUNT)).name, label(46 * s)).setOrigin(0.5);
    const stars = this.add
      .text(width / 2 + headerW / 2 - 40 * s, 100 * s, `★ ${progress.totalStars()}/${LEVEL_COUNT * 3}`, label(38 * s, UI_COLORS.accent))
      .setOrigin(1, 0.5);
    const home = new IconButton(this, width / 2 - headerW / 2 + 70 * s, 100 * s, 110 * s, 'home', UI_COLORS.pink, () => goTo(this, SCENES.title));
    const bookBtn = new IconButton(this, width - 90 * s, height - 100 * s, 130 * s, 'book', UI_COLORS.blue, () => {
      if (this.card) return;
      this.card = showElementBook(this, 100, s, () => {
        book.current?.close();
        this.card = null;
      });
    });
    for (const o of [header, title, stars, home, bookBtn]) {
      pinToScreen(o);
      o.setDepth(50);
    }

    this.setupScrolling();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.restartOnResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.restartOnResize, this));
  }

  private restartOnResize(): void {
    this.scene.restart();
  }

  private setupScrolling(): void {
    const cam = this.cameras.main;
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.dragStartY = p.y;
      this.scrollStart = cam.scrollY;
      this.dragged = false;
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!p.isDown || this.card) return;
      const dy = p.y - this.dragStartY;
      if (Math.abs(dy) > 12) this.dragged = true;
      if (this.dragged) cam.scrollY = this.scrollStart - dy;
    });
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.card) cam.scrollY += dy;
    });
  }

  private openLevel(levelId: number, s: number): void {
    const level = getLevel(levelId);
    if (!level || this.card) return;
    const stars = progress.value.levels[levelId]?.stars ?? 0;
    this.card = showLevelCard(this, 100, s, level, stars, () => {
      const data: GameSceneData = { levelId, showIntro: false };
      goTo(this, SCENES.game, data);
    }, () => {
      this.card?.close();
      this.card = null;
    });
  }
}

function label(size: number, color = '#ffffff'): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${Math.round(size)}px`,
    fontStyle: 'normal',
    color,
    stroke: UI_COLORS.stroke,
    strokeThickness: Math.max(3, Math.round(size * 0.17)),
  };
}
