/**
 * Gera o seed do catálogo para o servidor a partir dos dados do app.
 * Uso: node scripts/gerar-seed.mjs
 * Saída: ../server/src/dados/catalogo.seed.json
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "..", "server", "src", "dados", "catalogo.seed.json");

const fonte8 = readFileSync(join(RAIZ, "src", "data", "plantas.ts"), "utf8");
const fonte200 = readFileSync(join(RAIZ, "src", "data", "plantas200.ts"), "utf8");

// As duas fontes são TS; extraio os blocos de objeto com um parser simples
// baseado em avaliação controlada dos literais (sem importar TS).
function extrairObjetos(texto, chaveInicial) {
  const i = texto.indexOf(chaveInicial);
  const igual = texto.indexOf("=", i);
  const abre = texto.indexOf("[", igual);
  let nivel = 0;
  let fim = abre;
  let emTexto = false;
  let aspas = "";
  for (let p = abre; p < texto.length; p++) {
    const c = texto[p];
    const ant = texto[p - 1];
    if (emTexto) {
      if (c === aspas && ant !== "\\") emTexto = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      emTexto = true;
      aspas = c;
      continue;
    }
    if (c === "[" || c === "{") nivel++;
    if (c === "]" || c === "}") {
      nivel--;
      if (nivel === 0) {
        fim = p;
        break;
      }
    }
  }
  return texto.slice(abre, fim + 1);
}

const bruto8 = extrairObjetos(fonte8, "export const PLANTAS");
const bruto200 = extrairObjetos(fonte200, "export const PLANTAS_9_200");

const plantas8 = eval(bruto8);
const plantas200 = eval(bruto200);

function liteParaFicha(l) {
  const aguaMapa = { pouca: 1, moderada: 3, muita: 4 };
  const freqMapa = { pouca: [12, 20], moderada: [5, 8], muita: [2, 4] };
  const luxMapa = {
    sombra: [400, 1500],
    "meia-sombra": [1000, 4000],
    "luz-indireta-brilhante": [2500, 10000],
    "sol-pleno": [15000, 45000],
  };
  const freq = freqMapa[l.agua];
  const [luxMin, luxMax] = luxMapa[l.luz];
  const tagLuz =
    l.luz === "sombra" ? "Sombra" : l.luz === "meia-sombra" ? "Meia-sombra" : l.luz === "sol-pleno" ? "Sol pleno" : "Luz indireta";
  const tags = [l.luz, l.agua === "pouca" ? "pouca-agua" : l.agua === "muita" ? "muita-agua" : "agua-moderada"];
  if (l.dificuldade === 1) tags.push("iniciante");
  if (l.dificuldade === 2) tags.push("intermediario");
  if (l.dificuldade === 3) tags.push("avancado");
  return {
    slug: l.slug,
    nomePopular: l.nome,
    nomeCientifico: l.sci,
    descricao: l.desc,
    foto: `${l.foto}.jpg`,
    aguaNivel: aguaMapa[l.agua],
    aguaFreqDias: freq,
    luxMin,
    luxMax,
    tempMin: 18,
    tempMax: 30,
    umidadeMin: l.agua === "muita" ? 60 : 40,
    umidadeMax: l.agua === "pouca" ? 55 : 80,
    dificuldade: l.dificuldade,
    porte: "Porte médio",
    toxicaPets: false,
    tags,
    tagLuz,
    cuidados: [
      { titulo: "Rega", texto: `Regue a cada ${freq[0]}–${freq[1]} dias, ajustando ao clima.` },
      { titulo: "Luz", texto: `Prefere ${tagLuz.toLowerCase()}. Observe as folhas e ajuste o local.` },
      { titulo: "Rotina", texto: "Adube leve na primavera e limpe as folhas mensalmente." },
    ],
    sinais: {
      feliz: ["Folhas firmes e cor viva", "Brotação regular"],
      estresse: ["Folha amarela: cheque água e luz", "Ponta seca: ar muito seco"],
    },
    curiosidades: [l.desc],
    origem: "seed",
  };
}

const completas = [
  ...plantas8.map((p) => ({ ...p, foto: p.svg, origem: "seed", svg: undefined })),
  ...plantas200.map(liteParaFicha),
];

const limpo = completas.map((p) => {
  const { svg: _svg, ...resto } = p;
  return resto;
});

mkdirSync(dirname(DESTINO), { recursive: true });
writeFileSync(DESTINO, JSON.stringify({ versao: 1, plantas: limpo }, null, 1), "utf8");

console.log("plantas no seed:", limpo.length);
console.log("primeiras:", limpo.slice(0, 3).map((p) => p.slug).join(", "));
console.log("arquivo:", DESTINO);
