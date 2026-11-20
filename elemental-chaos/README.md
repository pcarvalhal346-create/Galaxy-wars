# Elemental Chaos

Puzzle Match-3 mobile com reações elementais e a mascote Lumi. Phaser 4 + TypeScript + Vite.
30 níveis, cristais especiais, gelo, tutorial guiado, som e música — tudo original e offline.

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
npm run android:apk  # gerar o APK Android de teste (precisa do Android SDK e Java 21)
npm run ios:open     # abrir o projeto iOS no Xcode (só num Mac)
```

`?seed=123` no URL fixa o tabuleiro (útil para reproduzir situações).

## Enviar a amigos para testar

### Android — APK
1. Gerar: `npm run android:apk` → `android/app/build/outputs/apk/debug/app-debug.apk`
   (precisa de `ANDROID_HOME` a apontar para o Android SDK e de Java 21).
2. Enviar o ficheiro `.apk` (WhatsApp, Google Drive, e-mail…).
3. No telemóvel: abrir o ficheiro e permitir "Instalar apps desconhecidas" quando o Android pedir.

### iPhone
A Apple só deixa instalar apps assinadas. Há três caminhos:
1. **Versão web instalável (mais simples, grátis):** abrir o link do jogo no Safari →
   Partilhar → **Adicionar ao ecrã principal**. Fica com ícone da Lumi, em ecrã inteiro e funciona offline.
   - Link público: publicar com o GitHub Pages (workflow `.github/workflows/elemental-chaos-pages.yml`;
     ativar em Settings → Pages → Source: GitHub Actions, depois de juntar o código ao `main`).
2. **No teu próprio iPhone, via Xcode (grátis, dura 7 dias):** num Mac com Xcode,
   `npm install && npm run ios:open`, escolher a tua conta Apple em *Signing & Capabilities*,
   ligar o iPhone e carregar ▶︎.
3. **TestFlight para amigos (conta Apple Developer, 99 $/ano):** no Xcode, *Product → Archive →
   Distribute App → TestFlight*, e convidar os amigos por e-mail.

## Controlos

- Os níveis 1–5 têm tutorial guiado pela Lumi; o nível 11 ensina o gelo.
- Arrastar uma peça na direção da vizinha, **ou** tocar numa peça e depois numa adjacente.
- ⏸ pausa (reiniciar, mapa, livro, música, sons, efeitos reduzidos); 📖 Livro dos Elementos.
