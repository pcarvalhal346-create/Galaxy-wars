/**
 * Cálculo do layout (puro, sem Phaser): divide o ecrã em HUD, tabuleiro e rodapé.
 * O tabuleiro é sempre quadrado (nunca distorcido) e centrado.
 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GameLayout {
  readonly width: number;
  readonly height: number;
  readonly hud: Rect;
  readonly board: Rect;
  readonly footer: Rect;
  readonly cellSize: number;
  /** Escala de UI relativa à largura de referência (1080). */
  readonly uiScale: number;
}

export const REFERENCE_WIDTH = 1080;
export const REFERENCE_HEIGHT = 1920;

export function computeLayout(width: number, height: number, rows: number, cols: number): GameLayout {
  // Em ecrãs largos (desktop/tablet deitado) a "coluna" de jogo mantém proporção de telemóvel.
  const columnWidth = Math.min(width, height * 0.75);
  const uiScale = Math.min(columnWidth / REFERENCE_WIDTH, height / REFERENCE_HEIGHT * 1.15);
  const margin = Math.round(28 * uiScale);
  const hudHeight = Math.round(300 * uiScale);
  const footerHeight = Math.round(200 * uiScale);

  const availW = columnWidth - margin * 2;
  const availH = height - hudHeight - footerHeight - margin * 2;
  const cellSize = Math.max(8, Math.floor(Math.min(availW / cols, availH / rows)));
  const boardW = cellSize * cols;
  const boardH = cellSize * rows;

  const left = Math.round((width - columnWidth) / 2);
  const boardX = Math.round((width - boardW) / 2);
  // Centra o tabuleiro no espaço entre HUD e rodapé.
  const boardY = Math.round(hudHeight + margin + (availH - boardH) / 2);

  return {
    width,
    height,
    uiScale,
    cellSize,
    hud: { x: left, y: 0, width: columnWidth, height: hudHeight },
    board: { x: boardX, y: boardY, width: boardW, height: boardH },
    footer: { x: left, y: height - footerHeight, width: columnWidth, height: footerHeight },
  };
}
