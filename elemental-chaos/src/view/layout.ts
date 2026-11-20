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

/** Resolução interna de desenho conforme a qualidade escolhida (o layout escala tudo a partir daqui). */
export function renderSize(quality: 'high' | 'fast'): { width: number; height: number } {
  return quality === 'fast' ? { width: 720, height: 1280 } : { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT };
}

export function computeLayout(width: number, height: number, rows: number, cols: number): GameLayout {
  // Em ecrãs largos (desktop/tablet deitado) a "coluna" de jogo mantém proporção de telemóvel.
  const columnWidth = Math.min(width, height * 0.75);
  const uiScale = Math.min(columnWidth / REFERENCE_WIDTH, height / REFERENCE_HEIGHT * 1.15);
  const margin = Math.round(28 * uiScale);
  let hudHeight = Math.round(300 * uiScale);
  let footerHeight = Math.round(200 * uiScale);

  const availW = columnWidth - margin * 2;
  let availH = height - hudHeight - footerHeight - margin * 2;
  // Tamanho de referência da célula (8 colunas): tabuleiros mais pequenos ficam com
  // peças maiores, mas sem exagero (máx. 1,35×), para o tabuleiro não ocupar tudo.
  const refCell = Math.min(availW / 8, availH / 8);
  const cellSize = Math.max(8, Math.floor(Math.min(availW / cols, availH / rows, refCell * 1.35)));
  const boardW = cellSize * cols;
  const boardH = cellSize * rows;

  // Ecrãs altos: o espaço que sobra vai sobretudo para o rodapé (mascote) e um pouco para o HUD.
  const extra = availH - boardH;
  if (extra > 0) {
    const toHud = Math.min(extra * 0.2, 80 * uiScale);
    const toFooter = Math.min(extra * 0.62, 480 * uiScale);
    hudHeight += Math.round(toHud);
    footerHeight += Math.round(toFooter);
    availH -= Math.round(toHud) + Math.round(toFooter);
  }

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
