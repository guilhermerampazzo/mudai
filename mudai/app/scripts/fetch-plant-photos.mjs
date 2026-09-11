/**
 * Gera public/plantas/*.jpg via Wikimedia API (pageimages), não Special:FilePath.
 * Uso: node scripts/fetch-plant-photos.mjs [--limit N] [--concurrency N]
 * - pula arquivos que já existem (retomável)
 * - valida magic bytes JPEG/PNG/WebP e tamanho mínimo
 * - salva public/plantas/_manifest.json
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "plantas");
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const opt = (k, d) => {
  const a = args.find((x) => x.startsWith(`--${k}=`));
  return a ? Number(a.split("=")[1]) : d;
};
const LIMIT = opt("limit", Infinity);
const CONC = opt("concurrency", 3);
const UA = "MudaiApp/1.0 (plant photo fetch; educational app)";

const QUERIES = JSON.parse(readFileSync(join(ROOT, "scripts", "plant-queries.json"), "utf8"));

const MAGIC = [
  Buffer.from([0xff, 0xd8, 0xff]),
  Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  Buffer.from("RIFF"),
];

async function pageImage(query) {
  const fontes = [
    `https://pt.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&redirects=1&pithumbsize=700&origin=*&titles=${encodeURIComponent(query)}`,
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&redirects=1&pithumbsize=700&origin=*&titles=${encodeURIComponent(query)}`,
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=700&origin=*&titles=${encodeURIComponent(query)}`,
  ];
  let ultimo = "sem fonte";
  for (const url of fontes) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) { ultimo = `${new URL(url).host}: HTTP ${res.status}`; continue; }
      const j = await res.json();
      const pages = Object.values(j.query?.pages ?? {});
      const src = pages.map((p) => p.thumbnail?.source).find(Boolean);
      if (!src) { ultimo = `${new URL(url).host}: sem imagem`; continue; }
      return src.replace(/\?.*$/, "");
    } catch (e) {
      ultimo = `${new URL(url).host}: ${e.message}`;
    }
  }
  throw new Error(ultimo);
}

async function baixar(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const tmp = `${dest}.tmp`;
  await finished(Readable.fromWeb(res.body).pipe(createWriteStream(tmp)));
  const buf = readFileSync(tmp);
  const ok = MAGIC.some((m) => buf.subarray(0, m.length).equals(m));
  if (!ok || buf.length < 6000) {
    try { unlinkSync(tmp); } catch {}
    throw new Error("conteúdo inválido");
  }
  renameSync(tmp, dest);
  return buf.length;
}

async function fetchOne(slug, queries) {
  const dest = join(OUT, `${slug}.jpg`);
  if (existsSync(dest)) return { slug, status: "existe" };
  let ultimo = "sem tentativa";
  for (const q of queries) {
    for (let t = 0; t < 2; t++) {
      try {
        const src = await pageImage(q);
        const bytes = await baixar(src, dest);
        return { slug, status: "ok", bytes };
      } catch (e) {
        ultimo = `${q}: ${e.message}`;
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return { slug, status: `falha: ${ultimo}` };
}

const queue = QUERIES.slice(0, LIMIT === Infinity ? undefined : LIMIT);
let ok = 0, existe = 0, falha = 0;
const falhas = [];
for (let i = 0; i < queue.length; i += CONC) {
  const lote = queue.slice(i, i + CONC);
  const res = await Promise.all(lote.map(([s, qs]) => fetchOne(s, qs)));
  for (const r of res) {
    if (r.status === "ok") ok++;
    else if (r.status === "existe") existe++;
    else { falha++; falhas.push(`${r.slug}: ${r.status}`); }
  }
  console.log(`[${Math.min(i + CONC, queue.length)}/${queue.length}] ok=${ok} existe=${existe} falha=${falha}`);
  await new Promise((r) => setTimeout(r, 500));
}
writeFileSync(join(OUT, "_manifest.json"), JSON.stringify({ total: queue.length, ok, existe, falha, falhas }, null, 2));
console.log(`FIM ok=${ok} existe=${existe} falha=${falha}`);
if (falhas.length) console.log(falhas.join("\n"));
