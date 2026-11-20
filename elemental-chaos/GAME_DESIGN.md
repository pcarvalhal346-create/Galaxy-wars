# ELEMENTAL CHAOS — Regras oficiais do jogo

> Documento de referência das regras. Qualquer mecânica nova tem de ser descrita aqui
> **antes** de ser implementada, incluindo como interage com as existentes.
> Estado de implementação: ver `PROJECT_STATE.md`.

## 1. Conceito

Puzzle Match-3 em que os elementos mágicos deixam efeitos temporários no tabuleiro.
Algumas jogadas preparam reações que só disparam mais tarde
("molho estas peças agora, depois faço um combo elétrico e destruo meio tabuleiro").

## 2. Tabuleiro

- Grelha lógica com **forma definida por nível** (`shape`): de 5×5 a 9×9, com **buracos** (`#`).
  Os tutoriais começam pequenos (6×6, 7×7); os níveis seguintes usam formas (rio, losango, ponte, poço).
- A linha 0 é o topo; a gravidade puxa para baixo e **as peças caem através dos buracos**.
- Buracos nunca têm peças, quebram sequências e não podem ser trocados.
- Cada célula contém exatamente uma peça quando o tabuleiro está estável.
- Cada peça tem um **ID único e estável** durante a partida. Peças novas recebem IDs nunca usados.

## 3. Elementos

| Elemento | Cor | Silhueta | Símbolo | Papel (planeado) | Fase 1 |
|---|---|---|---|---|---|
| Fogo | laranja/vermelho | chama | chama interior | ofensivo; com peças molhadas gera **Steam Burst** | peça normal |
| Água | azul-ciano | orbe | gota | preparação; molha peças vizinhas (**Wet**) | peça normal |
| Raio | amarelo-violeta | losango | relâmpago | propagação por peças molhadas (**Lightning Chain**) | peça normal |
| Terra | verde-esmeralda | hexágono | folha | estável; obstáculos, raízes, cristais (futuro) | peça normal |
| Ar | turquesa-claro | quadrado arredondado | rajadas de vento | mobilidade; redemoinhos (futuro) | peça normal |

Cada elemento é reconhecível sem cor (silhueta + símbolo).

## 4. Jogada

1. O jogador troca duas peças **ortogonalmente adjacentes** (arrastar, ou tocar numa e depois na vizinha).
2. A troca é **válida** só se criar pelo menos um match. Caso contrário, as peças regressam
   à posição original com animação e **não se consome jogada**.
3. Uma troca válida consome **1 jogada**. Cascatas automáticas **não** consomem jogadas.
4. O input fica bloqueado do início da troca até o tabuleiro estabilizar.

## 5. Matches

- Match = 3 ou mais peças iguais seguidas, na horizontal ou na vertical.
- Runs do mesmo elemento que partilham células (formas L, T, cruz) formam **um só grupo**.
- Classificação do grupo: `line3`, `line4`, `line5plus`, `cross`
  (usada mais tarde para pontuação e peças especiais).
- Uma peça presente em vários grupos é removida **uma única vez**.

## 6. Ordem de resolução (prioridades)

Por cada passo de cascata, por esta ordem:

1. **MATCHING** — encontrar todos os grupos no tabuleiro atual.
2. **REACTING** — *(Fase 2)* aplicar estados elementais e reações, a partir de uma fila determinística.
3. **CLEARING** — remover a união de todas as células afetadas (sem duplicados).
4. **FALLING** — gravidade, coluna a coluna, preservando a ordem relativa.
5. **REFILLING** — peças novas entram pelo topo de cada coluna.
6. **CHECKING** — novos matches → voltar a 1 (cascata). Sem matches → fim.

No fim da jogada, se não existir nenhuma jogada válida, faz-se um **embaralhamento controlado**
(ver §8).

Limite de segurança: **40 cascatas** por jogada (`RESOLUTION_LIMITS.maxCascades`).

Máquina de estados:

```
IDLE → SWAPPING → MATCHING → (REACTING) → CLEARING → FALLING → REFILLING → CHECKING
                                                                   │  ├─→ MATCHING (cascata)
SWAPPING → IDLE (troca inválida)                                   │  ├─→ SHUFFLING → IDLE
                                                                   └──┴─→ IDLE
```

## 7. Geração do tabuleiro

- Aleatória mas **reproduzível por seed**.
- Nunca começa com matches.
- Tem sempre pelo menos uma jogada válida.

## 8. Embaralhamento

- Acontece quando o tabuleiro estável não tem jogadas válidas.
- Reorganiza **as mesmas peças** (mesmos IDs) até não haver matches e existir pelo menos uma jogada.
- Ao fim de 100 tentativas falhadas, gera um tabuleiro novo (último recurso).

## 9. Mecânicas elementais (implementadas na Fase 2)

Ativas por nível (`mechanics` em `src/data/levels.json`). Sem Wet não há reações.

