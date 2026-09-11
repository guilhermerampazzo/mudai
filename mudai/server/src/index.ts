import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import sharp from "sharp";
import { Catalogo, slugificar, type Planta } from "./catalogo.js";
import { Contas, limitesAtuais, type Conta } from "./contas.js";
import { enviarCodigo, emailConfigurado } from "./email.js";
import { ESTILO_NATURAL_CURTO } from "./estilo.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
for (const candidato of [join(RAIZ, ".env"), join(RAIZ, "..", ".env")]) {
  if (!existsSync(candidato)) continue;
  for (const linha of readFileSync(candidato, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  break;
}

const PORT = Number(process.env.PORT ?? 4000);
const STORAGE_DIR = process.env.STORAGE_DIR ?? "/data/storage";
mkdirSync(STORAGE_DIR, { recursive: true });

const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.commandcode.ai/provider/v1";
const AI_API_KEY = process.env.AI_API_KEY ?? "";
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL ?? "deepseek/deepseek-v4-flash-vision-exp";
const AI_CHAT_FALLBACK = process.env.AI_CHAT_FALLBACK ?? "deepseek/deepseek-v4-flash";
const AI_VISION_MODEL = process.env.AI_VISION_MODEL ?? "deepseek/deepseek-v4-flash-vision-exp";
const AI_VISION_FALLBACK = process.env.AI_VISION_FALLBACK ?? "deepseek/deepseek-v4-flash";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

const catalogo = new Catalogo(STORAGE_DIR);
const contas = new Contas(STORAGE_DIR);

const app = Fastify({ logger: true, bodyLimit: 12 * 1024 * 1024 });

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["content-type", "x-admin-token", "x-sessao"],
  maxAge: 86400,
});

await app.register(multipart, {
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024, files: 1 },
});
await app.register(fastifyStatic, { root: STORAGE_DIR, prefix: "/uploads/", decorateReply: false });

app.get("/health", async () => ({
  ok: true,
  ia: Boolean(AI_BASE_URL && AI_API_KEY),
  email: emailConfigurado(),
  admin: Boolean(ADMIN_TOKEN),
  plantas: catalogo.total(),
  contas: contas.quantidade(),
}));

/* ------------------------------------------------------------------ *
 * Conta (opcional — o app funciona sem, mas IA exige conta)
 * ------------------------------------------------------------------ */

function sessao(req: { headers: Record<string, unknown> }): Conta | undefined {
  const t = req.headers["x-sessao"];
  return contas.porSessao(typeof t === "string" ? t : undefined);
}

const EmailSchema = z.object({
  email: z.string().email("E-mail inválido."),
  nome: z.string().max(80).optional().default(""),
});

app.post("/api/v1/conta/codigo", async (req, reply) => {
  const parsed = EmailSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ code: "EMAIL_INVALIDO", message: "Confira o e-mail." });

  const { email, nome } = parsed.data;
  const { conta, novo } = contas.criarConta(email, nome);

  if (!conta.codigo) {
    const r = await enviarCodigo(email, conta.nome, "------");
    void r;
    return reply.code(500).send({ code: "ERRO_INTERNO", message: "Tente de novo." });
  }

  const envio = await enviarCodigo(email, conta.nome, conta.codigo);
  if (!envio.ok) {
    req.log.warn({ erro: envio.erro }, "falha ao enviar codigo");
    const mensagem =
      envio.erro === "EMAIL_NAO_CONFIGURADO"
        ? "O envio de e-mail ainda não está configurado."
        : "Não consegui enviar o e-mail agora. Tente de novo em instantes.";
    return reply.code(503).send({ code: "EMAIL_FALHOU", message: mensagem });
  }

  return { ok: true, novo, mensagem: "Código enviado. Olha seu e-mail." };
});

const VerificarSchema = z.object({
  email: z.string().email(),
  codigo: z.string().min(4).max(8),
});

