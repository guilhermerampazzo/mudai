import Fastify from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
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

const app = Fastify({ logger: true });
await app.register(multipart, {
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024, files: 1 },
});
await app.register(fastifyStatic, { root: STORAGE_DIR, prefix: "/uploads/", decorateReply: false });

app.get("/health", async () => ({ ok: true, ia: Boolean(AI_BASE_URL && AI_API_KEY) }));

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

const identificarCache = new Map<string, z.infer<typeof FichaSchema>>();

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
  const data = (await res.json()) as {
    choices: { message: { content?: string; reasoning?: string } }[];
  };
  const content = data.choices[0]?.message?.content?.trim();
  if (content) return content;
  throw new Error("IA_SEM_CONTENT");
}

async function chamarIAResiliente(messages: unknown[], modelos: string[], json = false, maxTokens = 2000): Promise<string> {
  let ultimo: Error | null = null;
  for (const modelo of modelos) {
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
  const ext = extname(file.filename).toLowerCase();
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
  await pipeline(
    (async function* () { for (const c of chunks) yield c; })(),
    createWriteStream(join(STORAGE_DIR, nome))
  );

  if (identificarCache.has(digest)) {
    return { cache: true, arquivoUrl: `/uploads/${nome}`, ficha: identificarCache.get(digest) };
  }

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
    return { cache: false, arquivoUrl: `/uploads/${nome}`, ficha };
  } catch (err) {
    req.log.warn({ err }, "identificar falhou");
    return reply.code(503).send({
      code: "IA_INDISPONIVEL",
      message: `Não consegui identificar agora: ${(err as Error).message}`,
      arquivoUrl: `/uploads/${nome}`,
    });
  }
});

const ChatSchema = z.object({
  mensagem: z.string().min(1).max(2000),
  pets: z.array(z.object({ apelido: z.string(), especie: z.string(), local: z.string() })).default([]),
  historico: z.array(z.object({ role: z.enum(["user", "assistant"]), texto: z.string() })).default([]),
});

const SISTEMA_HACHIMI = `Você é o Hachimi, o jardineiro do app Mudaí. Fale pt-BR informal e direto, como jardineiro experiente. REGRAS DURAS: só fale de plantas e luz para plantas; outro assunto, recuse com jeitinho e redirecione. NUNCA diga "pesquisei online", "como IA" ou similar — afirme como quem sabe. Cite a planta do usuário quando souber. Sem listas genéricas nem elogio vazio.`;

app.post("/api/v1/chat", async (req, reply) => {
  const body = ChatSchema.safeParse(req.body);
  if (!body.success) return reply.code(400).send({ code: "INVALIDO", message: "Mensagem inválida." });
  const { mensagem, pets, historico } = body.data;
  const contextoPets = pets.length
    ? `Pets do usuário: ${pets.map((p) => `${p.apelido} (${p.especie}, fica em ${p.local})`).join("; ")}.`
    : "Usuário ainda sem pets.";
  try {
    const texto = await chamarIAResiliente(
      [
        { role: "system", content: `${SISTEMA_HACHIMI}\n${contextoPets}` },
        ...historico.slice(-8).map((h) => ({ role: h.role, content: h.texto })),
        { role: "user", content: mensagem },
      ],
      [AI_CHAT_MODEL, AI_CHAT_FALLBACK]
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

app.get("/api/v1/plantas", async () => ({
  aviso: "Catálogo completo vive no app (offline). Este endpoint lista identificações geradas pela IA.",
  identificacoes: [...identificarCache.values()].map((f) => ({ slug: f.slug, nomePopular: f.nomePopular })),
}));

await app.listen({ port: PORT, host: "0.0.0.0" });
