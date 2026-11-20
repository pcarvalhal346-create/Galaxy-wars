import { describe, expect, it } from 'vitest';
import { pointToCell, swipeDirection } from '../input/gestures';
import { computeLayout } from '../view/layout';

describe('layout adaptável', () => {
  const sizes: [number, number][] = [
    [1080, 1920], // 9:16
    [1127, 1920], // iPhone 13 (área segura)
    [1080, 2400], // telemóvel alto 20:9
    [1440, 1920], // tablet 3:4
    [3413, 1920], // desktop 16:9
  ];

  for (const [w, h] of sizes) {
    it(`${w}x${h}: tabuleiro quadrado, dentro do ecrã e entre HUD e rodapé`, () => {
      // Também para tabuleiros mais pequenos e não quadrados.
      for (const [r, c] of [[6, 6], [7, 7], [9, 9], [8, 9]] as const) {
        const S = computeLayout(w, h, r, c);
        expect(S.board.width).toBe(S.cellSize * c);
        expect(S.board.y).toBeGreaterThanOrEqual(S.hud.y + S.hud.height);
        expect(S.board.y + S.board.height).toBeLessThanOrEqual(S.footer.y);
        expect(S.board.x + S.board.width).toBeLessThanOrEqual(w);
      }
      const L = computeLayout(w, h, 8, 8);
      expect(L.board.width).toBe(L.board.height);
      expect(L.board.width).toBe(L.cellSize * 8);
      expect(L.board.x).toBeGreaterThanOrEqual(0);
      expect(L.board.x + L.board.width).toBeLessThanOrEqual(w);
      expect(L.board.y).toBeGreaterThanOrEqual(L.hud.y + L.hud.height);
      expect(L.board.y + L.board.height).toBeLessThanOrEqual(L.footer.y);
      expect(L.cellSize).toBeGreaterThan(80); // peças grandes e fáceis de tocar
    });
  }
});

it('ecrãs altos: o espaço entre o HUD e o tabuleiro fica pequeno', () => {
  const L = computeLayout(1080, 2340, 8, 8);
  expect(L.board.y - (L.hud.y + L.hud.height)).toBeLessThan(L.cellSize * 1.2);
  expect(L.footer.height).toBeGreaterThan(300 * L.uiScale);
});

describe('gestos', () => {
  const board = { x: 100, y: 200, width: 800, height: 800 };

  it('converte pontos em células e ignora fora do tabuleiro', () => {
    expect(pointToCell(150, 250, board, 100, 8, 8)).toEqual({ row: 0, col: 0 });
    expect(pointToCell(899, 999, board, 100, 8, 8)).toEqual({ row: 7, col: 7 });
    expect(pointToCell(99, 250, board, 100, 8, 8)).toBeNull();
    expect(pointToCell(150, 1000, board, 100, 8, 8)).toBeNull();
  });

  it('deteta a direção dominante do swipe acima do limiar', () => {
    expect(swipeDirection(10, 5, 30)).toBeNull();
    expect(swipeDirection(40, 10, 30)).toEqual({ row: 0, col: 1 });
    expect(swipeDirection(-40, 10, 30)).toEqual({ row: 0, col: -1 });
    expect(swipeDirection(5, 45, 30)).toEqual({ row: 1, col: 0 });
    expect(swipeDirection(5, -45, 30)).toEqual({ row: -1, col: 0 });
  });
});

import { computeMapGeometry } from '../view/mapLayout';

describe('mapa de níveis', () => {
  it('nós dentro do ecrã, de baixo para cima, com espaçamento constante', () => {
    for (const [w, h] of [[1127, 1920], [1080, 2400], [1440, 1920]] as const) {
      const g = computeMapGeometry(10, w, h, 1);
      expect(g.nodes).toHaveLength(10);
      for (const n of g.nodes) {
        expect(n.x).toBeGreaterThan(80);
        expect(n.x).toBeLessThan(w - 80);
        expect(n.y).toBeGreaterThan(0);
        expect(n.y).toBeLessThan(g.height);
      }
      for (let i = 1; i < g.nodes.length; i++) expect((g.nodes[i - 1]?.y ?? 0) - (g.nodes[i]?.y ?? 0)).toBeCloseTo(g.spacing);
    }
  });
});
