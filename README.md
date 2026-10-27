# Galáxia Clássica Offline — PWA para iPhone

**Protótipo jogável de estratégia espacial original**, inspirado nos jogos clássicos de navegador. Uma alternativa offline simplificada ao XGProyect-FMJ, **não** uma conversão do seu motor PHP/Laravel.

## Funcionalidades implementadas

- Um planeta inicial; metal, cristal, deutério e balanço energético.
- 8 edifícios com custos progressivos, fila de construção e tempos de espera.
- 6 tecnologias, pesquisa e respetiva fila.
- 6 tipos de naves, 2 defesas e produção no hangar.
- Galáxia com **20 bots**, com estratégias económicas e militares diferentes.
- Espionagem, ataques, combate automático simplificado, saque e regresso de frotas.
- Relatórios de atividade, combates e espionagem.
- Simulação do tempo decorrido quando a aplicação é reaberta; inclui um botão de teste para avançar uma hora.
- Gravação automática local em IndexedDB, com recurso a localStorage; exportação e importação de uma cópia de segurança em JSON.
- PWA com ícones, manifesto e Service Worker que guarda os ficheiros estáticos para jogar sem rede após a instalação.

**Limites deliberados:** combate e IA simplificados, um único planeta humano, sem alianças, colonização, luas, mercados nem multiplayer. As fórmulas são uma aproximação criada para este protótipo; não são cópia exata do OGame ou do XGProyect-FMJ.

## Instalar só com iPhone, sem VPS

É necessário **internet uma única vez para publicar e abrir o jogo**. Depois de o Safari instalar e armazenar os ficheiros, a jogabilidade é local; não existe backend e não precisas de um servidor permanente.