app.post("/api/v1/conta/verificar", async (req, reply) => {
  const parsed = VerificarSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ code: "INVALIDO", message: "Confira o código." });

  const r = contas.verificar(parsed.data.email, parsed.data.codigo);
  if (!r.ok) return reply.code(400).send({ code: "CODIGO_INVALIDO", message: r.erro ?? "Código inválido." });

  const conta = contas.porSessao(r.token);
  return { ok: true, token: r.token, conta: conta ? publica(conta) : null };
});

app.get("/api/v1/conta/eu", async (req, reply) => {
  const conta = sessao(req);
  if (!conta) return reply.code(401).send({ code: "SEM_SESSAO", message: "Sem sessão." });
  return { ok: true, conta: publica(conta), uso: contas.consultarLimites(conta) };
});

app.post("/api/v1/conta/sair", async (req) => {
  const conta = sessao(req);
  if (conta?.token) contas.sair(conta.token);
  return { ok: true };
});

/** Sessão anônima: deixa usar o app inteiro, mas sem IA. */
app.post("/api/v1/conta/anonimo", async () => {
  const conta = contas.criarAnonimo();
  return { ok: true, token: conta.token, conta: publica(conta) };
});

function publica(c: Conta) {
  return {
    id: c.id,
    email: c.email.includes("@local") ? null : c.email,
    nome: c.nome,
    verificado: Boolean(c.verificado),
    criadaEm: c.criadaEm,
  };
}

/** Portão da IA: exige conta verificada e respeita os limites. */
function exigirConta(req: { headers: Record<string, unknown> }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  const conta = sessao(req);
  if (!conta) {
    reply.code(401).send({
      code: "PRECISA_CONTA",
      message: "Crie sua conta para usar isso.",
    });
    return null;
  }
  if (!conta.verificado) {
    reply.code(403).send({
      code: "CONTA_NAO_VERIFICADA",
      message: "Confirme seu e-mail para usar isso.",
    });
    return null;
  }
  return conta;
}

/* ------------------------------------------------------------------ *
 * Catálogo
 * ------------------------------------------------------------------ */

app.get("/api/v1/catalogo", async () => ({
  versao: catalogo.versao(),
  total: catalogo.total(),
  plantas: catalogo.listar(),
}));

app.get("/api/v1/plantas/:slug", async (req, reply) => {
  const { slug } = req.params as { slug: string };
  const planta = catalogo.buscar(slug);
  if (!planta) return reply.code(404).send({ code: "NAO_ENCONTRADA", message: "Planta não encontrada." });
  return planta;
});

/* ------------------------------------------------------------------ *
 * Admin — cadastro de plantas
 * ------------------------------------------------------------------ */

function autorizado(req: { headers: Record<string, unknown> }): boolean {
  if (!ADMIN_TOKEN) return false;
  const enviado = req.headers["x-admin-token"];
  return typeof enviado === "string" && enviado.length > 0 && enviado === ADMIN_TOKEN;
}

app.get("/api/v1/admin/sessao", async (req, reply) => {
  if (!autorizado(req)) return reply.code(401).send({ code: "NAO_AUTORIZADO", message: "Token inválido." });
  return { ok: true, total: catalogo.total(), contas: contas.quantidade(), limites: limitesAtuais() };
});

const PlantaSchema = z.object({
  slug: z.string().optional(),
  nomePopular: z.string().min(2).max(80),
  nomeCientifico: z.string().min(2).max(120),
  descricao: z.string().min(5).max(600),
  foto: z.string().min(1),
  aguaNivel: z.number().int().min(0).max(5).default(3),
  aguaFreqDias: z.tuple([z.number(), z.number()]).default([7, 10]),
  luxMin: z.number().min(0).default(1000),
  luxMax: z.number().min(1).default(5000),
  tempMin: z.number().default(18),
  tempMax: z.number().default(30),
  umidadeMin: z.number().default(40),
  umidadeMax: z.number().default(70),
  dificuldade: z.number().int().min(1).max(3).default(1),
  porte: z.string().default("Porte médio"),
  toxicaPets: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  tagLuz: z.string().default("Meia-sombra"),
  cuidados: z
    .array(z.object({ titulo: z.string(), texto: z.string() }))
    .default([{ titulo: "Rega", texto: "Regue quando o topo do solo secar." }]),
  sinais: z
    .object({ feliz: z.array(z.string()), estresse: z.array(z.string()) })
    .default({ feliz: ["Folhas firmes"], estresse: ["Folha amarelada: cheque água e luz"] }),
  curiosidades: z.array(z.string()).default([]),
});

