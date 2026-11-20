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

## 9. Mecânicas elementais — especificação para a Fase 2 (ainda não implementadas)

### Wet (Molhado)
- Um match de Água molha as peças **ortogonalmente adjacentes** ao grupo que sobrevivem à resolução.
- Dura **2 jogadas válidas** seguintes do jogador. A contagem desce no fim de cada jogada completa
  (depois de todas as cascatas); um Wet criado nessa jogada não perde duração nessa mesma jogada.
- Reaplicar Wet renova a duração. Se a peça for eliminada, o estado desaparece.

### Steam Burst (Vapor)
- Um grupo de Fogo adjacente a uma peça molhada dispara uma explosão **3×3** centrada nessa peça.
- Elimina peças normais na área; pode provocar cascatas.

### Lightning Chain (Corrente elétrica)
- Um grupo de Raio adjacente a uma peça molhada propaga eletricidade por peças molhadas
  ligadas ortogonalmente (busca determinística), **até 8 peças**. As atingidas são eliminadas.

### Segurança das reações
- Cada peça dispara no máximo uma reação de cada tipo por resolução.
- Reações geridas por fila de eventos; limite de reações simultâneas.
- Nada depende da ordem das animações: a lógica resolve primeiro, a apresentação só reproduz.

## 10. Pontuação, objetivos e níveis

Planeado para a Fase 3. Valores ficarão em `src/config/balance.ts`; níveis em dados externos.
