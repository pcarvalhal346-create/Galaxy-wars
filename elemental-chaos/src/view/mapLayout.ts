/**
 * Posições dos níveis no mapa (puro, sem Phaser). Caminho sinuoso de baixo para cima:
 * o nível 1 fica em baixo, como uma viagem a subir pelo mundo.
 */
export interface MapNode {
  readonly level: number;
  readonly x: number;
  readonly y: number;
}

export interface MapGeometry {
  readonly nodes: readonly MapNode[];
  /** Altura total do mundo (para limitar a rolagem). */
  readonly height: number;
  readonly spacing: number;
}

export function computeMapGeometry(count: number, width: number, viewHeight: number, scale: number): MapGeometry {
  const spacing = 250 * scale;
  const top = 360 * scale; // espaço para o título do mundo
  const bottom = 340 * scale;
  const height = Math.max(viewHeight, top + bottom + spacing * (count - 1));
  const amplitude = Math.min(width * 0.28, 300 * scale);
  const nodes: MapNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      level: i + 1,
      x: width / 2 + Math.sin(i * 1.15) * amplitude,
      y: height - bottom - i * spacing,
    });
  }
  return { nodes, height, spacing };
}