### Ordem dentro de um passo de cascata
1. **MATCHING** — encontrar os grupos.
2. **REACTING** — as reações usam o estado Wet que existia **no início do passo**.
3. **CLEARING** — remove a união de matches + áreas de vapor + peças eletrocutadas (cada célula uma vez).
   Causa registada por prioridade: match > vapor > raio.
4. **Wet** — matches de Água molham os vizinhos **que sobreviveram** a este passo.
5. **FALLING / REFILLING** — o estado Wet viaja com a peça; peças novas entram secas.

Consequência: Água e Fogo no mesmo passo **não** reagem entre si; o Wet novo só pode reagir
em cascatas seguintes ou em jogadas futuras. Isto torna o resultado independente da ordem.

### Wet (Molhado)
- Match de Água → peças ortogonalmente adjacentes ao grupo (fora dele) ficam molhadas por **2 jogadas**.
- A contagem desce **no fim de cada jogada válida**, depois de todas as cascatas. Uma peça molhada
  (ou renovada) nessa jogada não perde duração nessa mesma jogada.
- Reaplicar renova para 2. Se a peça for eliminada, o estado desaparece. Trocas inválidas não contam.
- Visual: película de água com aro azul e gotas; fica mais ténue na última jogada.

### Steam Burst (Vapor)
- Para cada peça molhada adjacente (fora do grupo) a um grupo de **Fogo**: explosão **3×3** centrada nela
  (cortada nas bordas). Elimina todas as peças da área. Pode provocar cascatas.

### Lightning Chain (Corrente elétrica)
- Um grupo de **Raio** com peças molhadas adjacentes dispara **uma** corrente: busca em largura
  determinística (ordem linha/coluna) pelas peças molhadas ligadas ortogonalmente, **até 8 peças**.
- As peças atingidas são eliminadas; as ligações são desenhadas como relâmpagos.

### Segurança
- Cada peça dispara no máximo uma reação de cada tipo por jogada (`tipo:id`).
- Máximo de **8 reações por passo** e **24 por jogada**; máximo de **40 cascatas** por jogada.
- Valores em `ELEMENTAL_RULES` (`src/config/balance.ts`).

## 9b. Cristais especiais

Criados quando uma combinação é maior do que 3 (um por grupo). A peça escolhida não desaparece:
transforma-se. Fica na célula da troca (se fizer parte do grupo), senão no cruzamento (L/T) ou no meio.

| Combinação | Especial | Ativação |
|---|---|---|
| 4 em linha | **Cristal Lança** (horizontal ou vertical, conforme a linha) | Limpa a linha ou a coluna inteira |
| L, T ou cruz | **Núcleo Elemental** | Explode em losango de raio 2 |
| 5+ em linha | **Orbe do Caos** (sem elemento; nunca combina) | Trocado com um cristal: destrói todos desse elemento |

- Um especial ativa-se quando é eliminado por qualquer causa (match, reação ou outro especial).
  Ativações em cadeia: cada especial ativa uma só vez por passo (máximo 30 por passo).
- Troca de dois especiais: ativam os dois. Orbe + qualquer cristal: destrói esse elemento.
  Orbe + Orbe: limpa o tabuleiro todo. Um Orbe destruído indiretamente ataca o elemento mais comum.
- Trocas com o Orbe ou entre dois especiais são sempre válidas (mesmo sem formar linha).
- Os especiais mantêm o elemento (exceto o Orbe), podem ficar molhados e contam para objetivos de recolha.
- As explosões de especiais não disparam reações elementais (só matches as disparam).
- Ordem num passo: matches → reações → criação de especiais → ativações em cadeia → remoção → Wet.

## 9c. Animações por elemento

- **Fogo:** fica laranja, estica-se e sobe como uma chama; partículas de chama a subir.
- **Água:** espalma-se e escorre; gotas que saltam e caem.
- **Raio:** treme e pisca; faíscas rápidas.
- **Terra:** treme, cresce e parte-se; lascas de pedra a rodar e a cair.
- **Ar:** gira e é levado pelo vento; redemoinhos a espalhar.
- **Vapor (reação):** as peças ficam brancas, incham, sobem e evaporam em fumo.
- **Corrente (reação):** as peças piscam e tremem (choque), ficam queimadas e rebentam em faíscas.
- **Especiais:** Lança dispara um raio de luz pela linha; Núcleo faz uma onda de choque;
  Orbe lança raios multicolores até cada alvo. Ao nascer, as peças do grupo juntam-se no especial.

## 10. Pontuação

Valores em `SCORING` (`src/config/balance.ts`):
- 20 pontos por peça num match; bónus de forma: linha de 4 +60, cruz/L/T +100, 5+ +150.
- Reações: vapor +120; corrente +80 e +25 por peça atingida; +20 por peça destruída só por reação.
- Especiais: criar Lança +60, Núcleo +90, Orbe +150; ativar Lança +100, Núcleo +140, Orbe +220;
  +25 por peça destruída por especiais.
- Cascatas: o passo *n* vale × (1 + 0,5·*n*).
- Vitória: +80 por cada jogada que sobrar.