app.post("/api/v1/admin/plantas", async (req, reply) => {
  if (!autorizado(req)) return reply.code(401).send({ code: "NAO_AUTORIZADO", message: "Token inválido." });
  const parsed = PlantaSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ code: "INVALIDO", message: "Dados incompletos.", detalhes: parsed.error.issues });
  }
  const dados = parsed.data;
  const slug = dados.slug?.trim() ? slugificar(dados.slug) : slugificar(dados.nomePopular);
  try {
    const existente = catalogo.buscar(slug);
    const planta = existente
      ? catalogo.atualizar(slug, dados as Partial<Planta>)
      : catalogo.criar({ ...(dados as Planta), slug });
    return { ok: true, atualizada: Boolean(existente), planta };
  } catch (e) {
    return reply.code(400).send({ code: (e as Error).message, message: "Não foi possível salvar." });
  }
});

app.delete("/api/v1/admin/plantas/:slug", async (req, reply) => {
  if (!autorizado(req)) return reply.code(401).send({ code: "NAO_AUTORIZADO", message: "Token inválido." });
  const { slug } = req.params as { slug: string };
  try {
    catalogo.remover(slug);
    return { ok: true };
  } catch {
    return reply.code(404).send({ code: "NAO_ENCONTRADA", message: "Planta não encontrada." });
  }
});

app.post("/api/v1/admin/foto", async (req, reply) => {
  if (!autorizado(req)) return reply.code(401).send({ code: "NAO_AUTORIZADO", message: "Token inválido." });
  const file = await req.file();
  if (!file) return reply.code(400).send({ code: "SEM_ARQUIVO", message: "Envie uma imagem." });
  const ext = extname(file.filename).toLowerCase() || ".jpg";
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext))
    return reply.code(400).send({ code: "TIPO_NAO_PERMITIDO", message: "Use JPG, PNG ou WebP." });

  const nome = `planta-${randomUUID()}${ext}`;
  await pipeline(file.file, createWriteStream(join(STORAGE_DIR, nome)));
  return { ok: true, foto: `/uploads/${nome}` };
});

/* ------------------------------------------------------------------ *
 * IA
 * ------------------------------------------------------------------ */

const FichaSchema = z.object({
  slug: z.string(),
  nomePopular: z.string(),
  nomeCientifico: z.string(),
  descricao: z.string(),
  aguaNivel: z.number().int().min(0).max(5),
  aguaFreqDias: z.tuple([z.number(), z.number()]),
  luxMin: z.number(),
  luxMax: z.number(),
  tempMin: z.number(),
  tempMax: z.number(),
  umidadeMin: z.number(),
  umidadeMax: z.number(),
  dificuldade: z.number().int().min(1).max(3),
  porte: z.string(),
  toxicaPets: z.boolean(),
  tags: z.array(z.string()),
  tagLuz: z.string(),
  cuidados: z.array(z.object({ titulo: z.string(), texto: z.string() })),
  sinais: z.object({ feliz: z.array(z.string()), estresse: z.array(z.string()) }),
  curiosidades: z.array(z.string()),
});

/** Resposta da identificação: candidatos ordenados, o melhor primeiro. */
const IdentificacaoSchema = z.object({
  candidatos: z
    .array(
      z.object({
        nomePopular: z.string(),
        nomeCientifico: z.string(),
        confianca: z.number().min(0).max(100),
        porque: z.string(),
      })
    )
    .default([]),
  precisaRevisao: z.boolean().default(false),
});

const CAMINHO_CACHE = join(STORAGE_DIR, "identificacoes.json");
type Ficha = z.infer<typeof FichaSchema>;
type Identificacao = z.infer<typeof IdentificacaoSchema>;

