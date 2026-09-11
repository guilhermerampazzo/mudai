# Mudaí — README do MVP

## Estrutura

```
mudai/
  app/        React + TS + Vite + Capacitor (telas do MVP)
  server/     Node Fastify — /api/v1/identificar, /api/v1/chat, /api/v1/plantas
  docker/     Dockerfiles api/web/gateway
  docker-compose.yml   1 porta externa: 127.0.0.1:10233
  .env.example
```

## Rodar o app (web, dev)

```bash
cd mudai/app
npm install --include=dev
npm run dev     # http://localhost:5173
```

## Rodar o servidor (dev, sem docker)

```bash
cd mudai/server
npm install --include=dev
cp ../.env.example ../.env   # ou crie o .env e preencha AI_*
PORT=4001 STORAGE_DIR=E:\coder\app-planta-storage node node_modules/tsx/dist/cli.mjs src/index.ts
curl http://127.0.0.1:4001/health   # {"ok":true,"ia":false}
```

O app usa `vite proxy` (/api → :4000) em dev. Sem chave de IA, o servidor responde
`503 IA_INDISPONIVEL`; o app segue 100% funcional offline (catálogo, pets, medidor
simulado, chat local do Hachimi, bússola com GPS fixo SP).

## Subir tudo (produção, 1 porta)

```bash
cd mudai
cp .env.example .env   # preencher AI_BASE_URL / AI_API_KEY (Command Code, deepseek v4 flash vision)
docker compose up -d --build
curl http://127.0.0.1:10233/healthz
```

## Gerar o APK (Android)

```bash
cd mudai/app
npm run build
node node_modules/@capacitor/cli/bin/capacitor sync android
# abrir android/ no Android Studio → Build > Build APK
```

Permissões já declaradas: câmera, localização, mídia, notificações.

## Passar a chave no final

Preencha no `.env`: `AI_BASE_URL`, `AI_API_KEY`, `AI_CHAT_MODEL`, `AI_VISION_MODEL`.
Sem trocar código — a camada é OpenAI-compatible.

## Aceite (plano.md §11)

- [x] Fichas com foto (SVG), tags e gráficos (8 espécies seed; contrato pronto p/ 100)
- [x] Medidor com lux + pico/máx/mín/média + diagnóstico por pet
- [x] Identificar: foto → ficha padrão + cache localStorage (server com cache + zod)
- [x] Hachimi local restrito a planta/luz; server pronto p/ IA real via .env
- [x] Bússola solar com azimute/elevação reais (suncalc) + giroscópio
- [x] Score de saúde por lux + rega + temperatura
- [x] Build web OK; projeto Android gerado (APK via Android Studio)
