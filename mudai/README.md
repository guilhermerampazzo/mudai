# Mudaí

App Android de cuidados com plantas, com um jardineiro de IA. Monorepo com o
aplicativo (React + Capacitor), a API (Node) e a infraestrutura de deploy
(Docker Compose com uma única porta externa).

> Nome: **Mudaí** — trocadilho BR de "mudinha" com "muda aí".

## Módulos

| Módulo | O que faz |
|---|---|
| Dicas de planta | Catálogo de 200 plantas de casa com foto, tags de luz/água e ficha com gráficos |
| Medidor de luz | Lux real pelo sensor do aparelho, com pico/máx/mín/média e diagnóstico por planta |
| Identificar | Foto da planta → IA identifica, mostra as parecidas e devolve a ficha, com cache |
| Hachimi | Chat com IA restrito a plantas e luz — fala como jardineiro, nunca como IA |
| Posição do sol | Bússola solar com GPS real: azimute, elevação e arco do dia |
| Minhas plantas | Cada planta vira um pet com score de saúde (luz + rega + clima) e lembrete de rega |

## Estrutura

```
mudai/
  app/      React + TS + Vite + Capacitor (Android)
    src/pages/      Descobrir, FichaPlanta, Medidor, Identificar, Chat, Sol, Pets, Entrar, Admin
    src/data/       catálogo embutido (fallback offline)
    src/lib/        api, conta, catálogo, pets, notificações, botão voltar
    public/plantas/ 200 fotos locais (nenhuma imagem remota)
    android/        projeto nativo + plugin de sensor de luz
    scripts/        baixar fotos, gerar ícones, gerar seed
  server/   Node 20 + Fastify
    src/catalogo.ts catálogo em JSON no volume, editável pelo painel
    src/contas.ts   contas, códigos de verificação e limites de uso
    src/email.ts    envio de código pelo Resend
    src/estilo.ts   guia de escrita natural aplicado aos textos da IA
  docker/   Dockerfiles (api, web) e nginx do gateway
design/     telas de referência em HTML (fonte do visual)
logo/       marca em SVG (origem dos ícones do app)
plano.md    especificação do produto
```

## Contas, limites e notificações

O app funciona sem conta: dá pra navegar no catálogo, ver fichas, medir luz e usar
a bússola do sol. Para cadastrar planta, conversar com o Hachimi ou identificar
por foto, o app pede uma conta. Sem senha: chega um código de 6 dígitos por e-mail.

Limites por conta (configuráveis no `.env`):

| Uso | Limite |
|---|---|
| Conversa com o Hachimi | 10 por dia e 50 por semana |
| Identificação por foto | 20 por semana |

Os lembretes de rega usam notificação local do aparelho, agendados no ritmo de
cada planta: a que pede água a cada 2 dias recebe aviso a cada 2 dias.

## Rodar o app em desenvolvimento

```bash
cd mudai/app
npm install
npm run dev          # http://localhost:5173
```

## Rodar a API em desenvolvimento

```bash
cd mudai/server
npm install
cp ../.env.example ../.env    # preencha AI_API_KEY e RESEND_API_KEY
PORT=4001 STORAGE_DIR=./storage-dev npx tsx src/index.ts
curl http://127.0.0.1:4001/health
```

Sem chave de IA a API responde 503, e o app continua utilizável: cai sozinho nas
respostas locais.

## Deploy (produção)

Uma única porta externa: `127.0.0.1:10233`. O domínio é servido por um reverse
proxy (aaPanel) que aponta para essa porta.

```bash
cd mudai
cp .env.example .env     # preencha as chaves e troque as senhas
docker compose up -d --build
curl http://127.0.0.1:10233/health
```

Serviços internos (nenhum publica porta): `web` (nginx com o React) e `api`
(Fastify). O gateway roteia `/` para o web e `/api/` e `/uploads/` para a API.

O painel de plantas fica em `/#/admin` e usa o `ADMIN_TOKEN` do `.env`.

## Gerar o APK

```bash
cd mudai/app
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# saída: android/app/build/outputs/apk/debug/app-debug.apk
```

Precisa de JDK 21 e do Android SDK. A URL da API vem de `app/.env.production`.

## IA

Camada compatível com a API OpenAI (`AI_BASE_URL` + `AI_API_KEY` + modelo por
env), então funciona com qualquer provedor compatível sem trocar código.

Como o sistema é gratuito, a conta define os limites de uso — sem conta não há
chamada de IA.

## Escrita

Os textos que a IA produz (respostas do Hachimi, descrições e cuidados das fichas)
seguem um guia de escrita natural em `server/src/estilo.ts`, adaptado do skill
[humanizer](https://github.com/blader/humanizer) (MIT), que por sua vez parte de
[Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
da Wikipédia.

## Licença

Uso privado. As fotos do catálogo vêm do Wikimedia Commons.
