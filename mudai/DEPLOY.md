# Mudaí — Deploy

Domínio: **https://mudai.codermaster.com.br**

## Arquitetura

```
Internet (HTTPS)
  └─ Cloudflare → aaPanel reverse proxy (nginx, SSL) → 127.0.0.1:10233
       └─ gateway (nginx)  ← única porta publicada
            ├─ /          → web  (nginx com o app React)
            ├─ /api/      → api  (Fastify: catálogo, IA, admin)
            ├─ /uploads/  → api  (fotos enviadas pelo painel)
            └─ /health    → api
```

Três containers: `mudai-api`, `mudai-web`, `mudai-gateway`. Volume único
`mudai_storage` guarda `catalogo.json`, as fotos enviadas e o cache de
identificação. Consumo total em repouso: ~38 MB de RAM.

## Subir do zero

```bash
cd /www/wwwroot/mudai/mudai
cp .env.example .env      # preencha AI_API_KEY e ADMIN_TOKEN
docker compose up -d --build
curl http://127.0.0.1:10233/health
```

No aaPanel: site do domínio com proxy para `127.0.0.1:10233` e SSL.

## Catálogo dinâmico

O catálogo é um JSON no volume, semeado com as 200 plantas do app na primeira
subida. O painel `/#/admin` edita esse JSON; o app baixa em `/api/v1/catalogo`
a cada abertura e guarda em cache. Plantas novas não exigem APK novo.

## Atualizar

```bash
cd /www/wwwroot/mudai && git pull && cd mudai && docker compose up -d --build
```
