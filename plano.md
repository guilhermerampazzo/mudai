# Mudaí — Plano do Projeto

> App Android (React + Capacitor). Última atualização: 10/09/2026
> Nome: **Mudaí** — trocadilho BR ("mudinha" + "muda aí" 🌱)
> Tagline sugerida: *"Mudaí que sua planta agradece"*

---

## 0. Decisões fechadas

1. **Stack mobile:** React + TypeScript + Vite, exportado via **Capacitor** (webview nativa, 1 codebase).
2. **Nome/identidade:** Mudaí. Tom de voz BR, informal, de jardineiro parceiro — nada de texto com cara de IA.
3. **Plantas = pets:** o usuário cria "pets" (suas plantas) e acompanha a saúde de cada uma.
4. **Upload-first:** fotos e dados ficam no backend próprio; IA só via API com cache agressivo para economizar tokens.
5. **Escopo inicial:** 5 módulos abaixo. Sem pagamento, sem rede social, sem loja (pós-MVP).
6. **IA:** modelo via **Command Code** — provável `deepseek v4 flash vision` (a confirmar depois).
   O código NÃO amarra vendor: camada `AIProvider` OpenAI-compatible (baseURL + key + model por env).
7. **Servidor:** Docker Compose em modo BUILD (produção), **1 única porta externa** (gateway nginx).
   Backend Node 20 + PostgreSQL 16 (+ pgvector p/ futuro RAG) + Redis (filas/cache) + storage local
   em volume Docker. App fala só com o gateway (`/api/*`, `/uploads/*`).

---

## 1. Visão geral e módulos

| Módulo | O que é | Entrada | Saída |
|---|---|---|---|
| 1. Dicas de planta | Catálogo das ~100 plantas domésticas mais comuns | Curadoria inicial + pesquisa | Ficha rica + visual (gráficos, não texto puro) |
| 2. Medidor de luz | Luxímetro via câmera/sensor (gráfico pico/máx/mín/média) | Câmera traseira/frontal | Leitura de lux + diagnóstico pro local |
| 3. Identificador de planta | Foto → IA identifica a planta | Upload de foto | Ficha padrão (mesmos campos do módulo 1) + vínculo ou cadastro |
| 4. Chat IA "Hachimi, o jardineiro" | Chatbot restrito a plantas e luz p/ plantas | Pergunta do usuário | Resposta de "jardineiro experiente" (nunca cita que pesquisou) |
| 5. Posição do sol | Bússola solar dinâmica (localização + giroscópio) | GPS + sensores | Setas/ângulo do sol em tempo real |

---

## 2. Módulo 1 — Dicas de planta (catálogo)

### 2.1 Conteúdo: as ~100 plantas
Pesquisar na internet as 100 principais plantas domésticas no Brasil (ex.: jiboia, zamioculca,
espada-de-são-jorge, samambaia, suculentas, orquídea, costela-de-adão, peperômia, lírio-da-paz,
comigo-ninguém-pode, pileia, calathea, maranta, ficus lyrata, pilea, antúrio, begônia, cacto...).
Cada planta tem: foto (miniatura no grid), nome popular + nome científico, descrição curta.

### 2.2 Tags (sistema formalizado)
Sugestão de taxonomia (combináveis, usada em filtro + ficha + saúde):

- **Luz:** `sombra` · `meia-sombra` · `luz-indireta-brilhante` · `sol-pleno`
- **Água:** `pouca-agua` · `agua-moderada` · `muita-agua` · `borrifo-foliar`
- **Dificuldade:** `iniciante` · `intermediario` · `avancado`
- **Ambiente:** `interna` · `externa` · `varanda` · `banheiro-umido` · `quarto`
- **Pet-safe:** `toxica-pets` · `segura-pets`
- **Extra:** `purifica-ar` · `florifera` · `crescimento-rapido` · `pendente` · `suculenta`

### 2.3 Página da planta (ficha)
Campos obrigatórios (mesmo contrato usado pelo identificador — §4):

- Nome popular, científico, descrição (2–3 linhas, tom Hachimi)
- **Gráficos, não texto puro:**
  - 💧 Água → barra/gauge de 0–5 gotas + frequência ("a cada X dias")
  - ☀️ Sol → sol interativo (arco sombra→sol pleno, marcador na faixa ideal)
  - 🌡️ Temperatura ideal → termômetro com faixa verde
  - 💨 Umidade ideal → névoa/gauge %
  - 🌱 Dificuldade → 1–3 regadores
  - 📏 Porte/velocidade de crescimento → mini-barras
- Bem-estar: sinais de planta feliz vs. estressada (folha amarela, ponta marrom...)
- Passo a passo de cuidado específico (rega, adubo, poda, replante)
- Curiosidades (1–2, tom divertido)
- Tags clicáveis (levam ao filtro do grid)

Grid: foto + nome + tag principal de luz + "Saiba mais".

---

## 3. Módulo 2 — Medidor de luz (lux + VR/câmera)

