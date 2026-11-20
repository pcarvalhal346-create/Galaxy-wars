# ELEMENTAL CHAOS — Estado do projeto

> Consultar este ficheiro e `GAME_DESIGN.md` antes de qualquer alteração.

- **Versão:** 0.2.0
- **Fase atual:** Fase 2 — Elemental Chaos ✅ concluída, com parte da Fase 3 (níveis, objetivos, progresso, ecrãs)
- **Próxima fase recomendada:** terminar a Fase 3 (tutorial guiado, níveis 6–20) e Fase 4 (áudio, polimento)
- **Última atualização:** 2026-11-20

## Funcionalidades concluídas

### Fase 1 — Fundação
- Phaser 4 + TypeScript estrito + Vite + Vitest; tabuleiro 8×8; 5 elementos com silhueta e símbolo próprios.
- Geração por seed sem matches iniciais e com jogada garantida; embaralhamento controlado.
- Troca por swipe, toque-toque e rato; trocas inválidas revertem; matches (incl. L/T/cruz); gravidade, refill, cascatas.
- Máquina de estados com input bloqueado fora de IDLE; layout adaptável; safe areas.

### Fase 2 — Reações elementais
- **Wet** (2 jogadas, contagem no fim da jogada, renovação), **Steam Burst** (3×3), **Lightning Chain** (BFS, máx. 8).
- Ordem de resolução determinística e documentada; limites de reações por passo/jogada.
- Efeitos: película de água a seguir as peças, nuvens de vapor + clarão + anel, relâmpagos em ziguezague
  a piscar, rótulos "VAPOR!"/"CORRENTE!", partículas por elemento, abanão de câmara.

### Parte da Fase 3 — Jogo completo
- Pontuação configurável, multiplicador de cascata, bónus de reações e de jogadas restantes.
- Feedback GOOD! / GREAT! / AMAZING! / ELEMENTAL CHAOS! (no máximo um por jogada).
- 5 níveis em `src/data/levels.json` com curva de aprendizagem; objetivos de pontos, recolha e reações.
- Jogadas limitadas, vitória/derrota, 1–3 estrelas, progresso guardado (desbloqueio + melhor resultado).
- Ecrãs: **arranque** com barra de progresso, **ecrã inicial** (logótipo, JOGAR, definições),
  **mapa de níveis** com caminho sinuoso e rolagem, **cartão do nível** (objetivos, jogadas, dica),
  **jogo**, **pausa** (continuar, reiniciar, mapa, efeitos reduzidos), **vitória** e **derrota**.
- Cristais a voar até ao objetivo no HUD; HUD com objetivos, jogadas, pontos e barra de estrelas.

### Visual
- Direção luminosa e colorida: cristais "gelatina" brilhantes, cenários de fantasia por tema
  (prado, lagoa, vulcão, tempestade), auroras, montanhas, nuvens, botões em pílula, painéis roxos.
- Tudo desenhado em código (Canvas) — sem assets externos, sem Internet; inspirado nas convenções
  do género Match-3, com identidade própria (sem personagens, logótipos ou arte de outros jogos).

## Em desenvolvimento
- Nada em curso.

## Bugs e limitações conhecidos
- **Não testado em telemóveis reais** — só em Chromium headless (WebGL por software) com emulação
  de telemóvel. 60 FPS não medidos.
- Sem som nem música (Fase 4); o painel de definições avisa disso.
- O tutorial é um texto no cartão do nível, não um tutorial guiado com mão a apontar.
- Em ecrãs muito altos sobra espaço vertical entre o HUD e o tabuleiro.
- O mapa, o ecrã inicial e os cenários são recriados quando a janela muda de tamanho
  (a posição da rolagem do mapa volta ao nível atual).
- Os níveis 6–10 aparecem no mapa como "Em breve" (bloqueados).
- `?seed=` no URL fixa o tabuleiro de todos os níveis (para depuração).

## Decisões de arquitetura
1. **A lógica resolve a jogada inteira; a apresentação só reproduz.** `resolveSwap` devolve passos com
   `matches`, `reactions`, `cleared` (com causa), `wetApplied`, `falls`, `spawns`, mais `wetTicks` e `shuffle`.
2. **IDs estáveis por peça**; o estado Wet vive na própria peça (objeto imutável recriado).
   Teste de "replay" garante que a vista e a lógica acabam iguais (também com reações).
