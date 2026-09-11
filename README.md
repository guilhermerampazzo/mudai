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
| Identificar | Foto da planta → IA identifica e devolve a ficha no padrão do catálogo, com cache |
| Hachimi | Chat com IA restrito a plantas e luz — fala como jardineiro, nunca como IA |
| Posição do sol | Bússola solar com GPS real: azimute, elevação e arco do dia |
| Meus pets | Cada planta vira um pet com score de saúde (luz + rega + clima) |

## Estrutura

```
mudai/
  app/      React + TS + Vite + Capacitor (Android)
    src/pages/      telas: Descobrir, FichaPlanta, Medidor, Identificar, Chat, Sol, Pets
    src/data/       catálogo das 200 plantas
    src/lib/        api, sensores, score de saúde
    public/plantas/ 200 fotos locais (nenhuma imagem remota)
    android/        projeto nativo + plugin de sensor de luz
    scripts/        baixar fotos, gerar ícones
  server/   Node 20 + Fastify — /api/v1/identificar, /api/v1/chat
  docker/   Dockerfiles (api, web) e nginx do gateway
design/     telas de referência em HTML (fonte do visual)
logo/       marca em SVG (origem dos ícones do app)
plano.md    especificação do produto
docker-compose.yml
```

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
cp ../.env.example ../.env    # preencha AI_API_KEY
PORT=4001 STORAGE_DIR=./storage-dev node node_modules/tsx/dist/cli.mjs src/index.ts
```

Sem chave de IA a API responde `503`, e o app continua utilizável: cai sozinho
nas respostas locais.

## Deploy (produção)

Uma única porta externa: `127.0.0.1:10233`. O domínio é servido por um reverse
proxy (aaPanel) que aponta para essa porta.

```bash
cd mudai
cp .env.example .env     # preencha AI_API_KEY e troque as senhas
docker compose up -d --build
curl http://127.0.0.1:10233/healthz
```

Serviços internos (nenhum publica porta): `web` (nginx com o React), `api`
(Fastify), `db` (Postgres 16 + pgvector), `redis`. O app fala com o mundo só
pelo gateway, que roteia `/` para o web, `/api/` e `/uploads/` para a API.

## Gerar o APK

```bash
cd mudai/app
npm run build
node node_modules/@capacitor/cli/bin/capacitor sync android
cd android && ./gradlew assembleDebug
# saída: android/app/build/outputs/apk/debug/app-debug.apk
```

Precisa de JDK 21 e do Android SDK. A URL da API vem de `app/.env.production`.

## IA

Camada compatível com a API OpenAI (`AI_BASE_URL` + `AI_API_KEY` + modelo por
env), então funciona com qualquer provedor compatível sem trocar código.
Configurado hoje para Command Code com `deepseek-v4-flash` (chat) e
`deepseek-v4-flash-vision-exp` (visão), com fallback automático de modelo.

## Licença

Uso privado. As fotos do catálogo vêm do Wikimedia Commons.