Feedback (no máximo uma mensagem por jogada):
**ELEMENTAL CHAOS!** (vapor + raio na mesma jogada, 3+ reações, ou Orbe com 3+ ativações) ›
**AMAZING!** (4+ passos, corrente de 5+, Orbe ou 2+ ativações) › **GREAT!** (3 passos, reação ou ativação) ›
**GOOD!** (2 passos, linha de 5 ou cruz).

## 11. Níveis e objetivos

- Definidos em `src/data/levels.json`, validados por `parseLevel` ao arrancar (erros explícitos).
- Campos: `id`, `name`, `theme`, `seed` (opcional), `moves`, `shape`, `elements`, `mechanics`,
  `objectives`, `stars` (3 limites crescentes), `tutorial` (dica curta), `guide` (tutorial guiado), `preset`.
- Objetivos: `score`, `collect` (elemento), `reactions` (`steam`, `lightning` ou `any`).
- **Vitória:** todos os objetivos cumpridos (verificado no fim de cada jogada). **Derrota:** jogadas a zero.
- Estrelas: vencer dá pelo menos 1; 2 e 3 pelos limites de pontuação. Bónus de 80 por jogada que sobra.
- Progresso: vencer desbloqueia o nível seguinte e guarda a melhor pontuação/estrelas.

| Nível | Nome | Tabuleiro | Ensina / desafio | Objetivos | Jogadas |
|---|---|---|---|---|---|
| 1 | Despertar dos Cristais | 6×6 | trocas, cascatas, linhas de 4 | 1200 pontos | 14 |
| 2 | Os Cinco Elementos | 7×7 | os elementos, objetivos, jogadas | 15 Terra + 15 Ar | 16 |
| 3 | Maré Mágica | 7×7 | Molhado | 24 Água + 2500 pontos | 18 |
| 4 | Vapor Ardente | 8×8 sem cantos | Explosão de Vapor | 8 vapores | 18 |
| 5 | Tempestade Elétrica | 8×8 octógono | Corrente Elétrica | 4 correntes + 3 vapores | 20 |
| 6 | Ilhas Gémeas | rio no meio | — | 30 Fogo + 5 vapores | 20 |
| 7 | Coração de Cristal | 9×9 losango | — | 11 000 pontos | 18 |
| 8 | Ponte Elétrica | duas plataformas | — | 4 correntes + 20 Água | 24 |
| 9 | Anel de Vapor | poço central | — | 9 vapores + 4 correntes | 20 |
| 10 | Caos Elemental | 9×9 | tudo junto | 8 vapores + 6 correntes + 35 Água | 22 |

Equilíbrio verificado por simulação (`src/game/levels/simulate.ts`, que segue o tutorial):
o bot greedy vence ≥ 85% de cada nível; jogadas aleatórias vencem a maioria dos tutoriais (1–5)
e muito menos nos níveis 6–10.

## 12. Tutorial guiado (níveis 1–5)

- Apresentado pela **Lumi**, a mascote (espírito de cristal original).
- Cada passo (`guide`) tem um texto e um objetivo: `none` (só mensagem, botão Continuar),
  `match`, `match4`, `wet`, `steam`, `lightning` ou `collect:<elemento>`.
- Para passos com objetivo, o jogo **simula todas as jogadas válidas** e escolhe uma que cumpre o
  objetivo; a mão mostra-a, o resto do ecrã escurece e **só essa troca é aceite**.
  Se o tabuleiro não tiver nenhuma, o jogador joga livremente até o objetivo acontecer.
- Os tutoriais usam `seed` fixa; um teste garante que todos os passos têm sempre jogada disponível.
- Aparece apenas enquanto o nível não foi vencido; pode ser saltado.
- O **Livro dos Elementos** (ícone de livro no início, mapa, jogo e pausa) explica cada elemento e as reações.

## 12b. Lumi, a mascote

- Original do jogo: espírito de cristal com uma coroa de lascas dos cinco elementos.
- Expressões: contente, "uau" e triste.
- Ecrã inicial: em grande, com balão de fala; tocar nela muda a frase.
- Jogo: vive no rodapé e festeja reações, especiais e elogios; fica triste na derrota.
- Vitória: sorri e diz "Bom trabalho!". Derrota: fica triste e diz "Tenta novamente!".
- Mapa: marca o nível atual. Tutorial: é ela quem explica.

## 13. Áudio

- Sintetizado com Web Audio (sem ficheiros): efeitos para toque, seleção, troca, troca inválida,
  combinação (sobe de tom em cada cascata), água, vapor, raio, baralhar, estrelas, elogio, vitória e derrota.
- Música procedural por tema (menu, prado, lagoa, vulcão, tempestade) com tonalidade e andamento próprios.
- Volumes separados de música e sons (0 / 30 / 60 / 100%), guardados. Só começa após o primeiro toque
  (regra do iOS/Safari); suspende quando a app fica em segundo plano.
