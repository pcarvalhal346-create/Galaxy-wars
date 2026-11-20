# ELEMENTAL CHAOS — Regras oficiais do jogo

> Documento de referência das regras. Qualquer mecânica nova tem de ser descrita aqui
> **antes** de ser implementada, incluindo como interage com as existentes.
> Estado de implementação: ver `PROJECT_STATE.md`.

## 1. Conceito

Puzzle Match-3 em que os elementos mágicos deixam efeitos temporários no tabuleiro.
Algumas jogadas preparam reações que só disparam mais tarde
("molho estas peças agora, depois faço um combo elétrico e destruo meio tabuleiro").

## 2. Tabuleiro

- Grelha lógica de **8 colunas × 8 linhas**. A linha 0 é o topo; a gravidade puxa para baixo.
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

## 10. Pontuação

Valores em `SCORING` (`src/config/balance.ts`):
- 20 pontos por peça num match; bónus de forma: linha de 4 +60, cruz/L/T +100, 5+ +150.
- Reações: vapor +120; corrente +80 e +25 por peça atingida; +20 por peça destruída só por reação.
- Cascatas: o passo *n* vale × (1 + 0,5·*n*).
- Vitória: +80 por cada jogada que sobrar.

Feedback (no máximo uma mensagem por jogada):
**ELEMENTAL CHAOS!** (vapor + raio na mesma jogada, ou 3+ reações) › **AMAZING!** (4+ passos ou
corrente de 5+) › **GREAT!** (3 passos ou qualquer reação) › **GOOD!** (2 passos, linha de 5 ou cruz).

## 11. Níveis e objetivos

- Definidos em `src/data/levels.json`, validados por `parseLevel` ao arrancar (erros explícitos).
- Campos: `id`, `name`, `tutorial`, `theme`, `moves`, `elements`, `mechanics`, `objectives`,
  `stars` (3 limites crescentes), `seed` e `preset` opcionais.
- Objetivos: `score`, `collect` (elemento), `reactions` (`steam`, `lightning` ou `any`).
- **Vitória:** todos os objetivos cumpridos (verificado no fim de cada jogada). **Derrota:** jogadas a zero.
- Estrelas: vencer dá pelo menos 1; 2 e 3 pelos limites de pontuação.
- Progresso: vencer desbloqueia o nível seguinte e guarda a melhor pontuação/estrelas.

| Nível | Nome | Ensina | Objetivos | Jogadas |
|---|---|---|---|---|
| 1 | Despertar dos Cristais | trocas e matches | 2000 pontos | 15 |
| 2 | Colheita Elemental | jogadas limitadas, recolha | 22 Terra + 22 Ar | 18 |
| 3 | Maré Mágica | Wet | 32 Água + 3000 pontos | 20 |
| 4 | Vapor Ardente | Steam Burst | 10 explosões de vapor | 20 |
| 5 | Tempestade Elétrica | Lightning Chain | 5 correntes + 4 vapores | 22 |

Equilíbrio verificado por simulação (`src/game/levels/simulate.ts`): um bot greedy com 1 jogada de
antecipação vence ≥ 90%; jogadas aleatórias vencem cada vez menos do nível 1 (≈93%) ao 5 (≈15%).