3. **Reações sobre o estado do início do passo** → independentes da ordem de execução.
4. **`LevelRun` separado de `GameSession`**: tabuleiro vs. regras do nível (jogadas, objetivos, estrelas).
5. **Níveis em JSON validado** (`parseLevel`); adicionar níveis não exige mexer no motor.
6. **`GameSession.preview`** simula jogadas sem efeitos (RNG e IDs clonados) → bot de equilíbrio e futuras dicas.
7. `src/game`, `src/config/balance.ts` e `src/storage` **não importam Phaser** (verificado por teste).
8. Texturas geradas em Canvas no arranque; fundos de tema gerados quando são precisos e guardados em cache.
9. Pausa usa `tweens.pauseAll()` (no Phaser 4 congela o gestor inteiro) → painéis de pausa sem tweens.
10. Modais fixos ao ecrã com `pinToScreen` (também nos filhos) para o toque funcionar com a câmara rolada.

## Estrutura
```
src/
  main.ts, style.css
  config/      balance.ts (regras, pontuação, ritmos), theme.ts (cores, texturas), phaserConfig.ts
  data/        levels.json
  game/        LÓGICA PURA (sem Phaser)
    core/ board/ matching/ gravity/   (Fase 1)
    reactions/  Wet, Steam Burst, Lightning Chain
    resolution/ máquina de estados, resolução de jogadas
    scoring/    pontos e feedback
    levels/     tipos, parser, catálogo, LevelRun, simulador
    ai/         bot greedy (equilíbrio / dicas futuras)
    session/    GameSession
  scenes/      Boot, Title, Map, Game, keys (transições)
  view/        BoardView, layout.ts, mapLayout.ts
  effects/     crystalArt, sceneryArt, uiArt (arte em Canvas), Effects (partículas, relâmpagos, textos)
  input/       gestures.ts (puro), BoardInput.ts
  ui/          Hud, Footer, Button/IconButton, Modal, PauseOverlay, LevelCard, ResultOverlay, textures
  storage/     settings.ts, progress.ts
  tests/       Vitest
```

## Dependências
| Pacote | Versão | Uso |
|---|---|---|
| phaser | 4.2.1 | motor |
| typescript | 7.0.2 | tipos (dev) |
| vite | 8.3.8 | servidor/build (dev) |
| vitest | 5.1.1 | testes (dev) |

Sem dependências novas na Fase 2.

## Testes (última execução: 2026-11-20)
`npm test` → **13 ficheiros, 83 testes, todos a passar**. `npm run typecheck` sem erros. `npm run build` OK.

Novos na Fase 2: aplicação e expiração de Wet (incl. contagem no fim da jogada e peças frescas),
Wet desligado, Wet não aplicado a peças eliminadas, Steam Burst (área, bordas, desligado),
Lightning Chain (caminho e ligações determinísticos, peça isolada ignorada, limite 2 e limite 8),
vapor + raio simultâneos sobre a mesma peça sem remoções duplicadas, gatilho único por jogada,
limites por passo e por jogada, feedback, pontuação, LevelRun (recolha, reações, vitória, derrota,
estrelas, trocas inválidas), parser de níveis (10 casos de erro), preset, progresso (persistência,
desbloqueio, dados corrompidos), mapa, fuzz de 900 jogadas com todas as mecânicas + replay,
`preview` igual à jogada real, e equilíbrio de cada nível por simulação.

Verificação no browser (Playwright, Chromium headless, viewport de telemóvel): Início → Mapa →
cartão → nível 1 jogado com toques reais até à vitória (2★, progresso guardado); níveis 3, 4 e 5
jogados até ao fim com vapor, relâmpagos e película de água visíveis; mapa com progresso e rolagem
por arrasto; sem erros de consola e sem desalinhamento vista/lógica.

## Próximos passos
1. Testar num telemóvel real (Android e iPhone) e medir FPS.
2. Fase 4: áudio (efeitos e música com controlo separado, desbloqueio por gesto), mais polimento.
3. Fase 3/5: tutorial guiado (mão a apontar a jogada), níveis 6–20, peças especiais de 4/5.
4. Ajustar dificuldade com testes de jogadores reais (o bot greedy é mais forte do que uma pessoa).