### 3.1 Funcionamento
- Aponta o celular → mostra **lux em tempo real** (via sensor de luz ambiente quando
  disponível; fallback: estimativa por exposição da câmera — calibrar por aparelho).
- **Traseira:** mede o ambiente. **Frontal ("modo VR/planta"):** aponta p/ a planta e mede
  a luz que *ela* recebe.
- Painel em gráfico: valor atual grande + **pico, máximo, mínimo, média** da sessão
  (inspirado no Lux Light Meter), + sparkline do histórico.
- **Diagnóstico:** compara o lux medido com a faixa ideal das plantas/pets do usuário
  ("☀️ ótimo p/ sua zamioculca · 🌑 fraco p/ suculenta — aproxime da janela").

### 3.2 Detalhes técnicos
- Capacitor: plugin de sensor de luz (`capacitor-ambient-light` ou nativo custom);
  fallback por câmera via análise de exposição (menos preciso — sinalizar).
- Amostragem ~2 Hz, média móvel p/ estabilizar; botão "congelar leitura" + "salvar no pet".
- Permissão de câmera/sensores com explicação em pt-BR.

---

## 4. Módulo 3 — Identificador de planta (foto → IA + cache)

### 4.1 Fluxo
1. Usuário tira foto / faz upload.
2. Backend: hash da imagem → **já identificada antes?** retorna do cache (zero token).
3. Se nova: IA vision (`AI_VISION_MODEL`, prov. deepseek v4 flash vision) identifica
   (nome popular + científico + confiança).
4. Retorna a **ficha padrão completa** (§2.3 — mesmos campos, mesmos gráficos).
5. Se a planta **existe no módulo 1** → popup "ver ficha completa" (link).
   Se **não existe** → gera a ficha na hora, salva no servidor (vira cache) e **pode
   promover ao catálogo** (fila de curadoria p/ virar item do módulo 1).
6. Botão "adotar como pet" direto da ficha.

### 4.2 Regras
- Resposta da IA validada por schema (zod): sem campo, sem ficha.
- Confiança < limite → mostra top-3 candidatas p/ o usuário escolher.
- Cache por hash perceptual (fotos iguais/iguais aproximadas reaproveitam).

---

## 5. Módulo 4 — Chat IA "Hachimi, o jardineiro" 🌿

- Chatbot simples (bolhas, histórico por usuário).
- **Memória restrita:** base do módulo 1 + fichas identificadas + pesquisa web *somente*
  sobre plantas e luz p/ plantas. Qualquer outro assunto → responde com jeitinho
  ("sou jardineiro, disso aí eu não manjo — mas da sua jiboia eu manjo!") e redireciona.
- **Persona:** fala como jardineiro experiente, direto, BR. **NUNCA** diz "pesquisei online",
  "como IA...". Afirma com naturalidade, cita a planta/fonte interna quando útil.
- Contexto extra: injeta os **pets do usuário** no prompt ("ele tem 2 suculentas em meia-sombra").
- Guardrails: sem diagnóstico médico/veterinário além de toxicidade básica já catalogada;
  sem "cara de IA" (lista genérica, elogio vazio).

---

## 6. Módulo 5 — Posição do sol (bússola solar)

- Pega **localização (GPS)** + **giroscópio/bússola** → mostra a posição exata do sol
  naquele momento: **azimute + elevação**, seta dinâmica estilo bússola que gira com o celular.
- Camadas:
  - Agora: onde o sol está (seta + graus + "nasce/põe às X").
  - Arco do dia: trajetória do sol (nascer → pico → pôr) em arco gráfico.
  - **Modo "minha janela":** usuário marca a direção da janela/varanda → app diz
    quantas horas de sol direto aquele ponto recebe hoje.
- Técnico: cálculo astronômico local (ex.: biblioteca `suncalc`), Capacitor Geolocation +
  DeviceOrientation; calibrar bússola (figura-8) quando imprecisa; fallback manual (digitar bairro).

---

## 7. Módulo 6 (transversal) — Meus pets + Saúde da planta 💚

- Usuário cria **pets** (foto, apelido, espécie — do catálogo ou identificada, local da casa).
- **Score de saúde 0–100** por pet, calculado de: lux medido no local (§3) vs. faixa ideal,
  clima/temperatura ambiente (API de clima pela localização), frequência de rega registrada,
  sinais reportados (folha amarela etc.).
- Tela do pet: carinha/estado (feliz → murchinho), dicas acionáveis ("muda aí p/ perto da janela!").
- Lembretes: rega/adubo (notificação local via Capacitor).

---

## 8. Ideias extras (sugestões, priorizar pós-MVP)

1. **Diário do pet** — foto semanal, timelapse do crescimento.
2. **Modo "troca de vaso"** — checklist de replante com lembrete.
3. **Comunidade/trocas** — doar mudas por bairro (pós-MVP, moderação).
4. **Scanner de problema** — foto da folha doente → diagnóstico (extensão do módulo 3).
5. **Widgets Android** — "como está minha planta hoje" na home.
6. **Offline-first** — catálogo das 100 em cache local; IA exige internet.

