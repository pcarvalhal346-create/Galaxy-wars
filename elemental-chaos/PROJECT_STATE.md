# ELEMENTAL CHAOS — Estado do projeto

> Consultar este ficheiro e `GAME_DESIGN.md` antes de qualquer alteração.

- **Versão:** 0.1.0
- **Fase atual:** Fase 1 — Fundação jogável ✅ concluída
- **Próxima fase:** Fase 2 — Elemental Chaos (Wet, Steam Burst, Lightning Chain)
- **Última atualização:** 2026-11-20

## Funcionalidades concluídas (Fase 1)

- Projeto Phaser 4 + TypeScript (estrito) + Vite + Vitest.
- Tabuleiro 8×8 com 5 elementos, cada um com silhueta e símbolo próprios.
- Geração por seed (`?seed=123` no URL), sem matches iniciais e com jogada garantida.
- Troca por arrasto (swipe), toque-toque e rato; trocas inválidas revertem com animação.
- Deteção de matches horizontais, verticais e cruzados (L/T/cruz fundidos num grupo).
- Remoção, gravidade, refill e cascatas até estabilizar (limite de segurança: 40).
- Embaralhamento controlado quando não há jogadas (mesmas peças; tabuleiro novo como último recurso).
- Máquina de estados IDLE → SWAPPING → MATCHING → (REACTING) → CLEARING → FALLING → REFILLING → CHECKING → IDLE
  (+ SHUFFLING); input bloqueado fora de IDLE.
- Animações: entrada do tabuleiro, antecipação na troca, pop + partículas por elemento,
  queda com aceleração e aterragem, embaralhamento, abanão de câmara em cascatas fortes.
- HUD (nível, objetivo, contador de jogadas), rodapé com pausa e espaços para boosters.
- Pausa: continuar, reiniciar, "efeitos reduzidos" (guardado em localStorage).
- Layout adaptável (modo `EXPAND`), tabuleiro sempre quadrado, safe areas via CSS `env()`.
- Texturas temporárias geradas em Canvas no arranque (sem assets externos).

## Em desenvolvimento

- Nada em curso.

## Bugs e limitações conhecidos

- **Não testado em telemóveis reais**: só em Chromium headless (WebGL por software) com emulação
  de iPhone 13, 360×800 e 1280×720. O objetivo de 60 FPS não foi medido.
- "Reiniciar" com `?seed=` no URL repete o mesmo tabuleiro (intencional para depuração).
- O HUD mostra "Nível 1 · Treino livre": ainda não há objetivos, limite de jogadas nem pontuação (Fase 3).
- Sem áudio (Fase 4). Sem menu principal / seleção de níveis (Fase 3).
- Em ecrãs muito altos sobra espaço vertical vazio entre HUD, tabuleiro e rodapé.
- O fundo é uma imagem de 540×960 esticada; em landscape fica menos detalhado.

## Decisões de arquitetura

1. **A lógica resolve a jogada inteira de uma vez, a apresentação só reproduz.**
   `resolveSwap` devolve um `TurnResult` com passos (`matches`, `cleared`, `falls`, `spawns`) e
   eventual `shuffle`. A `GameScene` anima esses passos e avança a máquina de estados.
   Assim o resultado nunca depende da ordem/tempo das animações e tudo é testável sem browser.
2. **IDs estáveis por peça.** A vista mapeia `TileId → sprite`; não há peças duplicadas nem perdidas.
   Um teste de "replay" verifica que reproduzir os eventos dá exatamente o tabuleiro lógico final.
3. **`src/game`, `src/config/balance.ts` e `src/storage` não importam Phaser** (verificado por teste).
4. **RNG próprio (mulberry32) por sessão** → partidas e testes reproduzíveis.
5. **Valores de jogo e ritmos em `src/config/balance.ts`**; cores e chaves de textura em `src/config/theme.ts`.
6. **Pool de sprites e um emissor de partículas por elemento** criados uma vez (sem lixo por match).
7. **Escala `EXPAND` com resolução de referência 1080×1920**; o layout é uma função pura (`computeLayout`).
8. **Pausa** usa `tweens.pauseAll()` + `time.paused`: no Phaser 4 `pauseAll` congela o gestor inteiro,
   por isso o painel de pausa aparece sem tween.
9. **Ponto de extensão da Fase 2:** campo de estado em `Tile` (ex.: `wet`), fase `REACTING` já
   prevista na máquina de estados e lugar marcado em `resolveCascades` e `GameScene.playTurn`.

## Estrutura

```
src/
  main.ts                 arranque
  style.css               contentor + safe areas
  config/                 balance.ts (regras/ritmos), theme.ts (visual), phaserConfig.ts
  game/                   LÓGICA PURA (sem Phaser)
    core/                 tipos, posições, RNG, IDs
    board/                Board, gerador, embaralhamento, invariantes
    matching/             matches e jogadas válidas
    gravity/              gravidade e refill
    resolution/           máquina de estados e resolução de jogadas/cascatas
    session/              GameSession (porta de entrada da apresentação)
  scenes/                 BootScene (texturas + progresso), GameScene
  view/                   BoardView (sprites/animações), layout.ts (puro)
  effects/                crystalArt.ts (arte em Canvas), Effects.ts (partículas, abanão)
  input/                  gestures.ts (puro), BoardInput.ts (Phaser)
  ui/                     Hud, Footer, PauseOverlay, Button
  storage/                settings.ts (localStorage tolerante a falhas)
  utils/                  tweens como Promises, cores
  tests/                  testes Vitest
```

## Dependências

| Pacote | Versão | Uso |
|---|---|---|
| phaser | 4.2.1 | motor (runtime) |
| typescript | 7.0.2 | verificação de tipos (dev) |
| vite | 8.3.8 | servidor e build (dev) |
| vitest | 5.1.1 | testes (dev) |

Requer Node 20.19+ ou 22.12+ (testado com Node 22).

## Testes (última execução: 2026-11-20)

`npm test` → **10 ficheiros, 45 testes, todos a passar.** `npm run typecheck` → sem erros.
`npm run build` → build de produção OK (jogo ~36 KB, Phaser ~1,37 MB / 357 KB gzip).

Cobertos: matches horizontais/verticais/cruzados, trocas válidas/inválidas/não adjacentes,
gravidade e refill, cascata determinística, limite de cascatas, jogadas válidas, tabuleiro sem jogadas,
tabuleiro inicial (200 seeds), reprodutibilidade por seed, embaralhamento e regeneração,
máquina de estados, sessão (jogadas consumidas só em trocas válidas), fuzz de 1000 jogadas com
verificação de invariantes e replay, layout em 5 proporções, gestos, persistência de preferências,
isolamento da lógica em relação ao Phaser.

Verificação manual automatizada no browser (Playwright, Chromium headless): arranque sem erros,
14 jogadas por swipe e toque-toque, troca inválida sem consumo de jogada, input ignorado durante
animações, pausa/continuar/reiniciar, preferência guardada, resize retrato↔paisagem sem
desalinhamento entre sprites e lógica.

Ainda não cobertos (fases seguintes): Wet, Steam Burst, Lightning Chain, reações simultâneas,
vitória/derrota, progresso de níveis.

## Próximos passos

1. **Fase 2:** estado Wet em `Tile` + contagem por jogada; fila de reações; Steam Burst; Lightning Chain;
   efeitos visuais (vapor, relâmpagos); testes de reações simultâneas e limites.
2. Testar num telemóvel real (Android e iPhone) e medir FPS.
3. Fase 3: objetivos, jogadas limitadas, pontuação, 5 níveis em dados, vitória/derrota, menus, progresso.
