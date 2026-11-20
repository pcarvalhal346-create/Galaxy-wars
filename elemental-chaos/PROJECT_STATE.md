# ELEMENTAL CHAOS — Estado do projeto

> Consultar este ficheiro e `GAME_DESIGN.md` antes de qualquer alteração.

- **Versão:** 0.3.0
- **Fase atual:** Fases 2 e 3 ✅ concluídas; Fase 4 (áudio) ✅ e parte da Fase 5 (níveis 6–10, formas)
- **Próxima fase recomendada:** testar em telemóveis reais; Fase 5 (níveis 11–20, peças especiais, obstáculos)
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

### Versão 0.3.0 — tutorial, formas, áudio
- **Tabuleiros com forma e tamanho por nível** (5×5 a 9×9, com buracos); as peças caem através dos buracos.
- **Tutorial guiado** nos níveis 1–5 com a mascote **Lumi**: balão de texto, mão a demonstrar a jogada,
  escurecimento à volta do alvo, só a jogada indicada é aceite; pode ser saltado.
  As jogadas demonstradas são encontradas por simulação (funciona em qualquer tabuleiro).
- **Livro dos Elementos** (início, mapa, jogo, pausa): o que faz cada elemento e as reações.
- **10 níveis**: 1–5 tutoriais (6×6 → 8×8, seeds fixas), 6–10 com formas e dificuldade crescente.
- **Som e música** sintetizados (Web Audio): efeitos para todas as ações e música por tema;
  volumes de música e sons separados e guardados; desbloqueio no primeiro toque.
- **Ecrãs altos**: o espaço extra vai para o rodapé, onde a Lumi vive e festeja as jogadas especiais.

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
- Terra e Ar ainda são peças normais (os poderes estão previstos para mundos futuros, e o jogo di-lo).
- No iPhone o som não toca com o interruptor de silêncio ligado (comportamento do sistema).
- No Chromium headless (WebGL por software) o jogo corre a 5–9 FPS, o que torna as animações lentas
  nos testes automáticos; num dispositivo com GPU não foi medido.
- O mapa, o ecrã inicial e os cenários são recriados quando a janela muda de tamanho
  (a posição da rolagem do mapa volta ao nível atual).
- Os níveis 11–15 aparecem no mapa como "Em breve" (bloqueados).
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
    tutorial/   tutorial guiado (passos, objetivos, jogada demonstrada)
    ai/         bot greedy (equilíbrio / dicas futuras)
    session/    GameSession
  audio/       music.ts (composição procedural, puro), AudioEngine.ts (Web Audio)
  scenes/      Boot, Title, Map, Game, keys (transições)
  view/        BoardView, layout.ts, mapLayout.ts
  effects/     crystalArt, sceneryArt, uiArt, mascotArt (arte em Canvas), Effects (partículas, relâmpagos, textos)
  input/       gestures.ts (puro), BoardInput.ts
  ui/          Hud, Footer, Button/IconButton, Modal, PauseOverlay, LevelCard, ResultOverlay,
               TutorialOverlay, ElementBook, SettingsButtons, textures
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
`npm test` → **16 ficheiros, 108 testes, todos a passar**. `npm run typecheck` sem erros. `npm run build` OK.

Novos na 0.3.0: formas (buracos quebram sequências, gravidade através de buracos, refill nunca em buracos,
fuzz em 3 formas com todas as mecânicas), tutorial (jogada demonstrada cumpre o objetivo, progressão de
passos, cada nível de tutorial completa todos os passos), parser (formas, presets e passos inválidos),
equilíbrio dos 10 níveis (bot greedy ≥ 85%; os níveis 6–10 muito mais difíceis ao acaso do que os tutoriais),
música procedural (notas dentro da escala, determinística), layout em ecrãs altos e tabuleiros não 8×8.

Verificação no browser (Playwright, Chromium headless, ecrã de iPhone): tutoriais dos níveis 1–5 seguidos
com toques reais, jogada errada recusada durante o tutorial, todos os passos concluídos, níveis vencidos,
sem erros de consola e sem desalinhamento vista/lógica.

## Próximos passos
1. Testar num telemóvel real (Android e iPhone): FPS, som, tamanho das peças, tutorial.
2. Fase 5: peças especiais (combinações de 4/5), obstáculos, níveis 11–20, poderes de Terra e Ar.
3. Ajustar dificuldade com jogadores reais (o bot greedy é mais forte do que uma pessoa).
4. Fase 6: Capacitor (Android/iOS).
