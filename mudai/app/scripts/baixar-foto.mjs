/**
 * Baixa uma foto avulsa do Wikimedia (pageimages) para completar o catálogo.
 * Uso: node scripts/baixar-foto.mjs <slug-de-saida> "<Título Wikipédia>" ["<fallback>"]
 */
import { createWriteStream, existsSync, readFileSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(RAIZ, "public", "plantas");
mkdirSync(OUT, { recursive: true });

const [slug, ...titulos] = process.argv.slice(2);
if (!slug || titulos.length === 0) {
  console.error('uso: node scripts/baixar-foto.mjs <slug> "<Título Wikipédia>" ["<fallback>"]');
  process.exit(1);
}

const UA = "MudaiApp/1.0 (plant photo fetch; educational app)";
const MAGIC = [Buffer.from([0xff, 0xd8, 0xff]), Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from("RIFF")];

async function acharImagem(titulo) {
  const fontes = [
    `https://pt.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&redirects=1&pithumbsize=700&origin=*&titles=${encodeURIComponent(titulo)}`,
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&redirects=1&pithumbsize=700&origin=*&titles=${encodeURIComponent(titulo)}`,
  ];
  for (const url of fontes) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) continue;
    const j = await res.json();
    const src = Object.values(j.query?.pages ?? {})
      .map((p) => p.thumbnail?.source)
      .find(Boolean);
    if (src) return src.replace(/\?.*$/, "");
  }
  return null;
}

const destino = join(OUT, `${slug}.jpg`);
if (existsSync(destino)) {
  console.log("já existe:", destino);
  process.exit(0);
}

for (const titulo of titulos) {
  const src = await acharImagem(titulo);
  if (!src) {
    console.log("sem imagem em:", titulo);
    continue;
  }
  const res = await fetch(src, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok || !res.body) {
    console.log("falha no download:", res.status);
    continue;
  }
  const tmp = `${destino}.tmp`;
  await finished(Readable.fromWeb(res.body).pipe(createWriteStream(tmp)));
  const buf = readFileSync(tmp);
  const valido = MAGIC.some((m) => buf.subarray(0, m.length).equals(m)) && buf.length > 6000;
  if (!valido) {
    unlinkSync(tmp);
    console.log("arquivo inválido em:", titulo);
    continue;
  }
  renameSync(tmp, destino);
  console.log("ok:", destino, `(${(buf.length / 1024).toFixed(0)} KB) de "${titulo}"`);
  process.exit(0);
}

console.error("não consegui baixar nenhuma imagem");
process.exit(1);
