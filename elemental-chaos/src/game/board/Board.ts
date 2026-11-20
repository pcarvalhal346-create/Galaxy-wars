import type { Position, Tile, TileId } from '../core/types';

/**
 * Grelha lógica do tabuleiro. Guarda peças (ou `null` em células vazias durante a resolução).
 * Linha 0 é o topo; a gravidade puxa as peças para linhas maiores.
 *
 * Forma: cada célula é jogável ou um "buraco" (fora do tabuleiro). Os buracos nunca têm peças,
 * quebram sequências de matches e são atravessados pelas peças que caem.
 */
export class Board {
  private readonly cells: (Tile | null)[];
  private readonly playable: readonly boolean[];
  /** Camadas de gelo por célula (obstáculo que fica na célula, não na peça). */
  private readonly ice: number[];

  constructor(
    readonly rows: number,
    readonly cols: number,
    cells?: readonly (Tile | null)[],
    /** true = célula jogável. Por omissão todas são jogáveis. */
    playable?: readonly boolean[],
    ice?: readonly number[],
  ) {
    if (rows <= 0 || cols <= 0) throw new Error('Board: dimensões inválidas');
    if (cells && cells.length !== rows * cols) throw new Error('Board: número de células inválido');
    if (playable && playable.length !== rows * cols) throw new Error('Board: máscara inválida');
    this.cells = cells ? [...cells] : new Array<Tile | null>(rows * cols).fill(null);
    this.playable = playable ? [...playable] : new Array<boolean>(rows * cols).fill(true);
    this.ice = ice ? [...ice] : new Array<number>(rows * cols).fill(0);
  }

  getIce(p: Position): number {
    return this.inBounds(p) ? (this.ice[p.row * this.cols + p.col] ?? 0) : 0;
  }

  setIce(p: Position, layers: number): void {
    if (!this.isPlayable(p)) throw new Error(`Board: gelo fora do tabuleiro (${p.row}, ${p.col})`);
    this.ice[p.row * this.cols + p.col] = Math.max(0, Math.floor(layers));
  }

  /** Total de células ainda com gelo. */
  get icedCells(): number {
    return this.ice.filter((n) => n > 0).length;
  }

  /** Cria um tabuleiro com uma forma descrita por linhas: `#` = buraco, outro carácter = jogável. */
  static fromShape(shape: readonly string[]): Board {
    const rows = shape.length;
    const cols = shape[0]?.length ?? 0;
    const mask: boolean[] = [];
    for (const line of shape) {
      if (line.length !== cols) throw new Error('Board.fromShape: linhas com larguras diferentes');
      for (const ch of line) mask.push(ch !== '#');
    }
    return new Board(rows, cols, undefined, mask);
  }

  inBounds(p: Position): boolean {
    return p.row >= 0 && p.row < this.rows && p.col >= 0 && p.col < this.cols;
  }

  /** Dentro da grelha e não é buraco. */
  isPlayable(p: Position): boolean {
    return this.inBounds(p) && this.playable[p.row * this.cols + p.col] === true;
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
    if (tile && !this.isPlayable(p)) throw new Error(`Board: (${p.row}, ${p.col}) é um buraco`);
    this.cells[p.row * this.cols + p.col] = tile;
  }

  swap(a: Position, b: Position): void {
    const ta = this.get(a);
    this.set(a, this.get(b));
    this.set(b, ta);
  }

  clone(): Board {
    return new Board(this.rows, this.cols, this.cells, this.playable, this.ice);
  }

  /** Tabuleiro vazio com a mesma forma (e o mesmo gelo). */
  emptyLike(): Board {
    return new Board(this.rows, this.cols, undefined, this.playable, this.ice);
  }

  /** Itera as posições JOGÁVEIS (linha a linha). */
  *positions(): Generator<Position> {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.playable[row * this.cols + col]) yield { row, col };
      }
    }
  }

  /** Linhas jogáveis de uma coluna, de cima para baixo. */
  playableRows(col: number): number[] {
    const out: number[] = [];
    for (let row = 0; row < this.rows; row++) if (this.playable[row * this.cols + col]) out.push(row);
    return out;
  }

  get playableCount(): number {
    return this.playable.filter(Boolean).length;
  }

  /** Posição atual de uma peça pelo ID (O(n); usado em testes e validações). */
  findTile(id: TileId): Position | null {
    for (const p of this.positions()) {
      if (this.get(p)?.id === id) return p;
    }
    return null;
  }

  isFull(): boolean {
    for (const p of this.positions()) if (!this.get(p)) return false;
    return true;
  }

  snapshot(): readonly (Tile | null)[] {
    return [...this.cells];
  }
}
