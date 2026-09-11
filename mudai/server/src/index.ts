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
import { Catalogo, slugificar, type Planta } from "./catalogo.js";

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
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL ?? "deepseek/deepseek-v4-flash";
const AI_CHAT_FALLBACK = process.env.AI_CHAT_FALLBACK ?? "deepseek/deepseek-v4-pro";
const AI_VISION_MODEL = process.env.AI_VISION_MODEL ?? "deepseek/deepseek-v4-flash-vision-exp";
const AI_VISION_FALLBACK = process.env.AI_VISION_FALLBACK ?? "deepseek/deepseek-v4-flash";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

const catalogo = new Catalogo(STORAGE_DIR);

const app = Fastify({ logger: true });

// O app roda em WebView (origens capacitor://localhost, https://localhost,
// http://localhost) e o painel roda no domínio — todos cross-origin.
await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["content-type", "x-admin-token"],
  maxAge: 86400,
});

await app.register(multipart, {
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024, files: 1 },
});
await app.register(fastifyStatic, { root: STORAGE_DIR, prefix: "/uploads/", decorateReply: false });

app.get("/health", async () => ({
  ok: true,
  ia: Boolean(AI_BASE_URL && AI_API_KEY),
  admin: Boolean(ADMIN_TOKEN),
  plantas: catalogo.total(),
}));

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
 * Admin — cadastro de plantas pela web
 * ------------------------------------------------------------------ */

function autorizado(req: { headers: Record<string, unknown> }): boolean {
  if (!ADMIN_TOKEN) return false;
  const enviado = req.headers["x-admin-token"];
  return typeof enviado === "string" && enviado.length > 0 && enviado === ADMIN_TOKEN;
}

app.get("/api/v1/admin/sessao", async (req, reply) => {
  if (!autorizado(req)) return reply.code(401).send({ code: "NAO_AUTORIZADO", message: "Token inválido." });
  return { ok: true, total: catalogo.total() };
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
  confianca: z.number().min(0).max(100),
});

const CAMINHO_CACHE = join(STORAGE_DIR, "identificacoes.json");
type Ficha = z.infer<typeof FichaSchema>;

const identificarCache = new Map<string, Ficha>(
  existsSync(CAMINHO_CACHE)
    ? (JSON.parse(readFileSync(CAMINHO_CACHE, "utf8")) as [string, Ficha][])
    : []
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
  if (doCache) return { cache: true, arquivoUrl: `/uploads/${nome}`, ficha: doCache };

  try {
    const b64 = Buffer.concat(chunks).toString("base64");
    const txt = await chamarIAResiliente(
      [
        {
          role: "system",
          content:
            "Você é um botânico. Responda SOMENTE um JSON válido, sem markdown, sem texto fora do JSON. Seja breve em cada campo (descrições de 1-2 linhas). Campos: slug, nomePopular, nomeCientifico, descricao, aguaNivel (0-5), aguaFreqDias [min,max], luxMin, luxMax, tempMin, tempMax, umidadeMin, umidadeMax, dificuldade (1-3), porte, toxicaPets (bool), tags (3-6 itens), tagLuz, cuidados (3 itens {titulo,texto}), sinais {feliz (2), estresse (2)}, curiosidades (2), confianca (0-100).",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Identifique esta planta e devolva apenas o JSON da ficha." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64.slice(0, 200000)}` } },
          ],
        },
      ],
      [AI_VISION_MODEL, AI_VISION_FALLBACK],
      true,
      4000
    );
    const ficha = FichaSchema.parse(extrairJSON(txt));
    identificarCache.set(digest, ficha);
    salvarCache();

    const slug = slugificar(ficha.slug || ficha.nomePopular);
    const cientifico = ficha.nomeCientifico.trim().toLowerCase();
    const jaTem =
      catalogo.buscar(slug) ??
      catalogo.listar().find((p) => p.nomeCientifico.trim().toLowerCase() === cientifico);
    let noCatalogo = jaTem;
    if (!jaTem) {
      try {
        noCatalogo = catalogo.criar({
          ...(ficha as unknown as Planta),
          slug,
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
      ficha,
      catalogo: noCatalogo ? { slug: noCatalogo.slug, novo: !jaTem } : null,
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

const SISTEMA_HACHIMI = `Você é o Hachimi, o jardineiro do app Mudaí. Fale pt-BR informal e direto, como jardineiro experiente de verdade. REGRAS DURAS: só fale de plantas e luz para plantas; qualquer outro assunto, recuse com jeitinho e redirecione. NUNCA diga "pesquisei online", "como IA", "como modelo" ou similar — afirme como quem sabe de horta. Responda direto ao que foi perguntado, com passo a passo curto quando fizer sentido. Sem listas genéricas, sem elogio vazio, sem introdução.`;

const ChatSchema = z.object({
  mensagem: z.string().min(1).max(2000),
  pets: z.array(z.object({ apelido: z.string(), especie: z.string(), local: z.string() })).default([]),
  historico: z.array(z.object({ role: z.enum(["user", "assistant"]), texto: z.string() })).default([]),
});

app.post("/api/v1/chat", async (req, reply) => {
  const body = ChatSchema.safeParse(req.body);
  if (!body.success) return reply.code(400).send({ code: "INVALIDO", message: "Mensagem inválida." });
  const { mensagem, pets, historico } = body.data;

  const contextoPets = pets.length
    ? `Pets do usuário: ${pets.map((p) => `${p.apelido} (${p.especie}, fica em ${p.local})`).join("; ")}.`
    : "Usuário ainda sem pets.";

  const fichas = catalogo
    .listar()
    .slice(0, 300)
    .map((p) => `${p.nomePopular} (${p.nomeCientifico}) — água a cada ${p.aguaFreqDias[0]}–${p.aguaFreqDias[1]} dias, ${p.tagLuz.toLowerCase()}, ${p.luxMin}–${p.luxMax} lux`)
    .join("\n");

  try {
    const texto = await chamarIAResiliente(
      [
        {
          role: "system",
          content: `${SISTEMA_HACHIMI}\n${contextoPets}\n\nCatálogo que você domina (use quando ajudar, sem citar como lista):\n${fichas}`,
        },
        ...historico.slice(-8).map((h) => ({ role: h.role, content: h.texto })),
        { role: "user", content: mensagem },
      ],
      [AI_CHAT_MODEL, AI_CHAT_FALLBACK],
      false,
      1600
    );
    return { resposta: texto };
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
