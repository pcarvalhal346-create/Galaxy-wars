import type { Position, Tile, TileId } from '../core/types';

/**
 * Grelha lógica do tabuleiro. Guarda peças (ou `null` em células vazias durante a resolução).
 * Linha 0 é o topo; a gravidade puxa as peças para linhas maiores.
 */
export class Board {
  private readonly cells: (Tile | null)[];

  constructor(
    readonly rows: number,
    readonly cols: number,
    cells?: readonly (Tile | null)[],
  ) {
    if (rows <= 0 || cols <= 0) throw new Error('Board: dimensões inválidas');
    if (cells && cells.length !== rows * cols) throw new Error('Board: número de células inválido');
    this.cells = cells ? [...cells] : new Array<Tile | null>(rows * cols).fill(null);
  }

  inBounds(p: Position): boolean {
    return p.row >= 0 && p.row < this.rows && p.col >= 0 && p.col < this.cols;
  }

  get(p: Position): Tile | null {
    if (!this.inBounds(p)) return null;
    return this.cells[p.row * this.cols + p.col] ?? null;
  }

  /** Igual a `get`, mas falha se a célula estiver vazia. */
  require(p: Position): Tile {
    const tile = this.get(p);
    if (!tile) throw new Error(`Board: célula vazia em (${p.row}, ${p.col})`);
    return tile;
  }

  set(p: Position, tile: Tile | null): void {
    if (!this.inBounds(p)) throw new Error(`Board: fora dos limites (${p.row}, ${p.col})`);
    this.cells[p.row * this.cols + p.col] = tile;
  }

  swap(a: Position, b: Position): void {
    const ta = this.get(a);
    this.set(a, this.get(b));
    this.set(b, ta);
  }

  clone(): Board {
    return new Board(this.rows, this.cols, this.cells);
  }

  /** Itera todas as posições (linha a linha). */
  *positions(): Generator<Position> {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) yield { row, col };
    }
  }

  /** Posição atual de uma peça pelo ID (O(n); usado em testes e validações). */
  findTile(id: TileId): Position | null {
    for (const p of this.positions()) {
      if (this.get(p)?.id === id) return p;
    }
    return null;
  }

  isFull(): boolean {
    return this.cells.every((c) => c !== null);
  }

  snapshot(): readonly (Tile | null)[] {
    return [...this.cells];
  }
}