interface Achado {
  candidatos: z.infer<typeof IdentificacaoSchema>["candidatos"];
  precisaRevisao: boolean;
  ficha: Ficha & { confianca: number };
}

const identificarCache = new Map<string, Achado>(
  existsSync(CAMINHO_CACHE) ? (JSON.parse(readFileSync(CAMINHO_CACHE, "utf8")) as [string, Achado][]) : []
);

function salvarCache(): void {
  try {
    writeFileSync(CAMINHO_CACHE, JSON.stringify([...identificarCache.entries()].slice(-500)), "utf8");
  } catch {
    /* cache é descartável */
  }
}

async function chamarIA(messages: unknown[], model: string, json = false, maxTokens = 2000): Promise<string> {
  if (!AI_BASE_URL || !AI_API_KEY) throw new Error("IA_NAO_CONFIGURADA");
  const res = await fetch(`${AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${AI_API_KEY}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`IA_HTTP_${res.status}${corpo ? ` ${corpo.slice(0, 200)}` : ""}`);
  }
  const data = (await res.json()) as { choices: { message: { content?: string } }[] };
  const content = data.choices[0]?.message?.content?.trim();
  if (content) return content;
  throw new Error("IA_SEM_CONTENT");
}

async function chamarIAResiliente(messages: unknown[], modelos: string[], json = false, maxTokens = 2000): Promise<string> {
  let ultimo: Error | null = null;
  for (const modelo of modelos.filter(Boolean)) {
    try {
      return await chamarIA(messages, modelo, json, maxTokens);
    } catch (e) {
      ultimo = e as Error;
    }
  }
  throw ultimo ?? new Error("IA_INDISPONIVEL");
}

function extrairJSON(texto: string): unknown {
  const limpo = texto.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const inicio = limpo.indexOf("{");
    if (inicio < 0) throw new Error("JSON ausente");
    const fim = limpo.lastIndexOf("}");
    if (fim > inicio) return JSON.parse(limpo.slice(inicio, fim + 1));
    throw new Error("JSON incompleto");
  }
}

app.post("/api/v1/identificar", async (req, reply) => {
  const conta = exigirConta(req, reply);
  if (!conta) return;

  const limites = contas.consultarLimites(conta);
  if (!limites.podeVisao) {
    return reply.code(429).send({
      code: "LIMITE_VISAO",
      message: `Você já usou as ${limites.limites.visaoSemana} identificações da semana. Volta na segunda.`,
      uso: limites,
    });
  }

  const file = await req.file();
  if (!file) return reply.code(400).send({ code: "SEM_ARQUIVO", message: "Envie uma imagem." });
  const ext = extname(file.filename).toLowerCase() || ".jpg";
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext))
    return reply.code(400).send({ code: "TIPO_NAO_PERMITIDO", message: "Use JPG, PNG ou WebP." });

  const chunks: Buffer[] = [];
  const hash = createHash("sha256");
  for await (const chunk of file.file) {
    const buf = chunk as Buffer;
    chunks.push(buf);
    hash.update(buf);
  }
  const digest = hash.digest("hex");
  const nome = `${digest}${ext}`;
  const destino = join(STORAGE_DIR, nome);
  if (!existsSync(destino)) {
    await pipeline(
      (async function* () {
        for (const c of chunks) yield c;
      })(),
      createWriteStream(destino)
    );
  }

  const doCache = identificarCache.get(digest);
  if (doCache) {
    return { cache: true, arquivoUrl: `/uploads/${nome}`, ...doCache, uso: contas.consultarLimites(conta) };
  }

  // A IA recebe o catálogo para comparar antes de arriscar um nome novo.
  const conhecidas = catalogo
    .listar()
    .map((p) => `${p.nomePopular} | ${p.nomeCientifico}`)
    .join("\n");

  // Redimensiona antes de mandar: menos custo, resposta mais rápida e
  // evita imagem grande demais (o corte no meio do base64 corrompia a foto).
  let b64: string;
  try {
    const reduzida = await sharp(Buffer.concat(chunks))
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    b64 = reduzida.toString("base64");
  } catch (e) {
    req.log.warn({ err: e }, "nao consegui redimensionar, usando original");
    b64 = Buffer.concat(chunks).toString("base64");
  }
  const imagem = { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } };

  try {
    /* Passo 1 — identificar. Resposta curta, então não corre risco de cortar. */
    const txtId = await chamarIAResiliente(
      [
        {
          role: "system",
          content: `Você identifica plantas de casa a partir de foto. Olhe com atenção antes de responder.

O que observar, nesta ordem:
1. Folha: formato, borda, textura (lisa, aveludada, grossa, cerosa), se tem furos, recortes ou manchas, como as nervuras correm.
2. Caule: ereto, trepador, pendente, em roseta, ou folha saindo direto do chão.
3. Conjunto: tamanho da folha em relação à mão, jeito de crescer, se forma touceira.

Compare com o catálogo abaixo. Se a planta da foto é uma delas, use exatamente o mesmo nome popular e científico. Se não for, diga o nome correto assim mesmo.

Confiança honesta: foto escura, tremida, de longe ou só com parte da folha derruba a nota. Se duas espécies são plausíveis, liste as duas e marque precisaRevisao true.

Cuidado com estas confusões comuns:
- Monstera deliciosa: folha grande, espessa, com furos e recortes fundos. Monstera adansonii: furos pequenos, folha fina. Epipremnum/jiboia: folha inteira, sem furo nenhum.
- Jiboia (Epipremnum) x Filodendro-coração (Philodendron hederaceum): os dois têm folha em coração. A jiboia costuma ter manchas amarelas ou creme e folha um pouco mais carnuda, com nervura central funda; o filodendro é verde uniforme e mais fino. Sem mancha nenhuma e folha fina, pense em filodendro; com qualquer mancha, é jiboia.
- Ficus lyrata: folha grande em forma de violão, borda ondulada. Ficus elastica: folha oval, grossa, borda lisa. Ficus benjamina: folha pequena e pontuda.
- Zamioculcas: folha composta, folíolos ovais brilhantes em pares num caule grosso.
- Sansevieria: folha rígida em espada, ereta, saindo do chão.
- Marantáceas: folha com desenho, nervuras marcadas, fecha à noite.
- Suculentas em roseta: Echeveria, Graptopetalum, Haworthia, Sempervivum.

Se a foto mostra um conjunto de plantas (cerca viva, canteiro, jardim), identifique a espécie predominante e diga isso no "porque".

Não invente furo, recorte ou flor que não está vendo.

CATÁLOGO CONHECIDO:
${conhecidas}

Responda SOMENTE JSON, sem markdown:
{"candidatos":[{"nomePopular":"","nomeCientifico":"","confianca":0-100,"porque":"o detalhe da foto que levou a isso, uma frase"}],"precisaRevisao":true|false}

Liste no máximo 3 candidatos, do mais provável ao menos.`,
        },
        { role: "user", content: [{ type: "text", text: "Identifique a planta da foto." }, imagem] },
      ],
      [AI_VISION_MODEL, AI_VISION_FALLBACK],
      true,
      2000
    );

    const id = IdentificacaoSchema.parse(extrairJSON(txtId));
    id.candidatos.sort((a, b) => b.confianca - a.confianca);

    // Se a IA não arriscou nenhum nome, tenta mais uma vez antes de desistir.
    if (id.candidatos.length === 0) {
      const segunda = await chamarIAResiliente(
        [
          { role: "system", content: "Identifique a planta da foto. Responda SOMENTE o JSON: {\"candidatos\":[{\"nomePopular\":\"\",\"nomeCientifico\":\"\",\"confianca\":0-100,\"porque\":\"\"}],\"precisaRevisao\":false}. Sempre informe pelo menos um candidato, mesmo com confiança baixa." },
          { role: "user", content: [{ type: "text", text: "Qual é essa planta?" }, imagem] },
        ],
        [AI_VISION_MODEL, AI_VISION_FALLBACK],
        true,
        1200
      );
      const retry = IdentificacaoSchema.parse(extrairJSON(segunda));
      id.candidatos = retry.candidatos.sort((a, b) => b.confianca - a.confianca);
      id.precisaRevisao = true;
      if (id.candidatos.length === 0) throw new Error("não reconheci a planta nesta foto");
    }

    const melhor = id.candidatos[0];

    /* Passo 2 — a ficha: se já está no catálogo, aproveita; se não, a IA gera. */
    const slug = slugificar(melhor.nomePopular);
    const cientifico = melhor.nomeCientifico.trim().toLowerCase();
    const jaTem =
      catalogo.buscar(slug) ??
      catalogo.listar().find((p) => p.nomeCientifico.trim().toLowerCase() === cientifico);

    let ficha: Ficha;
    if (jaTem) {
      ficha = jaTem as unknown as Ficha;
    } else {
      const txtFicha = await chamarIAResiliente(
        [
          {
            role: "system",
            content: `Você é botânico e escreve para um app de jardim, em português do Brasil.

Monte a ficha da planta "${melhor.nomePopular}" (${melhor.nomeCientifico}).

Responda SOMENTE JSON, sem markdown:
{"slug":"","nomePopular":"${melhor.nomePopular}","nomeCientifico":"${melhor.nomeCientifico}","descricao":"","aguaNivel":0-5,"aguaFreqDias":[min,max],"luxMin":0,"luxMax":0,"tempMin":0,"tempMax":0,"umidadeMin":0,"umidadeMax":0,"dificuldade":1-3,"porte":"","toxicaPets":false,"tags":[""],"tagLuz":"","cuidados":[{"titulo":"","texto":""}],"sinais":{"feliz":[""],"estresse":[""]},"curiosidades":[""]}

Regras dos números: aguaNivel 0 é quase nada e 5 é sempre úmida; aguaFreqDias é o intervalo em dias entre regas; luxMin e luxMax são a faixa de luz que a planta aceita.

Quando escrever a descrição e os cuidados, fale como um jardineiro brasileiro explicando para um amigo: direto, sem enfeite, sem emoji, sem negrito, sem "não é só X, é Y", sem "crucial/fundamental/essencial/vibrante". Misture frase curta e frase longa. Use só o que você sabe da espécie, sem inventar número exato que você não tem.

${ESTILO_NATURAL_CURTO}`,
          },
          { role: "user", content: "Monte a ficha dessa planta." },
        ],
        [AI_VISION_MODEL, AI_VISION_FALLBACK],
        true,
        3000
      );
      ficha = FichaSchema.parse(extrairJSON(txtFicha));
    }

    const achado: Achado = {
      candidatos: id.candidatos,
      precisaRevisao: id.precisaRevisao,
      ficha: { ...ficha, confianca: melhor.confianca },
    };
    identificarCache.set(digest, achado);
    salvarCache();
    contas.registrarVisao(conta);

    let noCatalogo: Planta | undefined = jaTem;
    if (!jaTem && melhor.confianca >= 70) {
      try {
        noCatalogo = catalogo.criar({
          ...(ficha as unknown as Planta),
          slug,
          nomePopular: melhor.nomePopular,
          nomeCientifico: melhor.nomeCientifico,
          foto: `/uploads/${nome}`,
          origem: "ia",
        });
      } catch {
        /* corrida: outra requisição criou antes */
      }
    }

    return {
      cache: false,
      arquivoUrl: `/uploads/${nome}`,
      ...achado,
      catalogo: noCatalogo ? { slug: noCatalogo.slug, novo: !jaTem } : null,
      uso: contas.consultarLimites(conta),
    };
  } catch (err) {
    req.log.warn({ err }, "identificar falhou");
    return reply.code(503).send({
      code: "IA_INDISPONIVEL",
      message: `Não consegui identificar agora: ${(err as Error).message}`,
      arquivoUrl: `/uploads/${nome}`,
    });
  }
});

const SISTEMA_HACHIMI = `Você é o Hachimi, o jardineiro do Mudaí. Fala com o usuário como um jardineiro brasileiro experiente conversando com um amigo: descontraído, direto, sem cerimônia, às vezes brinca. Trata a planta como gente ("a Juju tá pedindo água").

REGRAS DURAS:
- Só fala de plantas e de luz para plantas. Qualquer outro assunto, recusa com bom humor e puxa de volta pra planta.
- NUNCA diga "pesquisei", "como IA", "sou um modelo" ou parecido. Você é jardineiro, sabe das coisas.
- Responda o que foi perguntado, sem rodeio. Se for passo a passo, dê o passo a passo. Se for sim ou não, comece pelo sim ou não.
- Use o catálogo abaixo para dar número certo (rega, lux, temperatura). Se a planta não estiver no catálogo, use o que você sabe da espécie.
- Quando o usuário citar um pet dele, use o apelido e o histórico que você recebeu.

${ESTILO_NATURAL_CURTO}`;

const ChatSchema = z.object({
  mensagem: z.string().min(1).max(2000),
  pets: z.array(z.object({ apelido: z.string(), especie: z.string(), local: z.string() })).default([]),
  historico: z.array(z.object({ role: z.enum(["user", "assistant"]), texto: z.string() })).default([]),
});

app.post("/api/v1/chat", async (req, reply) => {
  const conta = exigirConta(req, reply);
  if (!conta) return;

  const limites = contas.consultarLimites(conta);
  if (!limites.podeChat) {
    const motivo =
      limites.chatHoje >= limites.limites.chatDia
        ? `Você já conversou ${limites.limites.chatDia} vezes hoje. Amanhã eu volto.`
        : `Você bateu o limite de ${limites.limites.chatSemana} conversas da semana. Semana que vem a gente continua.`;
    return reply.code(429).send({ code: "LIMITE_CHAT", message: motivo, uso: limites });
  }

  const body = ChatSchema.safeParse(req.body);
  if (!body.success) return reply.code(400).send({ code: "INVALIDO", message: "Mensagem inválida." });
  const { mensagem, pets, historico } = body.data;

  const contextoPets = pets.length
    ? `Plantas do usuário (ele chama de pets): ${pets.map((p) => `${p.apelido}, ${p.especie}, fica em ${p.local}`).join("; ")}.`
    : "O usuário ainda não cadastrou nenhuma planta.";

  const fichas = catalogo
    .listar()
    .slice(0, 300)
    .map((p) => `${p.nomePopular} (${p.nomeCientifico}) — rega a cada ${p.aguaFreqDias[0]}–${p.aguaFreqDias[1]} dias, ${p.tagLuz.toLowerCase()}, ${p.luxMin}–${p.luxMax} lux, ${p.tempMin}–${p.tempMax}°C`)
    .join("\n");

  try {
    const texto = await chamarIAResiliente(
      [
        {
          role: "system",
          content: `${SISTEMA_HACHIMI}\n\n${contextoPets}\n\nCatálogo que você domina:\n${fichas}`,
        },
        ...historico.slice(-8).map((h) => ({ role: h.role, content: h.texto })),
        { role: "user", content: mensagem },
      ],
      [AI_CHAT_MODEL, AI_CHAT_FALLBACK],
      false,
      1600
    );

    contas.registrarChat(conta);
    return { resposta: texto, uso: contas.consultarLimites(conta) };
  } catch (err) {
    req.log.warn({ err }, "chat falhou");
    return reply.code(503).send({
      code: "IA_INDISPONIVEL",
      message: `Hachimi não conseguiu responder agora: ${(err as Error).message}`,
    });
  }
});

app.setErrorHandler((erro: Error & { statusCode?: number }, req, reply) => {
  req.log.error({ err: erro }, "erro na requisicao");
  reply.code(erro.statusCode ?? 500).send({ code: "ERRO", message: erro.message });
});

await app.listen({ port: PORT, host: "0.0.0.0" });
