import { describe, expect, it } from 'vitest';

// Vite/Vitest carregam o texto dos ficheiros sem dependências de Node.
const logicSources = import.meta.glob(['../game/**/*.ts', '../config/balance.ts', '../storage/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('arquitetura', () => {
  it('a lógica de jogo, configuração e persistência não dependem do Phaser', () => {
    const files = Object.keys(logicSources);
    expect(files.length).toBeGreaterThan(5);
    for (const [file, src] of Object.entries(logicSources)) {
      expect(src, file).not.toMatch(/from\s+['"]phaser['"]/);
    }
  });
});
