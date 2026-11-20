# Elemental Chaos

Puzzle Match-3 mobile com reações elementais. Phaser 4 + TypeScript + Vite.

- Regras: [`GAME_DESIGN.md`](GAME_DESIGN.md)
- Estado, decisões e próximos passos: [`PROJECT_STATE.md`](PROJECT_STATE.md)

## Comandos

```bash
npm install          # instalar dependências
npm run dev          # servidor de desenvolvimento (http://localhost:5173, também na rede local)
npm test             # testes da lógica (Vitest)
npm run typecheck    # verificar TypeScript
npm run build        # build de produção em dist/ (inclui typecheck)
npm run preview      # servir a build de produção
```

Para jogar no telemóvel durante o desenvolvimento, abre o endereço de rede que o `npm run dev`
mostra (mesma rede Wi-Fi).

`?seed=123` no URL fixa o tabuleiro (útil para reproduzir situações).

## Controlos

- Arrastar uma peça na direção da vizinha, **ou**
- tocar numa peça e depois numa adjacente.
- Botão ⏸ em baixo à esquerda: pausa, reiniciar, efeitos reduzidos.
