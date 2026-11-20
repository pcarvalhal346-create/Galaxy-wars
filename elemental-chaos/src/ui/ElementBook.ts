import type Phaser from 'phaser';
import { ELEMENT_STYLE, TEXTURE_KEYS, UI_COLORS } from '../config/theme';
import { ELEMENTS, type ElementType } from '../game/core/types';
import { Button } from './Button';
import { Modal } from './Modal';

const DESCRIPTIONS: Readonly<Record<ElementType, string>> = {
  fire: 'Ofensivo. Ao lado de cristais molhados provoca uma EXPLOSÃO DE VAPOR 3×3.',
  water: 'Preparação. Combinar Água MOLHA os cristais vizinhos durante 2 jogadas.',
  lightning: 'Propagação. Ao lado de cristais molhados lança uma CORRENTE por até 8 molhados ligados.',
  earth: 'Estável. Em mundos futuros vai enraizar obstáculos e cristais.',
  air: 'Mobilidade. Em mundos futuros vai criar redemoinhos que mudam o tabuleiro.',
};

/**
 * Livro dos Elementos: página 1 — o que cada elemento faz e como reagem;
 * página 2 — os cristais especiais. `onClose` recebe o modal atual para o fechar.
 */
export function showElementBook(scene: Phaser.Scene, depth: number, s: number, onClose: () => void, page: 1 | 2 = 1): Modal {
  const w = Math.min(scene.scale.width - 40 * s, 900 * s);
  const h = Math.min(scene.scale.height - 120 * s, 1500 * s);
  if (page === 2) return specialsPage(scene, depth, s, w, h, onClose);
  const m: Modal = new Modal(scene, depth, { title: 'Livro dos Elementos', width: w, height: h, scale: s, onClose });
  const top = -h / 2 + 120 * s;
  const rowH = (h * 0.62) / ELEMENTS.length;
  ELEMENTS.forEach((e, i) => {
    const y = top + rowH * (i + 0.5);
    const icon = scene.add.image(-w / 2 + 100 * s, y, TEXTURE_KEYS.tile(e)).setDisplaySize(rowH * 0.8, rowH * 0.8);
    m.add(icon);
    const name = m.text(-w / 2 + 190 * s, y - rowH * 0.24, ELEMENT_STYLE[e].name.toUpperCase(), 34, UI_COLORS.accent);
    name.setOrigin(0, 0.5);
    const desc = m.text(-w / 2 + 190 * s, y + rowH * 0.12, DESCRIPTIONS[e], 24, '#ffffff', w - 260 * s);
    desc.setOrigin(0, 0.5).setAlign('left');
  });

  // Reações: pequenas "equações" com os cristais.
  const ry = top + rowH * ELEMENTS.length + 40 * s;
  m.text(0, ry, 'REAÇÕES', 32, '#ffe7ff');
  const icon = (key: string, x: number, y: number, size = 90 * s) => m.add(scene.add.image(x, y, key).setDisplaySize(size, size));
  const sign = (x: number, y: number, t: string) => m.text(x, y, t, 44);
  const eq = (y: number, a: ElementType, b: ElementType, result: string, label: string) => {
    icon(TEXTURE_KEYS.tile(a), -w * 0.32, y);
    sign(-w * 0.22, y, '+');
    icon(TEXTURE_KEYS.tile(b), -w * 0.12, y);
    icon(TEXTURE_KEYS.wet, -w * 0.12, y, 100 * s);
    sign(-w * 0.02, y, '=');
    icon(result, w * 0.09, y);
    m.text(w * 0.28, y, label, 26, '#ffffff', w * 0.26);
  };
  eq(ry + 100 * s, 'fire', 'earth', TEXTURE_KEYS.iconSteam, 'Fogo + cristal molhado: VAPOR 3×3');
  eq(ry + 215 * s, 'lightning', 'air', TEXTURE_KEYS.iconLightning, 'Raio + cristais molhados: CORRENTE');
  m.add(
    new Button(scene, 0, h / 2 - 80 * s, { width: w * 0.62, height: 100 * s, label: 'Cristais especiais ›', fontSize: 36 * s, color: UI_COLORS.orange, onClick: () => {
      m.close();
      book.current = showElementBook(scene, depth, s, onClose, 2);
    } }),
  );
  book.current = m;
  return m;
}

/** O modal do livro aberto neste momento (muda quando se vira a página). */
export const book: { current: Modal | null } = { current: null };

function specialsPage(scene: Phaser.Scene, depth: number, s: number, w: number, h: number, onClose: () => void): Modal {
  const m: Modal = new Modal(scene, depth, { title: 'Cristais Especiais', width: w, height: h, scale: s, onClose });
  const rows: [string, string, string][] = [
    [TEXTURE_KEYS.special('fire', 'lance-h'), 'LANÇA — 4 em linha', 'Dispara um raio de luz que limpa a linha inteira (ou a coluna, se for vertical).'],
    [TEXTURE_KEYS.special('water', 'core'), 'NÚCLEO — L, T ou cruz', 'Explode em losango e destrói tudo à volta (2 casas para cada lado).'],
    [TEXTURE_KEYS.orb, 'ORBE DO CAOS — 5 em linha', 'Troca-o com um cristal: destrói TODOS os cristais desse elemento!'],
  ];
  const top = -h / 2 + 150 * s;
  const rowH = (h * 0.6) / rows.length;
  rows.forEach(([key, title, desc], i) => {
    const y = top + rowH * (i + 0.5);
    m.add(scene.add.image(-w / 2 + 110 * s, y, key).setDisplaySize(rowH * 0.72, rowH * 0.72));
    m.text(-w / 2 + 210 * s, y - rowH * 0.22, title, 32, UI_COLORS.accent).setOrigin(0, 0.5);
    m.text(-w / 2 + 210 * s, y + rowH * 0.12, desc, 25, '#ffffff', w - 280 * s).setOrigin(0, 0.5).setAlign('left');
  });
  m.text(0, top + rowH * rows.length + 40 * s, 'COMBINAÇÕES', 30, '#ffe7ff');
  m.text(0, top + rowH * rows.length + 130 * s, 'Troca dois especiais entre si para os ativar ao mesmo tempo. Orbe + Orbe limpa o tabuleiro todo!', 26, '#ffffff', w * 0.82);
  m.add(
    new Button(scene, 0, h / 2 - 80 * s, { width: w * 0.62, height: 100 * s, label: '‹ Elementos', fontSize: 36 * s, color: UI_COLORS.blue, onClick: () => {
      m.close();
      book.current = showElementBook(scene, depth, s, onClose, 1);
    } }),
  );
  book.current = m;
  return m;
}
