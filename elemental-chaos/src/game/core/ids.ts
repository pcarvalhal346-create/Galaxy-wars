import type { TileId } from './types';

/** Fonte de IDs únicos e crescentes para peças. Uma instância por sessão. */
export class IdSource {
  constructor(private nextId: TileId = 1) {}

  next(): TileId {
    return this.nextId++;
  }

  peek(): TileId {
    return this.nextId;
  }
}