---

## 9. Arquitetura técnica (Docker Compose BUILD + 1 porta externa)

### 9.1 Topologia

```
App Android (React + Capacitor)
  └─ HTTPS → gateway (nginx, único com ports:) ── rede interna `appnet`
       ├─ /api/*      → api:4000 (Node 20 — REST /api/v1)
       ├─ /uploads/*  → api:4000 (serve arquivos do storage local)
       ├─ /healthz    → gateway health
       ├─ db:5432 (SEM ports, só appnet — Postgres 16 + pgvector)
       ├─ redis:6379 (SEM ports — filas + cache de fichas/chat)
       └─ storage em volume Docker (SEM serviço externo)
```

| Serviço | Porta interna | Publica no host? |
|---|---|---|
| gateway (nginx) | 80 | ✅ `127.0.0.1:10233:80` (única) |
| api (Node 20) | 4000 | ❌ |
| worker (filas IA) | — (mesma imagem api, `node dist/worker.js`) | ❌ |
| db (Postgres 16 + pgvector) | 5432 | ❌ |
| redis | 6379 | ❌ |

> Debug local: override `docker-compose.override.yml` (não commitado).

### 9.2 Monorepo

```
Mudaí/
  app/ (React + TS + Vite + Capacitor)
    src/pages/  Dicas | Medidor | Identificar | Chat (Hachimi) | Sol | Meus Pets
    src/components/  PlantCard, GaugeAgua, SolInterativo, Termometro, LuxChart, BussolaSol, FichaPlanta...
    src/lib/  api.ts, sensores.ts (luz/gps/giro), saude.ts (score)
    android/ (gerado via `cap add android`), capacitor.config.ts
  server/ (Node 20 — REST /api/v1)
    src/ai/  ai.provider.ts (interface) + openai-compatible.provider.ts (único driver)
    POST /identificar (foto → ficha + cache) · POST /chat (Hachimi) · GET /plantas · CRUD /pets
    upload multipart → volume /data/storage (UUID, validação MIME+extensão+tamanho)
  docker/gateway/nginx.conf + Dockerfile
  docker-compose.yml
  .env.example
```

### 9.3 Variáveis de ambiente (.env.example)

```
NODE_ENV=production
GATEWAY_PORT=10233
MAX_UPLOAD_MB=20
DATABASE_URL=postgresql://mudai:trocar@db:5432/mudai
REDIS_URL=redis://redis:6379
STORAGE_DIR=/data/storage
# IA (Command Code — confirmar modelo depois)
AI_BASE_URL=<command-code-compatible-endpoint>
AI_API_KEY=trocar
AI_CHAT_MODEL=deepseek-v4-flash        # provisório, a confirmar
AI_VISION_MODEL=deepseek-v4-flash-vision  # provisório, p/ identificador
JWT_SECRET=trocar-com-openssl-rand-64
```

- Contrato único `FichaPlanta` (zod) compartilhado catálogo ↔ identificador ↔ chat.
- Cache: ficha por espécie + hash de imagem; chat com limite mensal por usuário.
- IA desacoplada: troca-se só o `.env`, sem recodar.
- Permissões Android: `CAMERA`, `ACCESS_FINE_LOCATION`, `BODY_SENSORS` (luz) — pedir sob demanda.

---

## 10. Ordem de construção sugerida

1. **Fase 0 — Base:** React+TS+Vite+Capacitor, navegação por abas (5 módulos), tema Mudaí.
2. **Fase 1 — Catálogo (§2):** contrato `FichaPlanta`, pesquisa das 100, grid + ficha gráfica.
3. **Fase 2 — Pets + saúde (§7):** CRUD de pets, score, lembretes.
4. **Fase 3 — Medidor (§3):** lux + gráficos + diagnóstico vs. pets.
5. **Fase 4 — Identificador (§4):** upload → IA → ficha + cache + vínculo.
6. **Fase 5 — Hachimi (§5):** chat com persona + guardrails + contexto dos pets.
7. **Fase 6 — Sol (§6):** bússola solar + arco do dia + modo janela.
8. **Fase 7 — Build Android:** ícones/splash, permissões, `cap sync` + APK/AAB, teste em aparelho.

---

## 11. Aceite (definition of done)

- [ ] 100 fichas com foto, tags e gráficos (sem texto puro nos indicadores).
- [ ] Medidor mostra lux + pico/máx/mín/média e diagnostica p/ ao menos 1 pet.
- [ ] Foto identifica planta, retorna ficha padrão, cacheia (2ª vez não gasta token), vincula ao catálogo.
- [ ] Hachimi só fala de planta/luz, nunca cita pesquisa, injeta pets no contexto.
- [ ] Bússola solar aponta o sol em tempo real (azimute/elevação conferem).
- [ ] Score de saúde varia de forma sensata com lux + clima + rega.
- [ ] APK instala e roda em Android real com câmera/GPS/sensores.