1. No iPhone, guarda e descomprime `galaxia-classica-offline.zip` na app **Ficheiros**.
2. Abre [github.com/new](https://github.com/new), cria um repositório **público** como `galaxia-offline`, com a tua conta GitHub. Não coloques informação pessoal no projeto.
3. No repositório, seleciona **Add file → Upload files** e envia para a raiz os ficheiros e a pasta `icons/` (não envies apenas o ZIP; o GitHub Pages precisa dos ficheiros extraídos). Se a interface móvel não permitir enviar uma pasta, podes criar a pasta `icons` no repositório e carregar lá os dois PNG. Usa **Solicitar site para computador** no Safari se necessário.
4. Em **Settings → Pages**, na secção **Build and deployment**, define **Deploy from a branch** e escolhe `main` / `(root)`. Guarda.
5. Quando estiver publicado, visita `https://TEU_UTILIZADOR.github.io/galaxia-offline/` no Safari.
6. Abre **Partilhar → Adicionar ao ecrã principal → Abrir como aplicação → Adicionar**.
7. Abre a nova aplicação e confirma que o universo funciona em **modo avião** (depois de pelo menos um carregamento online completo).

> O GitHub Pages é uma hospedagem de ficheiros estáticos, não um servidor de jogo. O código-fonte do repositório público pode ser visto por outras pessoas, **mas o progresso do jogo é guardado no dispositivo**, não no repositório. O GitHub Pages pode sofrer interrupções ou alterações nas condições do serviço. Precisas da URL HTTPS inicial para instalar a PWA.

## Experimentar num computador (opcional)

A partir da pasta do projeto, inicia um servidor estático local:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000` no navegador. Não abras diretamente `index.html` a partir da app Ficheiros, pois os módulos JavaScript e o Service Worker requerem um contexto web adequado.

## Testes automatizados

O motor não tem dependências JavaScript. Se tiveres Node.js 20+:

```bash
node --test test.mjs
```

## Como funciona a simulação offline

Quando fechas o jogo, o navegador pode suspender a aplicação. Na próxima abertura, `advance()` calcula a produção, conclui as filas, processa frotas e executa turnos dos bots nos tempos devidos. **Os bots não executam código em segundo plano com o iPhone bloqueado.** As ações são simuladas quando reabres a PWA.

A velocidade de economia e de construção está ajustada para o protótipo, não para o equilíbrio competitivo clássico. O botão **Opções → Simular +1 hora** serve para testar.

## Proteção de dados e cópias de segurança

O estado fica em IndexedDB do navegador ou, se necessário, no localStorage. A instalação separada no ecrã principal pode usar um armazenamento próprio no iOS. Remover o ícone, limpar dados de navegação ou uma intervenção do sistema podem apagar os dados.

Usa **Opções → Exportar progresso** e guarda o JSON em **Ficheiros/iCloud Drive**. Depois podes usar **Importar progresso** no mesmo ou noutro dispositivo.

## Ficheiros

- `index.html` — estrutura da aplicação.
- `styles.css` — interface mobile-first em estilo espacial clássico.
- `engine.mjs` — motor local: economia, tempo, frotas, batalhas e IA.
- `app.js` — interface, ações e gravação.
- `sw.js` — cache de recursos estáticos para funcionamento offline.
- `manifest.webmanifest` — configuração de instalação PWA.
- `icons/` — ícones do ecrã principal.
- `test.mjs` — testes automáticos do motor.

## Licenciamento

Este protótipo contém código e ícones originais e independentes do XGProyect-FMJ. Não inclui elementos gráficos nem código dos projetos OGame ou XGProyect.

## Desenvolvimento e verificação desta revisão

O ZIP fornecido foi integrado neste repositório, que inicialmente só continha um README. As funcionalidades do protótipo foram mantidas. Não há dependências de produção nem processo de compilação.

- `node --test test.mjs`: testes do motor e da persistência. Incluem comparação entre 48 horas simuladas de uma vez e em passos de um minuto, conclusão de edifícios/pesquisa/hangar, frotas, bots, relógio recuado, importações inválidas e recuperação entre IndexedDB e localStorage.
- A produção usa o nível antigo da mina até ao instante de conclusão; os recursos trazidos por frotas acima da capacidade não são apagados pela produção seguinte.
- A gravação espelha o estado imediatamente em localStorage e escreve também em IndexedDB. Na abertura escolhe a cópia válida mais recente; uma falha nos dois meios é apresentada na interface. Os saves antigos, sem envelope de gravação, continuam legíveis.
- O cache do Service Worker é isolado pelo caminho do projeto. Todos os recursos, incluindo `storage.mjs`, são locais e relativos. A indicação de disponibilidade offline aparece após a instalação do cache.
- Controlos de toque com pelo menos 44 px, campos numéricos de 16 px, margens para as áreas seguras do iPhone, diálogo com foco protegido e galáxia adaptada a ecrãs estreitos. A atualização periódica não recria um formulário enquanto estiver a ser editado.

### Teste funcional opcional no navegador

Requer Playwright com Chromium instalado **apenas na máquina de desenvolvimento**; o jogo não os usa. Inicia o servidor estático de desenvolvimento a partir da pasta acima do repositório para reproduzir o subcaminho do GitHub Pages:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace
```

Noutra sessão, na pasta do projeto:

```bash
node tests/browser.cjs
```

Se o Playwright ou o Chromium estiverem noutro local, configura `PLAYWRIGHT_MODULE` (caminho do módulo) e `CHROMIUM_PATH` (executável). `GAME_URL` permite mudar o endereço de teste; o padrão é `http://127.0.0.1:8000/Galaxy-wars/`. `ARTIFACT_DIR` define onde guardar capturas e JSON de teste (padrão: `/tmp/galaxia-browser`). O teste usa um perfil de navegador temporário, não o progresso pessoal.

O teste verifica o manifesto e as dimensões dos ícones, carregamento num subcaminho, instalação do Service Worker, cache de outra aplicação preservado, fecho/reabertura sem rede com três horas decorridas, minas, construção, bots, regresso de espionagem, navegação pelas oito áreas, exportação/importação e rejeição de ficheiro inválido. Verifica ausência de transbordo da página em larguras 320, 375, 390, 430 e 844 px.

**Verificado nesta revisão:** testes Node e Chromium com emulação móvel e rede desligada. **Por verificar:** publicação efetiva no GitHub Pages e instalação/funcionamento no Safari de um iPhone físico. A configuração dos caminhos relativos foi validada localmente no mesmo subcaminho `/Galaxy-wars/`; isso não publica o site. Depois de rever e integrar o PR, configura Pages para `main` / `(root)` e confirma no iPhone a instalação, modo avião e recuperação do progresso.
