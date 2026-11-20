import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Phaser em chunk próprio: o código do jogo muda muito mais do que o motor.
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  server: { host: true },
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
  },
});
